/**
 * src/routes/calendar.routes.ts — Academic calendar.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { AuthForbidden, BadRequest } from '../utils/errors';
import { fromShamsi, toShamsi } from '../utils/shamsi';

export const calendarRouter = Router();
calendarRouter.use(authenticateToken, requireOnboardingComplete);

const eventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/),
});

calendarRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const events = await prisma.academicCalendarEvent.findMany({
      orderBy: { eventDate: 'asc' },
    });
    res.json({
      success: true,
      data: {
        events: events.map((e) => ({
          ...e,
          eventDateShamsi: toShamsi(e.eventDate),
        })),
      },
      requestId: req.requestId,
    });
  }),
);

calendarRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.SYSTEM_ADMIN) throw AuthForbidden();
    const data = eventSchema.parse(req.body);
    const event = await prisma.academicCalendarEvent.create({
      data: {
        title: data.title,
        description: data.description || null,
        eventDate: fromShamsi(data.eventDate),
        createdById: req.user!.userId,
      },
    });
    res.json({ success: true, data: { eventId: event.id }, requestId: req.requestId });
  }),
);

calendarRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.SYSTEM_ADMIN) throw AuthForbidden();
    await prisma.academicCalendarEvent.delete({ where: { id: req.params.id } });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);

// Golden Doc §3.5.5: Edit calendar events
calendarRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.SYSTEM_ADMIN) throw AuthForbidden();
    const data = eventSchema.partial().parse(req.body);
    const updateData: Record<string, unknown> = { ...data };
    if (data.eventDate) updateData.eventDate = fromShamsi(data.eventDate);
    const updated = await prisma.academicCalendarEvent.update({
      where: { id: req.params.id },
      data: updateData,
    });
    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
