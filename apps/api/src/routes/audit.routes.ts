/**
 * src/routes/audit.routes.ts — Owner-only audit log access.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { auditService } from '../services/audit.service';
import { Role, AuditActionType } from '@unify/shared-types';

export const auditRouter = Router();
auditRouter.use(
  authenticateToken,
  requireOnboardingComplete,
  requireRole([Role.SYSTEM_OWNER]),
);

const VALID_ACTION_TYPES = new Set<string>(Object.values(AuditActionType));

auditRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { startDate, endDate, actorId, actionType, entityType, page, limit } = req.query;

    // Validate actionType against the enum to avoid passing arbitrary strings downstream.
    const actionTypeEnum: AuditActionType | undefined =
      typeof actionType === 'string' && VALID_ACTION_TYPES.has(actionType)
        ? (actionType as AuditActionType)
        : undefined;

    const result = await auditService.query({
      startDate: typeof startDate === 'string' ? new Date(startDate) : undefined,
      endDate: typeof endDate === 'string' ? new Date(endDate) : undefined,
      actorId: typeof actorId === 'string' ? actorId : undefined,
      actionType: actionTypeEnum,
      entityType: typeof entityType === 'string' ? entityType : undefined,
      page: typeof page === 'string' ? parseInt(page, 10) : 1,
      limit: typeof limit === 'string' ? parseInt(limit, 10) : 50,
    });
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);
