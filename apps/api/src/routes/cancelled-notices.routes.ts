/**
 * src/routes/cancelled-notices.routes.ts — Active cancelled-spec notices
 * for the current student (Agent Guide Decision 5).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { Role } from '@unify/shared-types';
import { toShamsi } from '../utils/shamsi';

export const cancelledNoticesRouter = Router();
cancelledNoticesRouter.use(
  authenticateToken,
  requireOnboardingComplete,
  requireRole([Role.STUDENT]),
);

cancelledNoticesRouter.get(
  '/me/active',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const notices = await prisma.cancelledSpecificationNotice.findMany({
      where: {
        studentId: req.user!.userId,
        expiresAt: { gt: now },
      },
      orderBy: { deletedAt: 'desc' },
    });

    res.json({
      success: true,
      data: {
        notices: notices.map((n) => ({
          id: n.id,
          courseCode: n.courseCode,
          courseName: n.courseName,
          professorName: n.professorName,
          semesterName: n.semesterName,
          credits: n.credits,
          deletedAtShamsi: toShamsi(n.deletedAt),
          expiresAtShamsi: toShamsi(n.expiresAt),
          daysRemaining: Math.max(0, Math.ceil((n.expiresAt.getTime() - now.getTime()) / (24 * 60 * 60 * 1000))),
        })),
      },
      requestId: req.requestId,
    });
  }),
);

cancelledNoticesRouter.delete(
  '/:id/dismiss',
  asyncHandler(async (req, res) => {
    const notice = await prisma.cancelledSpecificationNotice.findFirst({
      where: { id: req.params.id, studentId: req.user!.userId },
    });
    if (!notice) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'یافت نشد' }, requestId: req.requestId });
      return;
    }
    await prisma.cancelledSpecificationNotice.delete({ where: { id: notice.id } });
    res.json({ success: true, data: { message: 'پیام حذف شد' }, requestId: req.requestId });
  }),
);
