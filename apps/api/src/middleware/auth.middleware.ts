/**
 * src/middleware/auth.middleware.ts — JWT authentication.
 * Verifies access token and attaches req.user.
 */

import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt';
import { AuthTokenExpired, AuthForbidden } from '../utils/errors';
import { Role } from '@unify/shared-types';

declare global {
  namespace Express {
    interface Request {
      user?: {
        userId: string;
        username: string;
        role: Role;
        departmentId: string | null;
      };
    }
  }
}

export function authenticateToken(req: Request, _res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next(AuthForbidden('توکن احراز هویت ارائه نشده است'));
  }

  const token = authHeader.substring(7);
  try {
    const payload = verifyAccessToken(token);
    req.user = {
      userId: payload.userId,
      username: payload.username,
      role: payload.role,
      departmentId: payload.departmentId,
    };
    next();
  } catch (err) {
    if (err instanceof Error && (err.name === 'TokenExpiredError' || err.name === 'JsonWebTokenError')) {
      return next(AuthTokenExpired());
    }
    return next(AuthForbidden('توکن نامعتبر است'));
  }
}
