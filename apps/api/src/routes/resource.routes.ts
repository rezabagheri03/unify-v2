/**
 * src/routes/resource.routes.ts — Resource Hub HTTP endpoints.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { uploadResource, toPublicFileUrl } from '../middleware/upload.middleware';
import { resourceService } from '../services/resource.service';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { prisma } from '../prisma/prisma.client';
import path from 'path';
import { config } from '../config';
import fs from 'fs';
import { BadRequest } from '../utils/errors';

export const resourceRouter = Router();
resourceRouter.use(authenticateToken, requireOnboardingComplete);

resourceRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const { courseId, professorId, sort } = req.query;
    if (!courseId || !professorId) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'courseId و professorId الزامی است' }, requestId: req.requestId });
      return;
    }
    const files = await resourceService.list(
      courseId as string,
      professorId as string,
      req.user!.userId,
      req.user!.role,
      (sort as string) || 'newest',
    );
    res.json({ success: true, data: { files }, requestId: req.requestId });
  }),
);

resourceRouter.post(
  '/upload',
  uploadResource.single('file'),
  asyncHandler(async (req, res) => {
    const { courseId, professorId, title, description, notifyStudents } = req.body;
    if (!courseId || !professorId || !title || !req.file) {
      res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'courseId, professorId, title, file الزامی است' }, requestId: req.requestId });
      return;
    }
    if (req.user!.role === Role.PROFESSOR) {
      const created = await resourceService.uploadProfessorFile(
        req.user!.userId,
        courseId,
        professorId,
        title,
        description,
        req.file,
        notifyStudents === 'true',
      );
      res.json({ success: true, data: { fileId: created.id, status: 'published' }, requestId: req.requestId });
    } else if (req.user!.role === Role.STUDENT) {
      const created = await resourceService.uploadStudentFile(
        req.user!.userId,
        courseId,
        professorId,
        title,
        description,
        req.file,
      );
      res.json({ success: true, data: { fileId: created.id, status: 'pending' }, requestId: req.requestId });
    } else {
      res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'شما اجازه آپلود ندارید' }, requestId: req.requestId });
    }
  }),
);

resourceRouter.post(
  '/:fileId/new-version',
  uploadResource.single('file'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw BadRequest('فایل الزامی است');
    const updated = await resourceService.uploadNewVersion(req.user!.userId, req.user!.role, req.params.fileId, req.file);
    res.json({ success: true, data: { fileId: updated.id, version: updated.versionNumber }, requestId: req.requestId });
  }),
);

const rateSchema = z.object({ stars: z.number().int().min(1).max(5) });
resourceRouter.post(
  '/:fileId/rate',
  asyncHandler(async (req, res) => {
    const { stars } = rateSchema.parse(req.body);
    const result = await resourceService.rateFile(req.user!.userId, req.params.fileId, stars);
    res.json({ success: true, data: result, requestId: req.requestId });
  }),
);

const noteSchema = z.object({ noteText: z.string().min(1).max(2000) });
resourceRouter.post(
  '/:fileId/sticky-note',
  asyncHandler(async (req, res) => {
    const { noteText } = noteSchema.parse(req.body);
    const note = await resourceService.setStickyNote(req.user!.userId, req.params.fileId, noteText);
    res.json({ success: true, data: { noteId: note.id }, requestId: req.requestId });
  }),
);

const approveSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  badgeType: z.enum(['PROFESSOR_BADGE', 'GENERAL_BADGE']).optional(),
});

resourceRouter.patch(
  '/:fileId/approve',
  asyncHandler(async (req, res) => {
    const { decision, badgeType } = approveSchema.parse(req.body);
    await resourceService.approveFile(req.user!.userId, req.user!.role, req.params.fileId, decision, badgeType);
    res.json({ success: true, data: { message: 'بررسی انجام شد' }, requestId: req.requestId });
  }),
);

resourceRouter.delete(
  '/:fileId',
  asyncHandler(async (req, res) => {
    await resourceService.hardDeleteFile(req.user!.userId, req.user!.role, req.params.fileId);
    res.json({ success: true, data: { message: 'فایل حذف شد' }, requestId: req.requestId });
  }),
);

resourceRouter.get(
  '/pending',
  asyncHandler(async (req, res) => {
    const files = await resourceService.listPending(req.user!.userId, req.user!.role, req.user!.departmentId);
    res.json({ success: true, data: { files }, requestId: req.requestId });
  }),
);

resourceRouter.get(
  '/:fileId/download',
  asyncHandler(async (req, res) => {
    const file = await prisma.resourceFile.findUnique({ where: { id: req.params.fileId } });
    if (!file || file.approvalStatus !== 'APPROVED') {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'یافت نشد' }, requestId: req.requestId });
      return;
    }
    if (!fs.existsSync(file.filePath)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'فایل فیزیکی یافت نشد' }, requestId: req.requestId });
      return;
    }

    // Track download for Golden Doc §3.6.5 Download Metrics
    try {
      await prisma.resourceDownload.create({
        data: {
          resourceFileId: file.id,
          studentId: req.user?.userId,
          ipAddress: req.ip || null,
          userAgent: req.headers['user-agent']?.substring(0, 500) || null,
        },
      });
    } catch {
      // Tracking failure shouldn't block download
    }

    const stat = fs.statSync(file.filePath);
    res.setHeader('Content-Length', String(stat.size));
    res.setHeader('Content-Type', file.fileType === 'PDF' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.title)}.${file.fileType.toLowerCase()}"`);
    fs.createReadStream(file.filePath).pipe(res);
  }),
);
