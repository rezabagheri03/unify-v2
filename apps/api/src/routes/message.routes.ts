/**
 * src/routes/message.routes.ts
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { messageService } from '../services/message.service';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { messageRateLimiter } from '../middleware/rate-limit.middleware';

export const messageRouter = Router();
messageRouter.use(authenticateToken, requireOnboardingComplete, messageRateLimiter);

const broadcastSchema = z.object({
  specificationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

messageRouter.post(
  '/broadcast',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.PROFESSOR) {
      res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'فقط استاد' }, requestId: req.requestId });
      return;
    }
    const { specificationId, content } = broadcastSchema.parse(req.body);
    const result = await messageService.sendBroadcast(req.user!.userId, specificationId, content);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

const directSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(100),
  content: z.string().min(1).max(5000),
});

messageRouter.post(
  '/direct',
  asyncHandler(async (req, res) => {
    if (![Role.PROFESSOR, Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(req.user!.role)) {
      res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'نقش مجاز نیست' }, requestId: req.requestId });
      return;
    }
    const { recipientIds, content } = directSchema.parse(req.body);
    const result = await messageService.sendDirect(req.user!.userId, req.user!.role, recipientIds, content);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

const replySchema = z.object({
  parentMessageId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

messageRouter.post(
  '/reply',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.STUDENT) {
      res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'فقط دانشجو' }, requestId: req.requestId });
      return;
    }
    const { parentMessageId, content } = replySchema.parse(req.body);
    const message = await messageService.reply(req.user!.userId, parentMessageId, content);
    res.json({ success: true, data: { messageId: message.id }, requestId: req.requestId });
  }),
);

const editSchema = z.object({ content: z.string().min(1).max(5000) });

messageRouter.patch(
  '/:messageId',
  asyncHandler(async (req, res) => {
    const { content } = editSchema.parse(req.body);
    await messageService.editMessage(req.user!.userId, req.user!.role, req.params.messageId, content);
    res.json({ success: true, data: { message: 'پیام ویرایش شد' }, requestId: req.requestId });
  }),
);

messageRouter.delete(
  '/:messageId',
  asyncHandler(async (req, res) => {
    await messageService.deleteMessage(req.user!.userId, req.user!.role, req.params.messageId);
    res.json({ success: true, data: { message: 'پیام حذف شد' }, requestId: req.requestId });
  }),
);
