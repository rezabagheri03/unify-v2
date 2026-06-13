/**
 * src/services/ticket.service.ts — Ticketing system.
 */

import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';
import { TicketDepartment, TicketStatus, Role, NotificationType, NotFound, AuthForbidden, BadRequest } from '@unify/shared-types';
import { auditService } from './audit.service';
import { AuditActionType } from '@unify/shared-types';
import { notificationService } from './notification.service';
import { addTicketEscalationJob, cancelTicketEscalationJob } from '../jobs/job-runner';

export const ticketService = {
  async createTicket(
    studentId: string,
    department: TicketDepartment,
    content: string,
    imageUrls: string[],
  ) {
    const ticket = await prisma.ticket.create({
      data: {
        studentId,
        department,
        content,
        imageUrls,
        status: TicketStatus.OPEN,
      },
    });

    // Schedule escalation in 48 hours
    await addTicketEscalationJob(ticket.id);

    // Notify the appropriate staff
    await this.notifyDepartmentStaff(ticket);

    await auditService.log({
      actorId: studentId,
      actorRole: Role.STUDENT,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'Ticket',
      targetEntityId: ticket.id,
      context: { department },
    });

    return ticket;
  },

  async notifyDepartmentStaff(ticket: Awaited<ReturnType<typeof prisma.ticket.create>>) {
    let recipients: string[];
    if (ticket.department === TicketDepartment.TECHNICAL) {
      // Technical tickets skip Expert (Agent Guide DECISION 9) — notify admin directly
      recipients = (await prisma.user.findMany({
        where: { role: Role.SYSTEM_ADMIN, isActive: true },
        select: { id: true },
      })).map((u) => u.id);
    } else {
      // Education / Student Affairs → notify all Experts & Head of depts
      recipients = (await prisma.user.findMany({
        where: { role: { in: [Role.EXPERT, Role.HEAD_OF_DEPARTMENT] }, isActive: true },
        select: { id: true },
      })).map((u) => u.id);
    }
    if (recipients.length === 0) return;
    await notificationService.send({
      type: NotificationType.INFO,
      title: 'تیکت جدید',
      body: `تیکت جدید در بخش ${ticket.department}`,
      recipientIds: recipients,
      data: { ticketId: ticket.id, department: ticket.department },
    });
  },

  async listForUser(userId: string, role: Role, departmentId: string | null, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    if (role === Role.STUDENT) {
      const [items, total] = await Promise.all([
        prisma.ticket.findMany({
          where: { studentId: userId },
          include: {
            student: { select: { firstName: true, lastName: true, username: true } },
            replies: { include: { sender: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.ticket.count({ where: { studentId: userId } }),
      ]);
      return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
    }
    const where: Record<string, unknown> = {};
    if (role === Role.EXPERT || role === Role.HEAD_OF_DEPARTMENT) {
      if (ticketDepartmentMatchesExpert(departmentId, 'X')) {
        // Build dynamic OR
        where.OR = [
          { department: TicketDepartment.EDUCATION, isEscalated: false },
          { department: TicketDepartment.STUDENT_AFFAIRS, isEscalated: false },
        ];
      }
    } else if (role === Role.SYSTEM_ADMIN) {
      // Admin sees escalated + technical
      where.OR = [
        { isEscalated: true },
        { department: TicketDepartment.TECHNICAL },
      ];
    }
    const [items, total] = await Promise.all([
      prisma.ticket.findMany({
        where,
        include: {
          student: { select: { firstName: true, lastName: true, username: true } },
          replies: { include: { sender: { select: { firstName: true, lastName: true, role: true } } }, orderBy: { createdAt: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      }),
      prisma.ticket.count({ where }),
    ]);
    return { items, pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
  },

  async reply(ticketId: string, senderId: string, senderRole: Role, content: string, attachmentUrl: string | null) {
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw NotFound('تیکت');
    if (ticket.status === TicketStatus.CLOSED) throw BadRequest('تیکت بسته شده است');

    await prisma.ticketReply.create({
      data: { ticketId, senderId, content, attachmentUrl },
    });

    // Status logic
    let newStatus = ticket.status;
    if (senderRole === Role.STUDENT) {
      // Student reply → OPEN
      newStatus = TicketStatus.OPEN;
    } else if (senderRole === Role.EXPERT || senderRole === Role.HEAD_OF_DEPARTMENT || senderRole === Role.SYSTEM_ADMIN) {
      newStatus = TicketStatus.ANSWERED;
      // Cancel escalation job (since staff replied)
      await cancelTicketEscalationJob(ticketId);
      // If escalated, mark as not escalated
      if (ticket.isEscalated) {
        await prisma.ticket.update({ where: { id: ticketId }, data: { isEscalated: false } });
      }
    }

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: newStatus },
    });

    // Notify the other party
    if (senderRole === Role.STUDENT) {
      // Notify staff (Expert/Admin who can handle this)
      await this.notifyDepartmentStaff({ ...ticket, status: newStatus });
    } else {
      // Notify the student
      await notificationService.send({
        type: NotificationType.INFO,
        title: 'پاسخ به تیکت شما',
        body: content.substring(0, 100),
        recipientIds: [ticket.studentId],
        data: { ticketId },
      });
    }

    return { newStatus };
  },

  async closeTicket(actorId: string, role: Role, ticketId: string, reason?: string) {
    if (![Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(role)) {
      throw AuthForbidden('فقط کارشناس یا مدیر می‌تواند تیکت را ببندد');
    }
    const ticket = await prisma.ticket.findUnique({ where: { id: ticketId } });
    if (!ticket) throw NotFound('تیکت');
    if (ticket.status === TicketStatus.CLOSED) throw BadRequest('تیکت قبلاً بسته شده است');

    await prisma.ticket.update({
      where: { id: ticketId },
      data: { status: TicketStatus.CLOSED },
    });
    await cancelTicketEscalationJob(ticketId);

    await auditService.log({
      actorId,
      actorRole: role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'Ticket',
      targetEntityId: ticketId,
      context: { action: 'CLOSE', reason },
    });

    await notificationService.send({
      type: NotificationType.INFO,
      title: 'تیکت شما بسته شد',
      body: reason || 'تیکت شما توسط کارشناس بسته شد',
      recipientIds: [ticket.studentId],
      data: { ticketId },
    });
  },

  async escalate(ticketId: string) {
    await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        isEscalated: true,
        escalatedAt: new Date(),
      },
    });
    // Notify system admins
    const admins = await prisma.user.findMany({
      where: { role: Role.SYSTEM_ADMIN, isActive: true },
      select: { id: true },
    });
    await notificationService.send({
      type: NotificationType.CRITICAL_ALERT,
      title: 'تیکت به شما ارجاع شد',
      body: 'تیکتی پس از ۴۸ ساعت پاسخ داده نشده است',
      recipientIds: admins.map((a) => a.id),
      data: { ticketId },
      bypassMute: true,
    });
  },
};

function ticketDepartmentMatchesExpert(departmentId: string | null, _unused: string): boolean {
  return !!departmentId;
}
