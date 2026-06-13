/**
 * src/routes/department.routes.ts — Department CRUD (admin & owner).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role, NotFound, BadRequest } from '@unify/shared-types';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';

export const departmentRouter = Router();
departmentRouter.use(authenticateToken, requireOnboardingComplete);

const departmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
});

// Public to all authenticated users (for dropdowns)
departmentRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const departments = await prisma.department.findMany({
      orderBy: { name: 'asc' },
    });
    res.json({ success: true, data: { departments }, requestId: req.requestId });
  }),
);

// Only Owner can create/update/delete departments
departmentRouter.use(requireRole([Role.SYSTEM_OWNER]));

departmentRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const data = departmentSchema.parse(req.body);
    const existing = await prisma.department.findFirst({
      where: { OR: [{ name: data.name }, { code: data.code }] },
    });
    if (existing) throw BadRequest('گروه با این نام یا کد قبلاً وجود دارد');
    const dept = await prisma.department.create({ data });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'Department',
      targetEntityId: dept.id,
      afterState: { name: data.name, code: data.code },
    });
    res.json({ success: true, data: { departmentId: dept.id }, requestId: req.requestId });
  }),
);

departmentRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const data = departmentSchema.partial().parse(req.body);
    const dept = await prisma.department.update({ where: { id: req.params.id }, data });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'Department',
      targetEntityId: dept.id,
      afterState: data,
    });
    res.json({ success: true, data: dept, requestId: req.requestId });
  }),
);

departmentRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    const dept = await prisma.department.findUnique({ where: { id: req.params.id } });
    if (!dept) throw NotFound('گروه');
    // Check for usage
    const userCount = await prisma.user.count({ where: { departmentId: dept.id } });
    const courseCount = await prisma.course.count({ where: { departmentId: dept.id } });
    if (userCount > 0 || courseCount > 0) {
      throw BadRequest('این گروه در حال استفاده است و نمی‌توان آن را حذف کرد');
    }
    await prisma.department.delete({ where: { id: dept.id } });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.FILE_DELETED,
      targetEntityType: 'Department',
      targetEntityId: dept.id,
    });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);
