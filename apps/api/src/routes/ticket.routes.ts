/**
 * src/routes/ticket.routes.ts
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { uploadTicketImages, toPublicFileUrl } from '../middleware/upload.middleware';
import { ticketService } from '../services/ticket.service';
import { z } from 'zod';
import { config } from '../config';
import path from 'path';
import fs from 'fs';
import { BadRequest } from '../utils/errors';
import { TicketDepartment } from '@unify/shared-types';

export const ticketRouter = Router();
ticketRouter.use(authenticateToken, requireOnboardingComplete);

const createSchema = z.object({
  department: z.enum(['EDUCATION', 'TECHNICAL', 'STUDENT_AFFAIRS']),
  content: z.string().min(10).max(5000),
});

ticketRouter.post(
  '/',
  uploadTicketImages.array('images', config.storage.maxTicketImages),
  asyncHandler(async (req, res) => {
    const { department, content } = createSchema.parse(req.body);
    const imageUrls = (req.files as Express.Multer.File[] || []).map((f) => toPublicFileUrl(req, f.path));
    const ticket = await ticketService.createTicket(
      req.user!.userId,
      department as TicketDepartment,
      content,
      imageUrls,
    );
    res.json({ success: true, data: { ticketId: ticket.id, status: ticket.status }, requestId: req.requestId });
  }),
);

ticketRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const page = Math.max(1, parseInt((req.query.page as string) || '1', 10));
    const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20', 10)));
    const tickets = await ticketService.listForUser(
      req.user!.userId,
      req.user!.role,
      req.user!.departmentId,
      page,
      limit,
    );
    res.json({ success: true, data: tickets, requestId: req.requestId });
  }),
);

const replySchema = z.object({ content: z.string().min(1).max(5000) });

ticketRouter.post(
  '/:ticketId/reply',
  uploadTicketImages.single('attachment'),
  asyncHandler(async (req, res) => {
    const { content } = replySchema.parse(req.body);
    const attachmentUrl = req.file ? toPublicFileUrl(req, req.file.path) : null;
    const result = await ticketService.reply(req.params.ticketId, req.user!.userId, req.user!.role, content, attachmentUrl);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

ticketRouter.patch(
  '/:ticketId/close',
  asyncHandler(async (req, res) => {
    const reason = req.body?.reason;
    await ticketService.closeTicket(req.user!.userId, req.user!.role, req.params.ticketId, reason);
    res.json({ success: true, data: { message: 'تیکت بسته شد' }, requestId: req.requestId });
  }),
);
