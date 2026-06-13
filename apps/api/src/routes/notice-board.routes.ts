/**
 * src/routes/notice-board.routes.ts
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { AuthForbidden, NotFound } from '../utils/errors';

export const noticeBoardRouter = Router();
noticeBoardRouter.use(authenticateToken, requireOnboardingComplete);

const noticeSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).max(200),
  content: z.string().min(2).max(5000),
});

noticeBoardRouter.get(
  '/:courseId',
  asyncHandler(async (req, res) => {
    const notices = await prisma.noticeBoard.findMany({
      where: { courseId: req.params.courseId },
      include: { professor: { select: { firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { notices }, requestId: req.requestId });
  }),
);

noticeBoardRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.PROFESSOR) throw AuthForbidden();
    const data = noticeSchema.parse(req.body);
    const notice = await prisma.noticeBoard.create({
      data: { ...data, professorId: req.user!.userId },
    });
    res.json({ success: true, data: { noticeId: notice.id }, requestId: req.requestId });
  }),
);

noticeBoardRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const notice = await prisma.noticeBoard.findUnique({ where: { id: req.params.id } });
    if (!notice) throw NotFound();
    if (notice.professorId !== req.user!.userId) throw AuthForbidden();
    await prisma.noticeBoard.delete({ where: { id: notice.id } });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);

// Golden Doc §3.2.6: Edit notices
noticeBoardRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const notice = await prisma.noticeBoard.findUnique({ where: { id: req.params.id } });
    if (!notice) throw NotFound();
    if (notice.professorId !== req.user!.userId) throw AuthForbidden();
    const data = noticeSchema.partial().parse(req.body);
    const updated = await prisma.noticeBoard.update({ where: { id: notice.id }, data });
    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
