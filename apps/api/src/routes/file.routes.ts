/**
 * src/routes/file.routes.ts — File download (authenticated endpoint, Agent Guide §6.5).
 * Never exposes raw filesystem paths.
 */

import { Router, Request, Response } from 'express';
import path from 'path';
import fs from 'fs';
import { authenticateToken } from '../middleware/auth.middleware';
import { config } from '../config';
import { NotFound } from '../utils/errors';
import { logger } from '../utils/logger';

export const fileRouter = Router();

// /api/files/logo — public (already mounted in app.ts)
// /api/files/* — authenticated

fileRouter.use(authenticateToken);

fileRouter.get('/*', (req: Request, res: Response) => {
  const relative = req.params[0];
  if (!relative || relative.includes('..')) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'مسیر نامعتبر' }, requestId: req.requestId });
    return;
  }

  const fullPath = path.join(config.storage.basePath, relative);
  const resolved = path.resolve(fullPath);
  const baseResolved = path.resolve(config.storage.basePath);
  if (!resolved.startsWith(baseResolved)) {
    res.status(403).json({ success: false, error: { code: 'AUTH_FORBIDDEN', message: 'دسترسی غیرمجاز' }, requestId: req.requestId });
    return;
  }

  if (!fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'فایل یافت نشد' }, requestId: req.requestId });
    return;
  }

  const stat = fs.statSync(resolved);
  res.setHeader('Content-Length', String(stat.size));
  res.setHeader('Content-Disposition', `inline; filename="${path.basename(resolved)}"`);
  const stream = fs.createReadStream(resolved);
  stream.on('error', (err) => {
    logger.error({ err }, 'File stream error');
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'خطا در خواندن فایل' }, requestId: req.requestId });
    }
  });
  stream.pipe(res);
});
