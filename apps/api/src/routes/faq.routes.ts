/**
 * src/routes/faq.routes.ts
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { AuthForbidden, NotFound } from '../utils/errors';

export const faqRouter = Router();
faqRouter.use(authenticateToken, requireOnboardingComplete);

const faqSchema = z.object({
  courseId: z.string().uuid(),
  question: z.string().min(2).max(500),
  answer: z.string().min(2).max(5000),
});

faqRouter.get(
  '/:courseId',
  asyncHandler(async (req, res) => {
    const faqs = await prisma.courseFAQ.findMany({
      where: { courseId: req.params.courseId },
      orderBy: { createdAt: 'asc' },
    });
    res.json({ success: true, data: { faqs }, requestId: req.requestId });
  }),
);

faqRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.PROFESSOR) throw AuthForbidden();
    const data = faqSchema.parse(req.body);
    const faq = await prisma.courseFAQ.create({
      data: { ...data, professorId: req.user!.userId },
    });
    res.json({ success: true, data: { faqId: faq.id }, requestId: req.requestId });
  }),
);

faqRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const faq = await prisma.courseFAQ.findUnique({ where: { id: req.params.id } });
    if (!faq) throw NotFound();
    if (faq.professorId !== req.user!.userId) throw AuthForbidden();
    await prisma.courseFAQ.delete({ where: { id: faq.id } });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);

// Golden Doc §3.2.6: Edit FAQ entries
faqRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const faq = await prisma.courseFAQ.findUnique({ where: { id: req.params.id } });
    if (!faq) throw NotFound();
    if (faq.professorId !== req.user!.userId) throw AuthForbidden();
    const data = faqSchema.partial().parse(req.body);
    const updated = await prisma.courseFAQ.update({ where: { id: faq.id }, data });
    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
