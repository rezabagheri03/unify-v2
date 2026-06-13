/**
 * src/routes/system-state.routes.ts — System-wide state (current semester/phase).
 * Accessible to all authenticated users.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { toShamsi, fromShamsi } from '../utils/shamsi';
import { Phase } from '@prisma/client';

export const systemStateRouter = Router();
systemStateRouter.use(authenticateToken);

systemStateRouter.get(
  '/state',
  asyncHandler(async (req, res) => {
    const semester = await prisma.semester.findFirst({
      where: { isCurrent: true },
    });

    let gracePeriodEndsAt: Date | null = null;
    if (semester && semester.currentPhase === Phase.ACTIVE) {
      gracePeriodEndsAt = new Date(semester.phaseSwitchedAt.getTime() + 24 * 60 * 60 * 1000);
    }

    res.json({
      success: true,
      data: {
        currentSemester: semester ? {
          id: semester.id,
          name: semester.name,
          startDate: { dateUtc: semester.startDate.toISOString(), dateShamsi: toShamsi(semester.startDate) },
          endDate: { dateUtc: semester.endDate.toISOString(), dateShamsi: toShamsi(semester.endDate) },
        } : null,
        currentPhase: semester?.currentPhase || Phase.ENROLLMENT,
        phaseSwitchedAt: semester?.phaseSwitchedAt ? {
          dateUtc: semester.phaseSwitchedAt.toISOString(),
          dateShamsi: toShamsi(semester.phaseSwitchedAt),
        } : null,
        gracePeriodEndsAt: gracePeriodEndsAt ? {
          dateUtc: gracePeriodEndsAt.toISOString(),
          dateShamsi: toShamsi(gracePeriodEndsAt),
        } : null,
      },
      requestId: req.requestId,
    });
  }),
);

export const systemStateHelpers = {
  async getCurrentPhase(): Promise<Phase> {
    const sem = await prisma.semester.findFirst({ where: { isCurrent: true } });
    return sem?.currentPhase || Phase.ENROLLMENT;
  },
  async getCurrentSemesterId(): Promise<string | null> {
    const sem = await prisma.semester.findFirst({ where: { isCurrent: true } });
    return sem?.id || null;
  },
  fromShamsiString,
};

function fromShamsiString(s: string): Date {
  return fromShamsi(s);
}
