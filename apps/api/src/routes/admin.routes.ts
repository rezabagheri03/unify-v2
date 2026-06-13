/**
 * src/routes/admin.routes.ts — System Admin: semester, phase, users, tickets.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Phase, Role, NotificationType, AuthForbidden, BadRequest, NotFound } from '@prisma/client';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';
import { notificationService } from '../services/notification.service';
import { addGracePeriodJob } from '../jobs/job-runner';
import { fromShamsi } from '../utils/shamsi';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';
import { toPublicFileUrl, uploadGeneric } from '../middleware/upload.middleware';

export const adminRouter = Router();
adminRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.SYSTEM_ADMIN]));

// ── Semester management ────────────────────────────────────────────────────
const semesterSchema = z.object({
  name: z.string().min(2).max(50),
  startDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
  endDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
});

adminRouter.post(
  '/semesters',
  asyncHandler(async (req, res) => {
    const data = semesterSchema.parse(req.body);
    const semester = await prisma.semester.create({
      data: {
        name: data.name,
        startDate: fromShamsi(data.startDate),
        endDate: fromShamsi(data.endDate),
      },
    });
    res.json({ success: true, data: { semesterId: semester.id }, requestId: req.requestId });
  }),
);

adminRouter.get(
  '/semesters',
  asyncHandler(async (req, res) => {
    const semesters = await prisma.semester.findMany({ orderBy: { createdAt: 'desc' } });
    res.json({ success: true, data: { semesters }, requestId: req.requestId });
  }),
);

adminRouter.patch(
  '/semesters/:id/set-current',
  asyncHandler(async (req, res) => {
    // Only one semester can be current at a time
    await prisma.semester.updateMany({ where: { isCurrent: true }, data: { isCurrent: false } });
    const semester = await prisma.semester.update({
      where: { id: req.params.id },
      data: { isCurrent: true },
    });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SEMESTER_CHANGED,
      targetEntityType: 'Semester',
      targetEntityId: semester.id,
      afterState: { name: semester.name, isCurrent: true },
    });
    res.json({ success: true, data: { semesterId: semester.id }, requestId: req.requestId });
  }),
);

// ── Phase management ───────────────────────────────────────────────────────
const phaseSchema = z.object({
  phase: z.enum(['ENROLLMENT', 'ACTIVE', 'EXAM']),
  reason: z.string().max(500).optional(),
});

adminRouter.patch(
  '/phase',
  asyncHandler(async (req, res) => {
    const { phase, reason } = phaseSchema.parse(req.body);
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) throw BadRequest('نیم‌سال جاری تعریف نشده است');

    const beforePhase = semester.currentPhase;
    const updated = await prisma.semester.update({
      where: { id: semester.id },
      data: {
        currentPhase: phase,
        phaseSwitchedAt: new Date(),
      },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.PHASE_CHANGED,
      targetEntityType: 'Semester',
      targetEntityId: semester.id,
      beforeState: { phase: beforePhase },
      afterState: { phase },
      context: { reason },
    });

    // Agent Guide Decision 8: if switching to ACTIVE, schedule grace-period-wipe job
    if (phase === Phase.ACTIVE) {
      await addGracePeriodJob();
      await notificationService.send({
        type: NotificationType.CRITICAL_ALERT,
        title: 'فصل ثبت‌نام بسته شد',
        body: 'مهلت ۲۴ ساعته برای ثبت‌نام نهایی آغاز شد',
        recipientIds: [], // Will be filled by job when wiping
        data: { phase: 'ACTIVE' },
      });
    }

    res.json({ success: true, data: { newPhase: phase, changedAt: updated.phaseSwitchedAt }, requestId: req.requestId });
  }),
);

// ── User management (view/ban) ─────────────────────────────────────────────
adminRouter.get(
  '/users',
  asyncHandler(async (req, res) => {
    const q = (req.query.q as string) || '';
    const role = req.query.role as string | undefined;
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));

    const where: Record<string, unknown> = {};
    if (q) {
      where.OR = [
        { username: { contains: q, mode: 'insensitive' } },
        { firstName: { contains: q, mode: 'insensitive' } },
        { lastName: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (role) where.role = role as Role;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        include: { department: { select: { name: true, code: true } } },
        orderBy: { username: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.user.count({ where }),
    ]);

    res.json({
      success: true,
      data: {
        users,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
      requestId: req.requestId,
    });
  }),
);

const banSchema = z.object({ isActive: z.boolean(), reason: z.string().max(500).optional() });
adminRouter.patch(
  '/users/:id/ban',
  asyncHandler(async (req, res) => {
    const { isActive, reason } = banSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.id } });
    if (!target) throw NotFound('کاربر');
    if (target.role === Role.SYSTEM_OWNER) throw AuthForbidden('نمی‌توان مدیر ارشد را غیرفعال کرد');

    await prisma.user.update({
      where: { id: target.id },
      data: { isActive },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: isActive ? AuditActionType.USER_UNBANNED : AuditActionType.USER_BANNED,
      targetEntityType: 'User',
      targetEntityId: target.id,
      context: { reason },
    });

    res.json({ success: true, data: { message: isActive ? 'فعال شد' : 'غیرفعال شد' }, requestId: req.requestId });
  }),
);

// ── Logo upload ────────────────────────────────────────────────────────────
adminRouter.post(
  '/logo',
  uploadGeneric.single('logo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw BadRequest('فایل لوگو الزامی است');
    const ext = path.extname(req.file.originalname).toLowerCase();
    const dest = path.join(config.storage.basePath, 'logos', `current${ext}`);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.renameSync(req.file.path, dest);
    res.json({ success: true, data: { logoUrl: toPublicFileUrl(req, dest) }, requestId: req.requestId });
  }),
);
