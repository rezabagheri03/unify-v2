/**
 * src/app.ts — Express app assembly.
 * Wires all middleware, routes, error handlers.
 */

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import path from 'path';

import { config } from './config';
import { logger } from './utils/logger';
import { prisma } from './prisma/prisma.client';
import { requestIdMiddleware } from './utils/request-id';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { generalApiRateLimiter } from './middleware/rate-limit.middleware';
import { csrfProtection, issueCsrfToken } from './middleware/csrf.middleware';

// Route imports
import { authRouter } from './routes/auth.routes';
import { onboardingRouter } from './routes/onboarding.routes';
import { systemStateRouter } from './routes/system-state.routes';
import { userRouter } from './routes/user.routes';
import { schedulerRouter } from './routes/scheduler.routes';
import { resourceRouter } from './routes/resource.routes';
import { ticketRouter } from './routes/ticket.routes';
import { messageRouter } from './routes/message.routes';
import { inboxRouter } from './routes/inbox.routes';
import { notificationRouter } from './routes/notification.routes';
import { curriculumRouter } from './routes/curriculum.routes';
import { formRouter } from './routes/form.routes';
import { calendarRouter } from './routes/calendar.routes';
import { assignmentRouter } from './routes/assignment.routes';
import { noticeBoardRouter } from './routes/notice-board.routes';
import { faqRouter } from './routes/faq.routes';
import { adminRouter } from './routes/admin.routes';
import { expertRouter } from './routes/expert.routes';
import { headRouter } from './routes/head.routes';
import { professorRouter } from './routes/professor.routes';
import { ownerRouter } from './routes/owner.routes';
import { auditRouter } from './routes/audit.routes';
import { analyticsRouter } from './routes/analytics.routes';
import { fileRouter } from './routes/file.routes';
import { departmentRouter } from './routes/department.routes';
import { pendingApprovalRouter } from './routes/pending-approval.routes';
import { syllabusRouter } from './routes/syllabus.routes';
import { openApiRouter } from './routes/openapi.routes';
import { profilePhotoRouter } from './routes/profile-photo.routes';
import { cancelledNoticesRouter } from './routes/cancelled-notices.routes';

export function createApp(): express.Application {
  const app = express();

  // ── Security & parsing ───────────────────────────────────────────────────
  app.set('trust proxy', 1);
  app.use(helmet({
    contentSecurityPolicy: config.isProduction ? undefined : false,
    crossOriginEmbedderPolicy: false,
  }));
  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || config.cors.allowedOrigins.includes(origin)) {
        return cb(null, true);
      }
      cb(new Error('CORS: origin not allowed'));
    },
    credentials: true,
    methods: ['GET', 'POST', 'PATCH', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Request-Id'],
  }));
  app.use(compression());
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));
  app.use(cookieParser());
  app.use(requestIdMiddleware);
  app.use(issueCsrfToken); // Issues CSRF cookie on first visit

  // ── Logging ──────────────────────────────────────────────────────────────
  app.use(morgan(config.isDevelopment ? 'dev' : 'combined', {
    stream: { write: (msg) => logger.info(msg.trim()) },
    skip: (req) => req.path === '/api/health',
  }));

  // ── Health check (public) ────────────────────────────────────────────────
  app.get('/api/health', async (_req, res) => {
    const checks: Record<string, { status: string; latencyMs?: number; error?: string }> = {};
    let healthy = true;

    // Check DB
    const dbStart = Date.now();
    try {
      await prisma.$queryRaw`SELECT 1`;
      checks.database = { status: 'ok', latencyMs: Date.now() - dbStart };
    } catch (err) {
      healthy = false;
      checks.database = { status: 'error', error: err instanceof Error ? err.message : 'unknown' };
    }

    // Check Redis
    const redisStart = Date.now();
    try {
      const { default: IORedis } = await import('ioredis');
      const r = new IORedis(config.redisUrl, { lazyConnect: true, connectTimeout: 2000 });
      await r.connect();
      await r.ping();
      await r.quit();
      checks.redis = { status: 'ok', latencyMs: Date.now() - redisStart };
    } catch (err) {
      checks.redis = { status: 'error', error: err instanceof Error ? err.message : 'unknown' };
    }

    res.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'unify-api',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks,
    });
  });

  // OpenAPI spec
  app.use('/api/openapi', openApiRouter);

  // ── Static files (logo only as public per Agent Guide §10.3) ─────────────
  app.use('/api/files/logo', express.static(path.join(config.storage.basePath, 'logos')));

  // ── Rate limit (general) ─────────────────────────────────────────────────
  app.use('/api', generalApiRateLimiter);

  // ── CSRF protection (skip for safe methods & auth) ───────────────────────
  app.use('/api', (req, res, next) => {
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
    if (req.path.startsWith('/api/auth/login') || req.path.startsWith('/api/auth/refresh')) return next();
    if (req.path.startsWith('/api/health') || req.path.startsWith('/api/files/logo')) return next();
    csrfProtection(req, res, next);
  });

  // ── Public routes ────────────────────────────────────────────────────────
  app.use('/api/auth', authRouter);
  app.use('/api/files', fileRouter);

  // Public template downloads (Golden Doc §3.6.2 — Owner bulk upload template)
  app.get('/api/templates/user-bulk-upload.xlsx', (_req, res) => {
    const path = require('path');
    const fs = require('fs');
    const filePath = path.join(config.storage.basePath, 'exports', 'user-bulk-upload-template.xlsx');
    if (!fs.existsSync(filePath)) {
      res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'فایل نمونه یافت نشد' }, requestId: 'n/a' });
      return;
    }
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="user-bulk-upload-template.xlsx"');
    fs.createReadStream(filePath).pipe(res);
  });

  app.use('/api/departments', departmentRouter);

  // ── Onboarding (authenticated but exempt from full onboarding gate) ──────
  app.use('/api/onboarding', onboardingRouter);

  // ── Authenticated routes ─────────────────────────────────────────────────
  app.use('/api/system', systemStateRouter);
  app.use('/api/users', userRouter);
  app.use('/api/profile', profilePhotoRouter);
  app.use('/api/scheduler', schedulerRouter);
  app.use('/api/resources', resourceRouter);
  app.use('/api/tickets', ticketRouter);
  app.use('/api/messages', messageRouter);
  app.use('/api/inbox', inboxRouter);
  app.use('/api/notifications', notificationRouter);
  app.use('/api/cancelled-notices', cancelledNoticesRouter);
  app.use('/api/curriculum', curriculumRouter);
  app.use('/api/forms', formRouter);
  app.use('/api/calendar', calendarRouter);
  app.use('/api/assignments', assignmentRouter);
  app.use('/api/notices', noticeBoardRouter);
  app.use('/api/faq', faqRouter);
  app.use('/api/pending', pendingApprovalRouter);
  app.use('/api/syllabus', syllabusRouter);

  // ── Staff panels ─────────────────────────────────────────────────────────
  app.use('/api/admin', adminRouter);
  app.use('/api/expert', expertRouter);
  app.use('/api/head', headRouter);
  app.use('/api/professor', professorRouter);

  // ── Owner-only ───────────────────────────────────────────────────────────
  app.use('/api/owner', ownerRouter);
  app.use('/api/owner/audit', auditRouter);
  app.use('/api/owner/analytics', analyticsRouter);

  // ── 404 + Error handler (must be last) ───────────────────────────────────
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
