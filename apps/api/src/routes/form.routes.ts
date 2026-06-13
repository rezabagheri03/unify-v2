/**
 * src/routes/form.routes.ts — Forms repository.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { AuthForbidden, NotFound } from '../utils/errors';
import { uploadGeneric, toPublicFileUrl } from '../middleware/upload.middleware';
import path from 'path';
import fs from 'fs';
import { config } from '../config';
import { v4 as uuidv4 } from 'uuid';

export const formRouter = Router();
formRouter.use(authenticateToken, requireOnboardingComplete);

const formSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(200),
  description: z.string().min(2).max(1000),
  signatureGuide: z.string().min(2).max(1000),
});

formRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const forms = await prisma.administrativeForm.findMany({
      include: { department: { select: { name: true, code: true } } },
      orderBy: { createdAt: 'desc' },
    });
    res.json({ success: true, data: { forms }, requestId: req.requestId });
  }),
);

formRouter.post(
  '/',
  uploadGeneric.single('file'),
  asyncHandler(async (req, res) => {
    if (![Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(req.user!.role)) throw AuthForbidden();
    if (!req.file) throw AuthForbidden('فایل فرم الزامی است');
    const data = formSchema.parse(req.body);
    const id = uuidv4();
    const ext = path.extname(req.file.originalname).toLowerCase();
    const destDir = path.join(config.storage.basePath, 'forms', data.departmentId || 'global');
    fs.mkdirSync(destDir, { recursive: true });
    const dest = path.join(destDir, `${id}${ext}`);
    fs.renameSync(req.file.path, dest);

    const form = await prisma.administrativeForm.create({
      data: {
        id,
        departmentId: data.departmentId || null,
        name: data.name,
        description: data.description,
        signatureGuide: data.signatureGuide,
        filePath: dest,
        uploadedById: req.user!.userId,
      },
    });
    res.json({ success: true, data: { formId: form.id, fileUrl: toPublicFileUrl(req, dest) }, requestId: req.requestId });
  }),
);

formRouter.delete(
  '/:id',
  asyncHandler(async (req, res) => {
    if (![Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(req.user!.role)) throw AuthForbidden();
    const form = await prisma.administrativeForm.findUnique({ where: { id: req.params.id } });
    if (!form) throw NotFound('فرم');
    try { if (fs.existsSync(form.filePath)) fs.unlinkSync(form.filePath); } catch { /* */ }
    await prisma.administrativeForm.delete({ where: { id: form.id } });
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);

// Golden Doc §3.5.5: Admin can edit forms (metadata only — file replacement is upload flow)
const updateFormSchema = z.object({
  name: z.string().min(2).max(200).optional(),
  description: z.string().min(2).max(1000).optional(),
  signatureGuide: z.string().min(2).max(1000).optional(),
});

formRouter.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    if (![Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(req.user!.role)) throw AuthForbidden();
    const form = await prisma.administrativeForm.findUnique({ where: { id: req.params.id } });
    if (!form) throw NotFound('فرم');
    // Department experts can only edit forms in their own department
    if (
      [Role.EXPERT, Role.HEAD_OF_DEPARTMENT].includes(req.user!.role) &&
      form.departmentId !== req.user!.departmentId
    ) {
      throw AuthForbidden('این فرم متعلق به گروه شما نیست');
    }
    const data = updateFormSchema.parse(req.body);
    const updated = await prisma.administrativeForm.update({ where: { id: form.id }, data });
    res.json({ success: true, data: updated, requestId: req.requestId });
  }),
);
