/**
 * src/routes/head.routes.ts — Head of Department (inherits Expert + adds oversight).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { Role, AuthForbidden, NotFound, BadRequest } from '@unify/shared-types';
import { toShamsi } from '../utils/shamsi';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';

export const headRouter = Router();
headRouter.use(
  authenticateToken,
  requireOnboardingComplete,
  requireRole([Role.HEAD_OF_DEPARTMENT]),
);

// Professor oversight dashboard
headRouter.get(
  '/professors',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden();

    const professors = await prisma.user.findMany({
      where: { role: Role.PROFESSOR, departmentId: req.user!.departmentId, isActive: true },
      include: {
        specifications: {
          where: { semester: { isCurrent: true } },
          include: { resourceFiles: { where: { approvalStatus: 'APPROVED' } } },
        },
      },
    });

    res.json({
      success: true,
      data: {
        professors: professors.map((p) => {
          const fileCount = p.specifications.reduce((sum, s) => sum + s.resourceFiles.length, 0);
          const lastFile = p.specifications
            .flatMap((s) => s.resourceFiles)
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
          return {
            id: p.id,
            name: [p.firstName, p.lastName].filter(Boolean).join(' ') || p.username,
            personnelId: p.username,
            specificationsCount: p.specifications.length,
            uploadedFilesCount: fileCount,
            lastUploadAt: lastFile?.createdAt || null,
          };
        }),
      },
      requestId: req.requestId,
    });
  }),
);

// Curriculum charts awaiting approval
headRouter.get(
  '/curricula/pending',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden();
    const charts = await prisma.curriculumChart.findMany({
      where: { departmentId: req.user!.departmentId, isPublished: false },
      include: {
        uploadedBy: { select: { firstName: true, lastName: true, username: true } },
        approvedBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
    res.json({
      success: true,
      data: {
        charts: charts.map((c) => ({
          id: c.id,
          entryYear: c.entryYear,
          chartData: c.chartData,
          uploadedBy: [c.uploadedBy.firstName, c.uploadedBy.lastName].filter(Boolean).join(' ') || c.uploadedBy.username,
          updatedAtShamsi: toShamsi(c.updatedAt),
        })),
      },
      requestId: req.requestId,
    });
  }),
);

headRouter.get(
  '/curricula/published',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden();
    const charts = await prisma.curriculumChart.findMany({
      where: { departmentId: req.user!.departmentId, isPublished: true },
      orderBy: { entryYear: 'desc' },
    });
    res.json({ success: true, data: { charts }, requestId: req.requestId });
  }),
);

headRouter.post(
  '/curricula/:id/publish',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden();
    const chart = await prisma.curriculumChart.findUnique({ where: { id: req.params.id } });
    if (!chart) throw NotFound('چارت');
    if (chart.departmentId !== req.user!.departmentId) throw AuthForbidden('این چارت متعلق به گروه شما نیست');

    const updated = await prisma.curriculumChart.update({
      where: { id: chart.id },
      data: { isPublished: true, approvedById: req.user!.userId },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'CurriculumChart',
      targetEntityId: chart.id,
      afterState: { entryYear: chart.entryYear, isPublished: true },
      context: { action: 'PUBLISH' },
    });

    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);

headRouter.post(
  '/curricula/:id/send-back',
  asyncHandler(async (req, res) => {
    if (!req.user!.departmentId) throw AuthForbidden();
    const chart = await prisma.curriculumChart.findUnique({ where: { id: req.params.id } });
    if (!chart) throw NotFound('چارت');
    if (chart.departmentId !== req.user!.departmentId) throw AuthForbidden();

    // Reset publish state and clear approver
    const updated = await prisma.curriculumChart.update({
      where: { id: chart.id },
      data: { isPublished: false, approvedById: null },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'CurriculumChart',
      targetEntityId: chart.id,
      context: { action: 'SEND_BACK', reason: req.body?.reason || '' },
    });

    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
