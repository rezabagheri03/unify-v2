/**
 * src/routes/assignment.routes.ts — Personal assignment/quiz tracker.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { fromShamsi } from '../utils/shamsi';
import { addReminderJob } from '../jobs/job-runner';
import { AuthForbidden, NotFound, BadRequest } from '../utils/errors';

export const assignmentRouter = Router();
assignmentRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.STUDENT]));

const taskSchema = z.object({
  title: z.string().min(2).max(200),
  taskType: z.enum(['ASSIGNMENT', 'QUIZ', 'OTHER']),
  // Golden Doc §2.6.4: Course (optional) - null for general assignments
  courseId: z.string().uuid().optional().nullable(),
  courseNote: z.string().max(500).optional().nullable(),
  dueDateShamsi: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  reminderEnabled: z.boolean().optional().default(false),
});

assignmentRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const tasks = await prisma.assignmentTask.findMany({
      where: { studentId: req.user!.userId },
      include: { course: { select: { id: true, code: true, name: true } } },
      orderBy: { dueDateUtc: 'asc' },
    });
    res.json({
      success: true,
      data: {
        tasks: tasks.map((t) => ({
          id: t.id,
          title: t.title,
          taskType: t.taskType,
          courseId: t.courseId,
          course: t.course ? { id: t.course.id, code: t.course.code, name: t.course.name } : null,
          courseNote: t.courseNote,
          dueDateShamsi: t.dueDateShamsi,
          dueDateUtc: t.dueDateUtc.toISOString(),
          reminderEnabled: t.reminderEnabled,
          reminderSent: t.reminderSent,
          createdAt: t.createdAt.toISOString(),
        })),
      },
      requestId: req.requestId,
    });
  }),
);
      where: { studentId: req.user!.userId },
      orderBy: { dueDateUtc: 'asc' },
    });
    res.json({ success: true, data: { tasks }, requestId: req.requestId });
  }),
);

assignmentRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = taskSchema.parse(req.body);
    const due = fromShamsi(data.dueDateShamsi);

    // If courseId provided, verify student is enrolled in that course
    if (data.courseId) {
      const enrolled = await prisma.enrollment.findFirst({
        where: {
          studentId: req.user!.userId,
          isTemporary: false,
          specification: { courseId: data.courseId },
        },
      });
      if (!enrolled) {
        // Allow but warn — student may be tracking assignment before enrollment finalizes
        // Don't block — many universities track all coursework
      }
    }

    const task = await prisma.assignmentTask.create({
      data: {
        studentId: req.user!.userId,
        title: data.title,
        taskType: data.taskType,
        courseId: data.courseId || null,
        courseNote: data.courseNote || null,
        dueDateShamsi: data.dueDateShamsi,
        dueDateUtc: due,
        reminderEnabled: data.reminderEnabled,
      },
    });
    if (data.reminderEnabled) {
      await addReminderJob(task.id, due);
    }
    res.json({ success: true, data: { taskId: task.id }, requestId: req.requestId });
  }),
);

assignmentRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const task = await prisma.assignmentTask.findFirst({ where: { id: req.params.id, studentId: req.user!.userId } });
    if (!task) throw NotFound('وظیفه');
    await prisma.assignmentTask.delete({ where: { id: task.id } });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);

assignmentRouter.patch(
  '/:id/toggle-reminder',
  asyncHandler(async (req, res) => {
    const task = await prisma.assignmentTask.findFirst({ where: { id: req.params.id, studentId: req.user!.userId } });
    if (!task) throw NotFound('وظیفه');
    const updated = await prisma.assignmentTask.update({
      where: { id: task.id },
      data: { reminderEnabled: !task.reminderEnabled },
    });
    if (updated.reminderEnabled) {
      await addReminderJob(updated.id, updated.dueDateUtc);
    }
    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
