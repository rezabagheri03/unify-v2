/**
 * src/routes/expert.routes.ts — Department Expert panel.
 * All operations scoped to expert's own department.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole, requireDepartmentAccess } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { fromShamsi, toShamsi } from '../utils/shamsi';
import { z } from 'zod';
import { Role, NotificationType, AuthForbidden, BadRequest, NotFound } from '@unify/shared-types';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';
import { notificationService } from '../services/notification.service';
import { systemStateHelpers } from './system-state.routes';
import { detectSpecConflicts, notifyConflicts } from '../services/conflict-detector.service';

export const expertRouter = Router();
expertRouter.use(
  authenticateToken,
  requireOnboardingComplete,
  requireRole([Role.EXPERT, Role.HEAD_OF_DEPARTMENT]),
);

// ── Course CRUD ───────────────────────────────────────────────────────────
const courseSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(150),
  credits: z.number().int().min(0).max(10),
});

expertRouter.post(
  '/courses',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden('شما به گروهی تخصیص ندارید');
    const data = courseSchema.parse(req.body);
    const course = await prisma.course.create({
      data: { ...data, departmentId: req.user!.departmentId },
    });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'Course',
      targetEntityId: course.id,
      afterState: { code: data.code, name: data.name },
    });
    res.json({ success: true, data: { courseId: course.id }, requestId: req.requestId });
  }),
);

expertRouter.get(
  '/courses',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) {
      res.json({ success: true, data: { courses: [] }, requestId: req.requestId });
      return;
    }
    const courses = await prisma.course.findMany({
      where: { departmentId: req.user!.departmentId },
      orderBy: { code: 'asc' },
    });
    res.json({ success: true, data: { courses }, requestId: req.requestId });
  }),
);

// ── Specification CRUD ────────────────────────────────────────────────────
const specSchema = z.object({
  courseId: z.string().uuid(),
  professorId: z.string().uuid(),
  classDays: z.array(z.enum(['SATURDAY', 'SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY'])).min(1),
  classStartTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  classEndTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  classroomLocation: z.string().min(1).max(200),
  telegramLink: z.string().url().optional().nullable(),
  finalExamDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/).optional().nullable(),
  finalExamTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  finalExamLocation: z.string().max(200).optional().nullable(),
  midtermExamDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/).optional().nullable(),
  midtermExamTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/).optional().nullable(),
  midtermExamLocation: z.string().max(200).optional().nullable(),
});

expertRouter.post(
  '/specifications',
  asyncHandler(async (req, res) => {
    const data = specSchema.parse(req.body);
    // Verify course belongs to this department
    const course = await prisma.course.findUnique({ where: { id: data.courseId } });
    if (!course) throw NotFound('درس');
    if (course.departmentId !== req.user!.departmentId) throw AuthForbidden('این درس متعلق به گروه شما نیست');

    const semesterId = await systemStateHelpers.getCurrentSemesterId();
    if (!semesterId) throw BadRequest('نیم‌سال جاری تعریف نشده است');

    const spec = await prisma.courseSpecification.create({
      data: {
        courseId: data.courseId,
        professorId: data.professorId,
        semesterId,
        classDays: data.classDays,
        classStartTime: data.classStartTime,
        classEndTime: data.classEndTime,
        classroomLocation: data.classroomLocation,
        telegramLink: data.telegramLink,
        finalExamDate: data.finalExamDate ? fromShamsi(data.finalExamDate) : null,
        finalExamTime: data.finalExamTime,
        finalExamLocation: data.finalExamLocation,
        midtermExamDate: data.midtermExamDate ? fromShamsi(data.midtermExamDate) : null,
        midtermExamTime: data.midtermExamTime,
        midtermExamLocation: data.midtermExamLocation,
      },
    });
    res.json({ success: true, data: { specificationId: spec.id }, requestId: req.requestId });
  }),
);

expertRouter.patch(
  '/specifications/:id',
  asyncHandler(async (req, res) => {
    const data = specSchema.partial().parse(req.body);
    const existing = await prisma.courseSpecification.findUnique({
      where: { id: req.params.id },
      include: { course: true },
    });
    if (!existing) throw NotFound('گروه درسی');
    if (existing.course.departmentId !== req.user!.departmentId) throw AuthForbidden();

    const updated = await prisma.courseSpecification.update({
      where: { id: req.params.id },
      data: {
        classDays: data.classDays ?? existing.classDays,
        classStartTime: data.classStartTime ?? existing.classStartTime,
        classEndTime: data.classEndTime ?? existing.classEndTime,
        classroomLocation: data.classroomLocation ?? existing.classroomLocation,
        telegramLink: data.telegramLink !== undefined ? data.telegramLink : existing.telegramLink,
        finalExamDate: data.finalExamDate ? fromShamsi(data.finalExamDate) : existing.finalExamDate,
        finalExamTime: data.finalExamTime !== undefined ? data.finalExamTime : existing.finalExamTime,
        finalExamLocation: data.finalExamLocation !== undefined ? data.finalExamLocation : existing.finalExamLocation,
        midtermExamDate: data.midtermExamDate ? fromShamsi(data.midtermExamDate) : existing.midtermExamDate,
        midtermExamTime: data.midtermExamTime !== undefined ? data.midtermExamTime : existing.midtermExamTime,
        midtermExamLocation: data.midtermExamLocation !== undefined ? data.midtermExamLocation : existing.midtermExamLocation,
      },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'CourseSpecification',
      targetEntityId: updated.id,
      beforeState: { ...existing },
      afterState: { ...updated },
    });

    // CRITICAL_ALERT — schedule changes bypass mute (Agent Guide DECISION 4)
    await notificationService.sendToEnrolledStudents(updated.id, {
      type: NotificationType.CRITICAL_ALERT,
      title: 'تغییر در برنامه درس',
      body: `زمان یا مکان ${existing.course.name} تغییر کرد`,
      data: { specificationId: updated.id },
      bypassMute: true,
    });

    // Detect & notify affected students whose other courses now conflict
    const conflicts = await detectSpecConflicts(
      updated.id,
      updated.classDays,
      updated.classStartTime,
      updated.classEndTime,
      updated.finalExamDate,
      updated.finalExamTime,
    );
    if (conflicts.length > 0) {
      await notifyConflicts(updated.id, conflicts, existing.course.name);
    }

    res.json({
      success: true,
      data: { ...updated, conflictsDetected: conflicts.length },
      requestId: req.requestId,
    });
  }),
);

// ── Spec deletion (Agent Guide Decision 5: hard-delete + CancelledSpecificationNotice) ──
expertRouter.delete(
  '/specifications/:id',
  asyncHandler(async (req, res) => {
    const spec = await prisma.courseSpecification.findUnique({
      where: { id: req.params.id },
      include: {
        course: true,
        professor: { select: { firstName: true, lastName: true } },
        semester: { select: { name: true } },
        enrollments: { where: { isTemporary: false }, select: { studentId: true } },
      },
    });
    if (!spec) throw NotFound('گروه درسی');
    if (spec.course.departmentId !== req.user!.departmentId) throw AuthForbidden();

    const professorName =
      [spec.professor.firstName, spec.professor.lastName].filter(Boolean).join(' ') || 'نامشخص';
    const semesterName = spec.semester?.name || '';
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    // Notify enrolled students FIRST
    await notificationService.sendToEnrolledStudents(spec.id, {
      type: NotificationType.CRITICAL_ALERT,
      title: 'لغو گروه درسی',
      body: `گروه ${spec.course.name} لغو شد`,
      data: { specificationId: spec.id },
      bypassMute: true,
    });

    // Create CancelledSpecificationNotice for each enrolled student (Agent Guide Decision 5)
    if (spec.enrollments.length > 0) {
      await prisma.cancelledSpecificationNotice.createMany({
        data: spec.enrollments.map((e) => ({
          studentId: e.studentId,
          specificationId: spec.id,
          courseCode: spec.course.code,
          courseName: spec.course.name,
          professorName,
          semesterName,
          credits: spec.course.credits,
          deletedByUserId: req.user!.userId,
          deletedAt: now,
          expiresAt,
        })),
      });
    }

    // Enrollments cascade-delete via FK
    await prisma.courseSpecification.delete({ where: { id: spec.id } });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SPECIFICATION_DELETED,
      targetEntityType: 'CourseSpecification',
      targetEntityId: spec.id,
      beforeState: { ...spec, enrollments: undefined },
      context: {
        affectedStudents: spec.enrollments.length,
        noticesExpiresAt: expiresAt.toISOString(),
      },
    });

    res.json({
      success: true,
      data: {
        message: 'گروه درسی حذف شد',
        affectedStudents: spec.enrollments.length,
      },
      requestId: req.requestId,
    });
  }),
);

// ── Prerequisite & Co-requisite management ─────────────────────────────────
const prereqSchema = z.object({ prerequisiteId: z.string().uuid() });
expertRouter.post(
  '/courses/:courseId/prerequisites',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course || course.departmentId !== req.user!.departmentId) throw AuthForbidden();
    const { prerequisiteId } = prereqSchema.parse(req.body);
    await prisma.courseRelationship.upsert({
      where: { courseId_prerequisiteId: { courseId: req.params.courseId, prerequisiteId } },
      create: { courseId: req.params.courseId, prerequisiteId },
      update: {},
    });
    res.json({ success: true, data: { message: 'پیش‌نیاز اضافه شد' }, requestId: req.requestId });
  }),
);

expertRouter.delete(
  '/courses/:courseId/prerequisites/:prerequisiteId',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course || course.departmentId !== req.user!.departmentId) throw AuthForbidden();
    await prisma.courseRelationship.delete({
      where: { courseId_prerequisiteId: { courseId: req.params.courseId, prerequisiteId: req.params.prerequisiteId } },
    });
    res.json({ success: true, data: { message: 'پیش‌نیاز حذف شد' }, requestId: req.requestId });
  }),
);

expertRouter.get(
  '/courses/:courseId/prerequisites',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course || course.departmentId !== req.user!.departmentId) throw AuthForbidden();
    const rels = await prisma.courseRelationship.findMany({
      where: { courseId: req.params.courseId },
      include: { prerequisite: true },
    });
    const coreqs = await prisma.corequisiteRelationship.findMany({
      where: { courseAId: req.params.courseId },
      include: { courseB: true },
    });
    res.json({
      success: true,
      data: {
        prerequisites: [
          ...rels.map((r) => ({
            id: r.id,
            type: 'prerequisite',
            courseId: r.prerequisiteId,
            courseCode: r.prerequisite.code,
            courseName: r.prerequisite.name,
          })),
          ...coreqs.map((r) => ({
            id: r.id,
            type: 'corequisite',
            courseId: r.courseBId,
            courseCode: r.courseB.code,
            courseName: r.courseB.name,
          })),
        ],
      },
      requestId: req.requestId,
    });
  }),
);

const coreqSchema = z.object({ courseBId: z.string().uuid() });
expertRouter.post(
  '/courses/:courseId/corequisites',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course || course.departmentId !== req.user!.departmentId) throw AuthForbidden();
    const { courseBId } = coreqSchema.parse(req.body);
    await prisma.corequisiteRelationship.upsert({
      where: { courseAId_courseBId: { courseAId: req.params.courseId, courseBId } },
      create: { courseAId: req.params.courseId, courseBId },
      update: {},
    });
    res.json({ success: true, data: { message: 'هم‌نیاز اضافه شد' }, requestId: req.requestId });
  }),
);

expertRouter.delete(
  '/courses/:courseId/corequisites/:courseBId',
  asyncHandler(async (req, res) => {
    const course = await prisma.course.findUnique({ where: { id: req.params.courseId } });
    if (!course || course.departmentId !== req.user!.departmentId) throw AuthForbidden();
    await prisma.corequisiteRelationship.delete({
      where: { courseAId_courseBId: { courseAId: req.params.courseId, courseBId: req.params.courseBId } },
    });
    res.json({ success: true, data: { message: 'هم‌نیاز حذف شد' }, requestId: req.requestId });
  }),
);

// ── Department student list ───────────────────────────────────────────────
expertRouter.get(
  '/students',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) {
      res.json({ success: true, data: { students: [] }, requestId: req.requestId });
      return;
    }
    const students = await prisma.user.findMany({
      where: { role: Role.STUDENT, departmentId: req.user!.departmentId, isActive: true },
      select: { id: true, username: true, firstName: true, lastName: true, createdAt: true },
      orderBy: { username: 'asc' },
    });
    res.json({ success: true, data: { students }, requestId: req.requestId });
  }),
);
