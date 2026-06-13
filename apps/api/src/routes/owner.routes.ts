/**
 * src/routes/owner.routes.ts — System Owner: user creation, password reset, role assignment.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role, BadRequest, NotFound, AuthForbidden } from '@unify/shared-types';
import { hashPassword, generateRandomPassword } from '../utils/bcrypt';
import { auditService } from '../services/audit.service';
import { AuditActionType } from '@unify/shared-types';
import { excelService } from '../services/excel.service';
import { uploadGeneric } from '../middleware/upload.middleware';

export const ownerRouter = Router();
ownerRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.SYSTEM_OWNER]));

// ── Single user creation ───────────────────────────────────────────────────
const createSchema = z.object({
  username: z.string().min(3).max(50),
  role: z.enum(['STUDENT', 'PROFESSOR', 'EXPERT', 'HEAD_OF_DEPARTMENT', 'SYSTEM_ADMIN']),
  departmentCode: z.string().max(20).optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
});

ownerRouter.post(
  '/users',
  asyncHandler(async (req, res) => {
    const data = createSchema.parse(req.body);
    let departmentId: string | null = null;
    if (data.departmentCode) {
      const dept = await prisma.department.findUnique({ where: { code: data.departmentCode } });
      if (!dept) throw BadRequest(`گروه با کد ${data.departmentCode} یافت نشد`);
      departmentId = dept.id;
    }
    const generated = generateRandomPassword(12);
    const hash = await hashPassword(generated);

    const user = await prisma.user.create({
      data: {
        username: data.username,
        passwordHash: hash,
        role: data.role as Role,
        departmentId,
        firstName: data.firstName || null,
        lastName: data.lastName || null,
        onboardingComplete: true, // Owner-created accounts skip onboarding
      },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'User',
      targetEntityId: user.id,
      afterState: { username: data.username, role: data.role },
    });

    res.json({ success: true, data: { userId: user.id, generatedPassword: generated }, requestId: req.requestId });
  }),
);

// ── Bulk Excel upload ──────────────────────────────────────────────────────
ownerRouter.post(
  '/users/bulk-upload',
  uploadGeneric.single('excel_file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw BadRequest('فایل اکسل الزامی است');
    const rows = await excelService.parseUserBulkUpload(req.file.path);
    const created: Array<{ username: string; password: string }> = [];
    const errors: Array<{ row: number; error: string; username?: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        const generated = generateRandomPassword(12);
        const hash = await hashPassword(generated);
        let departmentId: string | null = null;
        if (row.departmentCode) {
          const dept = await prisma.department.findUnique({ where: { code: row.departmentCode } });
          if (!dept) throw new Error(`گروه نامعتبر: ${row.departmentCode}`);
          departmentId = dept.id;
        }
        const user = await prisma.user.create({
          data: {
            username: row.username,
            passwordHash: hash,
            role: row.role,
            departmentId,
            firstName: row.firstName || null,
            lastName: row.lastName || null,
            onboardingComplete: true,
          },
        });
        created.push({ username: user.username, password: generated });
      } catch (err) {
        errors.push({
          row: i + 2, // +2 for header row + 1-indexed
          error: err instanceof Error ? err.message : 'خطا',
          username: row.username,
        });
      }
    }

    // Generate a password export file
    const passwordFileUrl = created.length > 0
      ? await excelService.exportGeneratedPasswords(created)
      : null;

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.USER_CREATED,
      targetEntityType: 'UserBulkUpload',
      targetEntityId: 'bulk',
      afterState: { createdCount: created.length, errorCount: errors.length },
    });

    res.json({ success: true, data: { createdCount: created.length, errors, passwordFileUrl }, requestId: req.requestId });
  }),
);

// ── Password reset ─────────────────────────────────────────────────────────
const resetSchema = z.object({
  newPassword: z.string().optional(),
});

ownerRouter.patch(
  '/users/:userId/reset-password',
  asyncHandler(async (req, res) => {
    const body = resetSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) throw NotFound('کاربر');
    const password = body.newPassword || generateRandomPassword(12);
    const hash = await hashPassword(password);
    await prisma.user.update({ where: { id: target.id }, data: { passwordHash: hash } });

    await prisma.passwordResetRequest.create({
      data: { userId: target.id, performedBy: req.user!.userId },
    });

    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.PASSWORD_RESET,
      targetEntityType: 'User',
      targetEntityId: target.id,
      context: { source: 'OWNER_RESET', autoGenerated: !body.newPassword },
    });

    res.json({ success: true, data: { newPassword: password, targetUsername: target.username }, requestId: req.requestId });
  }),
);

// ── Role change ────────────────────────────────────────────────────────────
const roleSchema = z.object({ role: z.enum(['STUDENT', 'PROFESSOR', 'EXPERT', 'HEAD_OF_DEPARTMENT', 'SYSTEM_ADMIN', 'SYSTEM_OWNER']) });

ownerRouter.patch(
  '/users/:userId/role',
  asyncHandler(async (req, res) => {
    const { role } = roleSchema.parse(req.body);
    const target = await prisma.user.findUnique({ where: { id: req.params.userId } });
    if (!target) throw NotFound('کاربر');
    const before = target.role;
    await prisma.user.update({ where: { id: target.id }, data: { role } });
    await auditService.log({
      actorId: req.user!.userId,
      actorRole: req.user!.role,
      actionType: AuditActionType.ROLE_CHANGED,
      targetEntityType: 'User',
      targetEntityId: target.id,
      beforeState: { role: before },
      afterState: { role },
    });
    res.json({ success: true, data: { message: 'نقش تغییر کرد' }, requestId: req.requestId });
  }),
);
