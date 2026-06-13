/**
 * src/routes/scheduler.routes.ts — Student scheduler endpoints.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { schedulerService } from '../services/scheduler.service';
import { z } from 'zod';
import { Role } from '@unify/shared-types';

export const schedulerRouter = Router();
schedulerRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.STUDENT]));

const addSchema = z.object({
  specificationId: z.string().uuid(),
  confirmConflict: z.boolean().optional(),
});

schedulerRouter.get(
  '/state',
  asyncHandler(async (req, res) => {
    const data = await schedulerService.getCurrentState(req.user!.userId);
    res.json({ success: true, data, requestId: req.requestId });
  }),
);

schedulerRouter.get(
  '/search',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || '';
    const semesterId = req.query.semesterId as string | undefined;
    const specs = await schedulerService.searchSpecifications(req.user!.userId, q, semesterId);
    res.json({ success: true, data: { courses: specs }, requestId: req.requestId });
  }),
);

schedulerRouter.post(
  '/temp-add',
  asyncHandler(async (req, res) => {
    const { specificationId, confirmConflict } = addSchema.parse(req.body);
    const result = await schedulerService.addToTempList(req.user!.userId, specificationId, confirmConflict);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

schedulerRouter.delete(
  '/temp-remove/:specificationId',
  asyncHandler(async (req, res) => {
    await schedulerService.removeFromTempList(req.user!.userId, req.params.specificationId);
    res.json({ success: true, data: { message: 'از لیست موقت حذف شد' }, requestId: req.requestId });
  }),
);

schedulerRouter.post(
  '/submit',
  asyncHandler(async (req, res) => {
    const result = await schedulerService.submitFinalList(req.user!.userId);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

const goldenSchema = z.object({
  remainingCourseIds: z.array(z.string().uuid()).min(1).max(30),
  academicStatus: z.enum(['NORMAL', 'CONDITIONAL', 'GPA_A', 'FINAL_SEMESTER']).optional(),
});

schedulerRouter.post(
  '/golden-schedule',
  asyncHandler(async (req, res) => {
    const { remainingCourseIds, academicStatus } = goldenSchema.parse(req.body);
    const result = await schedulerService.generateGoldenSchedule(
      req.user!.userId,
      remainingCourseIds,
      (academicStatus as AcademicStatus | undefined) ?? AcademicStatus.NORMAL,
    );
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

schedulerRouter.get(
  '/exam-schedule',
  asyncHandler(async (req, res) => {
    const exams = await schedulerService.getExamSchedule(req.user!.userId);
    res.json({ success: true, data: { exams }, requestId: req.requestId });
  }),
);

const colorSchema = z.object({
  enrollmentId: z.string().uuid(),
  cardColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/),
});

schedulerRouter.patch(
  '/card-color',
  asyncHandler(async (req, res) => {
    const { enrollmentId, cardColor } = colorSchema.parse(req.body);
    const enrollment = await (await import('../prisma/prisma.client')).prisma.enrollment.findFirst({
      where: { id: enrollmentId, studentId: req.user!.userId },
    });
    if (!enrollment) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'یافت نشد' }, requestId: req.requestId });
      return;
    }
    await (await import('../prisma/prisma.client')).prisma.enrollment.update({
      where: { id: enrollmentId },
      data: { cardColor },
    });
    res.json({ success: true, data: { message: 'رنگ کارت به‌روزرسانی شد' }, requestId: req.requestId });
  }),
);
