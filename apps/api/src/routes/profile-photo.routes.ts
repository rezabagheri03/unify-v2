/**
 * src/routes/profile-photo.routes.ts — Profile photo upload/delete.
 * Optional feature from Golden Doc §1.2.5.
 * Max size: 5 MB (per Golden Doc §2.3.3 file constraint convention).
 */

import { Router } from 'express';
import path from 'path';
import fs from 'fs';
import multer from 'multer';
import type { MulterError } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { BadRequest } from '../utils/errors';
import { config } from '../config';

export const profilePhotoRouter = Router();
profilePhotoRouter.use(authenticateToken, requireOnboardingComplete);

// Profile photo: 5MB max, images only
const PROFILE_PHOTO_MAX_BYTES = 5 * 1024 * 1024;

const photoStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(config.storage.basePath, 'photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

const photoUpload = multer({
  storage: photoStorage,
  limits: { fileSize: PROFILE_PHOTO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowed.includes(file.mimetype)) {
      return cb(new MulterError('LIMIT_UNEXPECTED_FILE', 'فقط JPEG, PNG, WebP مجاز است'));
    }
    cb(null, true);
  },
});

profilePhotoRouter.post(
  '/me/photo',
  photoUpload.single('photo'),
  asyncHandler(async (req, res) => {
    if (!req.file) throw BadRequest('فایل تصویر الزامی است');
    const url = `/api/files/photos/${req.file.filename}`;

    // Clear previous photo reference and append new one
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const oldInfo = (user?.supplementaryInfo || '').replace(/PHOTO_URL:[^\s]+/g, '').trim();
    const newInfo = `${oldInfo} PHOTO_URL:${url}`.trim();

    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { supplementaryInfo: newInfo },
    });

    res.json({ success: true, data: { photoUrl: url }, requestId: req.requestId });
  }),
);

profilePhotoRouter.delete(
  '/me/photo',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const info = user?.supplementaryInfo || '';
    const match = info.match(/PHOTO_URL:([^\s]+)/);
    if (match) {
      // Don't fail if file doesn't exist
      try {
        const filePath = path.join(config.storage.basePath, match[1].replace(/^\/?api\/files\//, ''));
        if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
      } catch { /* ignore */ }
      await prisma.user.update({
        where: { id: req.user!.userId },
        data: { supplementaryInfo: info.replace(/PHOTO_URL:[^\s]+/, '').trim() },
      });
    }
    res.json({ success: true, data: { message: 'حذف شد' }, requestId: req.requestId });
  }),
);
