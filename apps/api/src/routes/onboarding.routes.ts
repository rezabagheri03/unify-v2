/**
 * src/routes/onboarding.routes.ts — First-login onboarding.
 * Per Golden Doc §1.2.4: mandatory, cannot be skipped.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { BadRequest } from '../utils/errors';
import { prisma } from '../prisma/prisma.client';
import { onboardingSchema } from '@unify/shared-types';

export const onboardingRouter = Router();

onboardingRouter.use(authenticateToken);

onboardingRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (!req.user) throw BadRequest();
    const data = onboardingSchema.parse(req.body);

    await prisma.user.update({
      where: { id: req.user.userId },
      data: {
        firstName: data.firstName,
        lastName: data.lastName,
        themePreference: data.themePreference || 'default',
        darkMode: data.darkMode || false,
        onboardingComplete: true,
      },
    });

    res.json({
      success: true,
      data: { message: 'فرآیند ورود اولیه با موفقیت تکمیل شد' },
      requestId: req.requestId,
    });
  }),
);

onboardingRouter.get(
  '/status',
  asyncHandler(async (req, res) => {
    if (!req.user) throw BadRequest();
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { onboardingComplete: true, firstName: true, lastName: true },
    });
    res.json({ success: true, data: user, requestId: req.requestId });
  }),
);
