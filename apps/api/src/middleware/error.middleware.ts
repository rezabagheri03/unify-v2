/**
 * src/middleware/error.middleware.ts — Central error handler.
 * All errors are returned as APIError envelope (Agent Guide §9.1).
 */

import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { APIError, InternalError, ValidationError } from '../utils/errors';
import { logger } from '../utils/logger';
import { ErrorCode } from '@unify/shared-types';

export function notFoundHandler(req: Request, _res: Response, next: NextFunction): void {
  next(new APIError(ErrorCode.NOT_FOUND, `مسیر یافت نشد: ${req.method} ${req.originalUrl}`, 404));
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  const requestId = req.requestId || 'unknown';

  // ── Zod validation errors ────────────────────────────────────────────────
  if (err instanceof ZodError) {
    const wrapped = ValidationError(err.errors.map((e) => ({
      path: e.path.join('.'),
      message: e.message,
    })));
    logger.warn({ requestId, path: req.path, errors: err.errors }, 'Validation failed');
    res.status(wrapped.statusCode).json({
      success: false,
      error: { code: wrapped.code, message: wrapped.message, details: wrapped.details },
      requestId,
    });
    return;
  }

  // ── Known APIError ───────────────────────────────────────────────────────
  if (err instanceof APIError) {
    if (err.statusCode >= 500) {
      logger.error({ requestId, err: err.message, stack: err.stack }, 'API server error');
    } else {
      logger.warn({ requestId, code: err.code, msg: err.message }, 'API client error');
    }
    res.status(err.statusCode).json({
      success: false,
      error: { code: err.code, message: err.message, details: err.details },
      requestId,
    });
    return;
  }

  // ── Unknown errors ───────────────────────────────────────────────────────
  const wrapped = InternalError(
    err instanceof Error ? err.message : 'خطای ناشناخته',
  );
  logger.error({ requestId, err }, 'Unhandled exception');
  res.status(wrapped.statusCode).json({
    success: false,
    error: { code: wrapped.code, message: wrapped.message },
    requestId,
  });
}

export function asyncHandler<T = unknown>(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<T>,
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}
