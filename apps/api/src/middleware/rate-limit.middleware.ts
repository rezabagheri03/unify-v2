/**
 * src/middleware/rate-limit.middleware.ts — Rate limiters.
 * Agent Guide Rule: Login 5/min, upload 10/min, messaging 30/min.
 */

import rateLimit from 'express-rate-limit';
import { config } from '../config';

export const loginRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.loginMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: {
        code: 'QUOTA_EXCEEDED',
        message: 'تعداد تلاش‌های ناموفق شما بیش از حد مجاز است. لطفاً یک دقیقه صبر کنید.',
      },
      requestId: 'n/a',
    });
  },
  message: 'Too many login attempts',
});

export const uploadRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.uploadMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'QUOTA_EXCEEDED', message: 'تعداد آپلودهای شما در این دقیقه بیش از حد مجاز است.' },
      requestId: 'n/a',
    });
  },
});

export const messageRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.messageMax,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  handler: (_req, res) => {
    res.status(429).json({
      success: false,
      error: { code: 'QUOTA_EXCEEDED', message: 'تعداد پیام‌های شما در این دقیقه بیش از حد مجاز است.' },
      requestId: 'n/a',
    });
  },
});

export const generalApiRateLimiter = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.userId || req.ip || 'unknown',
  skip: (req) => req.path === '/api/health' || req.path === '/api/auth/login',
});
