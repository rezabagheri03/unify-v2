/**
 * src/routes/pending-approval.routes.ts — Resource Hub approval queue (staff).
 * Lists pending student-uploaded files for Professor/Expert/Admin/Head review.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { resourceService } from '../services/resource.service';
import { Role, AuthForbidden, NotFound, BadRequest } from '@unify/shared-types';
import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';

export const pendingApprovalRouter = Router();
pendingApprovalRouter.use(authenticateToken, requireOnboardingComplete);

const STAFF_ROLES = [Role.PROFESSOR, Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN];

pendingApprovalRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    if (!STAFF_ROLES.includes(req.user!.role)) throw AuthForbidden();
    const files = await resourceService.listPending(
      req.user!.userId,
      req.user!.role,
      req.user!.departmentId,
    );
    res.json({
      success: true,
      data: {
        files: files.map((f) => ({
          id: f.id,
          title: f.title,
          description: f.description,
          fileType: f.fileType,
          fileSizeBytes: f.fileSizeBytes,
          versionNumber: f.versionNumber,
          courseCode: f.course.code,
          courseName: f.course.name,
          professorName: [f.professor.firstName, f.professor.lastName].filter(Boolean).join(' ') || 'نامشخص',
          uploaderName: [f.uploadedBy.firstName, f.uploadedBy.lastName].filter(Boolean).join(' ') || f.uploadedBy.username,
          createdAt: toShamsi(f.createdAt),
        })),
      },
      requestId: req.requestId,
    });
  }),
);
