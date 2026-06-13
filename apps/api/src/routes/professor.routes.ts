/**
 * src/routes/professor.routes.ts — Professor panel endpoints.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';
import { Role } from '@unify/shared-types';

export const professorRouter = Router();
professorRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.PROFESSOR]));

// Professor dashboard — own specifications for current semester
professorRouter.get(
  '/specifications',
  asyncHandler(async (req, res) => {
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) {
      res.json({ success: true, data: { specifications: [] }, requestId: req.requestId });
      return;
    }
    const specs = await prisma.courseSpecification.findMany({
      where: { professorId: req.user!.userId, semesterId: semester.id },
      include: {
        course: true,
        enrollments: { where: { isTemporary: false }, include: { student: { select: { id: true, username: true, firstName: true, lastName: true } } } },
      },
    });
    res.json({
      success: true,
      data: {
        specifications: specs.map((s) => ({
          id: s.id,
          course: { id: s.courseId, code: s.course.code, name: s.course.name, credits: s.course.credits },
          classDays: s.classDays,
          classStartTime: s.classStartTime,
          classEndTime: s.classEndTime,
          classroomLocation: s.classroomLocation,
          finalExamDate: s.finalExamDate,
          finalExamTime: s.finalExamTime,
          enrolledStudents: s.enrollments.map((e) => ({
            id: e.student.id,
            username: e.student.username,
            fullName: [e.student.firstName, e.student.lastName].filter(Boolean).join(' '),
          })),
        })),
      },
      requestId: req.requestId,
    });
  }),
);

// Files uploaded by this professor (feedback view)
professorRouter.get(
  '/files',
  asyncHandler(async (req, res) => {
    const files = await prisma.resourceFile.findMany({
      where: { uploadedById: req.user!.userId },
      include: { course: { select: { code: true, name: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({
      success: true,
      data: {
        files: files.map((f) => ({
          id: f.id,
          title: f.title,
          courseCode: f.course.code,
          courseName: f.course.name,
          versionNumber: f.versionNumber,
          averageRating: f.averageRating,
          ratingCount: f.ratingCount,
          approvalStatus: f.approvalStatus,
          badgeType: f.badgeType,
          createdAt: toShamsi(f.createdAt),
        })),
      },
      requestId: req.requestId,
    });
  }),
);
