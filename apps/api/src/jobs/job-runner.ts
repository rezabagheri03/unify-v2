/**
 * src/jobs/job-runner.ts — BullMQ job queue manager.
 * Agent Guide §6.6: 4 queues: ticket-escalation, grace-period-wipe,
 * reminder-notifications, cleanup-cancelled-notices.
 */

import { Queue, Worker, Job } from 'bullmq';
import IORedis from 'ioredis';
import { config } from '../config';
import { logger } from '../utils/logger';
import { prisma } from '../prisma/prisma.client';
import { ticketService } from '../services/ticket.service';
import { notificationService } from '../services/notification.service';
import { NotificationType } from '@unify/shared-types';
import { toShamsiDateTime } from '../utils/shamsi';

const connection = new IORedis(config.redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: false,
});

export const ticketEscalationQueue = new Queue('ticket-escalation', { connection });
export const gracePeriodQueue = new Queue('grace-period-wipe', { connection });
export const reminderQueue = new Queue('reminder-notifications', { connection });
export const cleanupQueue = new Queue('cleanup-cancelled-notices', { connection });

let workers: Worker[] = [];

export async function startJobWorkers(): Promise<void> {
  // ── Queue 1: ticket-escalation (48h) ────────────────────────────────────
  workers.push(new Worker('ticket-escalation', async (job: Job) => {
    const ticketId = job.data.ticketId as string;
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) return;
    if (ticket.status === 'CLOSED' || ticket.isEscalated) return;
    if (ticket.status === 'ANSWERED') return; // staff already replied
    await ticketService.escalate(ticketId);
    logger.info({ ticketId }, 'Ticket escalated after 48h');
  }, { connection }));

  // ── Queue 2: grace-period-wipe (24h after ACTIVE phase switch) ───────────
  workers.push(new Worker('grace-period-wipe', async (_job: Job) => {
    const result = await prisma.enrollment.deleteMany({
      where: { isTemporary: true },
    });
    logger.info({ count: result.count }, 'Grace period wipe complete');

    // Notify affected students
    // We can't get the deleted IDs from deleteMany, so query then delete
    const temp = await prisma.enrollment.findMany({
      where: { isTemporary: true },
      include: { student: true, specification: { include: { course: true } } },
    });
    if (temp.length > 0) {
      // Group by student
      const byStudent = new Map<string, typeof temp>();
      for (const e of temp) {
        const list = byStudent.get(e.studentId) || [];
        list.push(e);
        byStudent.set(e.studentId, list);
      }
      for (const [studentId] of byStudent) {
        await notificationService.send({
          type: NotificationType.CRITICAL_ALERT,
          title: 'مهلت ثبت‌نام به پایان رسید',
          body: 'برنامه درسی شما خالی است. لطفاً با کارشناس گروه خود تماس بگیرید.',
          recipientIds: [studentId],
          bypassMute: true,
        });
      }
    }
  }, { connection }));

  // ── Queue 3: reminder-notifications ─────────────────────────────────────
  workers.push(new Worker('reminder-notifications', async (job: Job) => {
    const taskId = job.data.taskId as string;
    const task = await prisma.assignmentTask.findUnique({ where: { id: taskId } });
    if (!task || task.reminderSent) return;
    await notificationService.send({
      type: NotificationType.REMINDER,
      title: 'یادآور وظیفه',
      body: `${task.title} - سررسید: ${task.dueDateShamsi}`,
      recipientIds: [task.studentId],
      data: { taskId },
    });
    await prisma.assignmentTask.update({
      where: { id: taskId },
      data: { reminderSent: true },
    });
  }, { connection }));

  // ── Queue 4: cleanup-cancelled-notices (daily 03:00 Tehran time) ──────────
  // Agent Guide Decision 5 / Decision 12: hard-delete notices older than 7 days
  workers.push(new Worker('cleanup-cancelled-notices', async (_job: Job) => {
    const now = new Date();
    const result = await prisma.cancelledSpecificationNotice.deleteMany({
      where: { expiresAt: { lt: now } },
    });
    logger.info({ deleted: result.count }, 'Cancelled-notice cleanup complete');
  }, { connection }));

  // Schedule daily cleanup at 03:00 Tehran
  await cleanupQueue.add(
    'daily-cleanup',
    {},
    { repeat: { pattern: '0 3 * * *', tz: 'Asia/Tehran' } },
  );

  logger.info('All BullMQ workers started');
}

// ── Job enqueue helpers ────────────────────────────────────────────────────
export async function addTicketEscalationJob(ticketId: string): Promise<void> {
  await ticketEscalationQueue.add(
    `escalate-${ticketId}`,
    { ticketId },
    { delay: config.ticket.escalationHours * 60 * 60 * 1000, jobId: `ticket-escalation-${ticketId}` },
  );
}

export async function cancelTicketEscalationJob(ticketId: string): Promise<void> {
  const job = await ticketEscalationQueue.getJob(`ticket-escalation-${ticketId}`);
  if (job) await job.remove();
}

export async function addGracePeriodJob(): Promise<void> {
  await gracePeriodQueue.add(
    'grace-period-wipe',
    {},
    { delay: config.ticket.gracePeriodHours * 60 * 60 * 1000 },
  );
}

export async function addReminderJob(taskId: string, dueDate: Date): Promise<void> {
  const reminderTime = new Date(dueDate.getTime() - 24 * 60 * 60 * 1000); // 24h before
  const delay = reminderTime.getTime() - Date.now();
  if (delay <= 0) return; // Too late, skip
  await reminderQueue.add(
    `reminder-${taskId}`,
    { taskId },
    { delay, jobId: `reminder-${taskId}` },
  );
}

export async function stopJobWorkers(): Promise<void> {
  await Promise.all(workers.map(async (w) => await w.close()));
  await ticketEscalationQueue.close();
  await gracePeriodQueue.close();
  await reminderQueue.close();
  await cleanupQueue.close();
  await connection.quit();
}
