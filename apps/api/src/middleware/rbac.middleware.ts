/**
 * src/middleware/rbac.middleware.ts — Role-based access control.
 * Agent Guide §6.1: every route must use authenticateToken + requireRole.
 */

import { Request, Response, NextFunction } from 'express';
import { Role } from '@unify/shared-types';
import { AuthForbidden, DepartmentAccessDenied } from '../utils/errors';
import { prisma } from '../prisma/prisma.client';

export function requireRole(allowed: Role[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      return next(AuthForbidden('احراز هویت انجام نشده است'));
    }
    if (!allowed.includes(req.user.role)) {
      return next(AuthForbidden(`نقش ${req.user.role} اجازه دسترسی ندارد`));
    }
    next();
  };
}

/**
 * Department-scoped access. EXPERT and HEAD_OF_DEPARTMENT may only access
 * records tied to their own department.
 * Pass a function that extracts the department ID from the request.
 */
export function requireDepartmentAccess(getDepartmentId: (req: Request) => Promise<string | null> | string | null) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AuthForbidden('احراز هویت انجام نشده است'));
    }
    if (req.user.role !== Role.EXPERT && req.user.role !== Role.HEAD_OF_DEPARTMENT) {
      // Non-dept-scoped roles don't need this check
      return next();
    }
    if (!req.user.departmentId) {
      return next(DepartmentAccessDenied('شما به هیچ گروهی تخصیص داده نشده‌اید'));
    }

    try {
      const resourceDeptId = await getDepartmentId(req);
      if (!resourceDeptId) {
        // Resource has no department (e.g. cross-department spec) — allowed for HEAD only
        if (req.user.role === Role.HEAD_OF_DEPARTMENT) return next();
        return next(DepartmentAccessDenied('این منبع متعلق به گروه شما نیست'));
      }
      if (resourceDeptId !== req.user.departmentId) {
        return next(DepartmentAccessDenied('این منبع متعلق به گروه شما نیست'));
      }
      next();
    } catch (err) {
      next(err);
    }
  };
}

/**
 * Verifies the current user is the owner of the resource or has admin/owner role.
 * Use with :id routes where the resource has a studentId/ownerId field.
 */
export function requireOwnerOrStaff(getOwnerId: (req: Request) => Promise<string | null> | string | null) {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    if (!req.user) {
      return next(AuthForbidden('احراز هویت انجام نشده است'));
    }
    const staffRoles: Role[] = [Role.SYSTEM_ADMIN, Role.SYSTEM_OWNER, Role.EXPERT, Role.HEAD_OF_DEPARTMENT];
    if (staffRoles.includes(req.user.role)) {
      return next();
    }
    const ownerId = await getOwnerId(req);
    if (ownerId !== req.user.userId) {
      return next(AuthForbidden('فقط صاحب این منبع یا کارکنان می‌توانند به آن دسترسی داشته باشند'));
    }
    next();
  };
}

/**
 * Onboarding gate. Blocks any non-onboarded user from accessing protected routes.
 * Must run AFTER authenticateToken.
 */
export async function requireOnboardingComplete(req: Request, _res: Response, next: NextFunction): Promise<void> {
  if (!req.user) return next(AuthForbidden('احراز هویت انجام نشده است'));
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { onboardingComplete: true, isActive: true },
    });
    if (!user) return next(AuthForbidden('کاربر یافت نشد'));
    if (!user.isActive) return next(AuthForbidden('حساب کاربری شما غیرفعال شده است'));
    if (!user.onboardingComplete && req.path !== '/api/auth/onboarding') {
      return next(AuthForbidden('لطفاً ابتدا فرآیند ورود اولیه را تکمیل کنید'));
    }
    next();
  } catch (err) {
    next(err);
  }
}
