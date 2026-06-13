/**
 * src/middleware/csrf.middleware.ts — CSRF protection for state-changing operations.
 * Uses double-submit cookie pattern (Agent Guide §F.2).
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { AuthForbidden } from '../utils/errors';

const CSRF_COOKIE = 'unify-csrf';
const CSRF_HEADER = 'x-csrf-token';
const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export function csrfProtection(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.includes(req.method)) {
    return next();
  }

  const cookieToken = (req as Request & { cookies?: Record<string, string> }).cookies?.[CSRF_COOKIE];
  const headerToken = req.headers[CSRF_HEADER] as string | undefined;

  if (!cookieToken || !headerToken || cookieToken !== headerToken) {
    return next(AuthForbidden('توکن CSRF نامعتبر است'));
  }

  next();
}

/** Middleware to issue a CSRF cookie on first visit. */
export function issueCsrfToken(req: Request, res: Response, next: NextFunction): void {
  const cookies = (req as Request & { cookies?: Record<string, string> }).cookies || {};
  if (!cookies[CSRF_COOKIE]) {
    const token = uuidv4();
    res.cookie(CSRF_COOKIE, token, {
      httpOnly: false, // Must be readable by JS
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production',
    });
  }
  next();
}
