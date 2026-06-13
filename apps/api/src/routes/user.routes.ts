/**
 * src/routes/user.routes.ts — User profile (self).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';

export const userRouter = Router();
userRouter.use(authenticateToken, requireOnboardingComplete);

const updateProfileSchema = z.object({
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
  // Golden Doc §1.2.5: dedicated optional fields
  mobileNumber: z.string().max(50).optional().nullable(),
  emailAddress: z.string().email('ایمیل نامعتبر است').max(255).optional().nullable(),
  supplementaryInfo: z.string().max(2000).optional(),
  themePreference: z.string().max(50).optional(),
  darkMode: z.boolean().optional(),
  academicStatus: z.enum(['NORMAL', 'CONDITIONAL', 'GPA_A', 'FINAL_SEMESTER']).optional(),
});

userRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: { id: req.user!.userId },
      include: { department: { select: { id: true, name: true, code: true } } },
    });
    if (!user) {
      res.status(404).json({ success: false, error: { code: 'USER_NOT_FOUND', message: 'کاربر یافت نشد' }, requestId: req.requestId });
      return;
    }
    res.json({
      success: true,
      data: {
        id: user.id,
        username: user.username,
        role: user.role,
        firstName: user.firstName,
        lastName: user.lastName,
        mobileNumber: user.mobileNumber,
        emailAddress: user.emailAddress,
        darkMode: user.darkMode,
        themePreference: user.themePreference,
        supplementaryInfo: user.supplementaryInfo,
        academicStatus: user.academicStatus,
        declaredAt: user.declaredAt,
        department: user.department,
      },
      requestId: req.requestId,
    });
  }),
);

userRouter.patch(
  '/me',
  asyncHandler(async (req, res) => {
    const data = updateProfileSchema.parse(req.body);
    // If changing academicStatus, record declaredAt for audit
    if (data.academicStatus) {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: {
          ...data,
          declaredAt: new Date(),
          // Keep supplementaryInfo in sync for back-compat
          supplementaryInfo: `ACADEMIC_STATUS:${data.academicStatus}`,
        },
      });
    } else {
      await prisma.user.update({
        where: { id: req.user!.userId },
        data,
      });
    }
    res.json({ success: true, data: { message: 'پروفایل به‌روزرسانی شد' }, requestId: req.requestId });
  }),
);
