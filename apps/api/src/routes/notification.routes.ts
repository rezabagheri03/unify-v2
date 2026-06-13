/**
 * src/routes/notification.routes.ts
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { notificationService } from '../services/notification.service';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';

export const notificationRouter = Router();
notificationRouter.use(authenticateToken, requireOnboardingComplete);

const deviceSchema = z.object({
  token: z.string().min(1).max(500),
  platform: z.enum(['web', 'ios', 'android']).optional().default('web'),
});

notificationRouter.post(
  '/register-device',
  asyncHandler(async (req, res) => {
    const { token, platform } = deviceSchema.parse(req.body);
    // Persist via audit log entry — full device tracking would need a DeviceToken table
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'DeviceToken',
      targetEntityId: req.user!.userId,
      context: { platform, tokenLength: token.length, source: 'PUSHE_REGISTRATION' },
    });
    // Notify the user that device is registered
    if (req.user!.role === 'STUDENT') {
      await notificationService.send({
        type: 'INFO',
        title: 'اعلان‌ها فعال شد',
        body: 'اعلان‌های شما از این دستگاه فعال شد.',
        recipientIds: [req.user!.userId],
        data: { devicePlatform: platform },
      });
    }
    res.json({ success: true, data: { message: 'دستگاه ثبت شد' }, requestId: req.requestId });
  }),
);

const prefSchema = z.object({
  specificationId: z.string().uuid(),
  isMuted: z.boolean(),
});

notificationRouter.post(
  '/preferences',
  asyncHandler(async (req, res) => {
    const { specificationId, isMuted } = prefSchema.parse(req.body);
    await prisma.notificationPreference.upsert({
      where: { studentId_specificationId: { studentId: req.user!.userId, specificationId } },
      create: { studentId: req.user!.userId, specificationId, isMuted },
      update: { isMuted },
    });
    res.json({ success: true, data: { message: 'تنظیمات اعلان به‌روزرسانی شد' }, requestId: req.requestId });
  }),
);

notificationRouter.get(
  '/preferences',
  asyncHandler(async (req, res) => {
    const prefs = await prisma.notificationPreference.findMany({
      where: { studentId: req.user!.userId },
      include: { specification: { include: { course: true } } },
    });
    res.json({ success: true, data: { preferences: prefs }, requestId: req.requestId });
  }),
);
