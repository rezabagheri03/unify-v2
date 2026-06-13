/**
 * src/routes/syllabus.routes.ts — Course syllabus endpoints.
 * Pulls: course spec + notice board + FAQ + assignments by course.
 * Used by the student dashboard "Details" modal.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';
import { NotFound } from '@unify/shared-types';

export const syllabusRouter = Router();
syllabusRouter.use(authenticateToken, requireOnboardingComplete);

syllabusRouter.get(
  '/specification/:specificationId',
  asyncHandler(async (req, res) => {
    const spec = await prisma.courseSpecification.findUnique({
      where: { id: req.params.specificationId },
      include: { course: true, professor: { select: { firstName: true, lastName: true } } },
    });
    if (!spec) throw NotFound('گروه درسی');

    const notices = await prisma.noticeBoard.findMany({
      where: { courseId: spec.courseId, professorId: spec.professorId },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    const faqs = await prisma.courseFAQ.findMany({
      where: { courseId: spec.courseId, professorId: spec.professorId },
      orderBy: { createdAt: 'asc' },
    });

    res.json({
      success: true,
      data: {
        specification: {
          id: spec.id,
          courseName: spec.course.name,
          courseCode: spec.course.code,
          credits: spec.course.credits,
          professorName: [spec.professor.firstName, spec.professor.lastName].filter(Boolean).join(' ') || 'نامشخص',
          classDays: spec.classDays,
          classStartTime: spec.classStartTime,
          classEndTime: spec.classEndTime,
          classroomLocation: spec.classroomLocation,
          telegramLink: spec.telegramLink,
          finalExamDate: spec.finalExamDate ? toShamsi(spec.finalExamDate) : null,
          finalExamTime: spec.finalExamTime,
          finalExamLocation: spec.finalExamLocation,
          midtermExamDate: spec.midtermExamDate ? toShamsi(spec.midtermExamDate) : null,
          midtermExamTime: spec.midtermExamTime,
          midtermExamLocation: spec.midtermExamLocation,
        },
        notices: notices.map((n) => ({
          id: n.id,
          title: n.title,
          content: n.content,
          createdAt: toShamsi(n.createdAt),
        })),
        faqs: faqs.map((f) => ({
          id: f.id,
          question: f.question,
          answer: f.answer,
          createdAt: toShamsi(f.createdAt),
        })),
      },
      requestId: req.requestId,
    });
  }),
);
