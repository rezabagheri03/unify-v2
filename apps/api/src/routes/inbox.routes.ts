/**
 * src/routes/inbox.routes.ts — Student inbox.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { messageService } from '../services/message.service';

export const inboxRouter = Router();
inboxRouter.use(authenticateToken, requireOnboardingComplete);

inboxRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const threads = await messageService.getInbox(req.user!.userId);
    res.json({ success: true, data: { threads }, requestId: req.requestId });
  }),
);

inboxRouter.post(
  '/:messageId/read',
  asyncHandler(async (req, res) => {
    await messageService.markAsRead(req.user!.userId, req.params.messageId);
    res.json({ success: true, data: { message: 'خوانده شد' }, requestId: req.requestId });
  }),
);

inboxRouter.get(
  '/notifications',
  asyncHandler(async (req, res) => {
    const notifications = await messageService.getPersistentNotifications(req.user!.userId);
    res.json({ success: true, data: { notifications }, requestId: req.requestId });
  }),
);
