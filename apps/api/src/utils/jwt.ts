/**
 * src/utils/jwt.ts — JWT signing/verification.
 */

import jwt from 'jsonwebtoken';
import { config } from '../config';
import { Role } from '@unify/shared-types';

export interface AccessTokenPayload {
  userId: string;
  username: string;
  role: Role;
  departmentId: string | null;
}

export interface RefreshTokenPayload {
  userId: string;
  tokenVersion: number;
}

export function signAccessToken(payload: AccessTokenPayload): string {
  return jwt.sign(payload, config.jwt.accessSecret, {
    expiresIn: config.jwt.accessExpiry,
    issuer: 'unify-platform',
    audience: 'unify-web',
  } as jwt.SignOptions);
}

export function signRefreshToken(payload: RefreshTokenPayload): string {
  return jwt.sign(payload, config.jwt.refreshSecret, {
    expiresIn: config.jwt.refreshExpiry,
    issuer: 'unify-platform',
    audience: 'unify-refresh',
  } as jwt.SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  return jwt.verify(token, config.jwt.accessSecret, {
    issuer: 'unify-platform',
    audience: 'unify-web',
  }) as AccessTokenPayload;
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  return jwt.verify(token, config.jwt.refreshSecret, {
    issuer: 'unify-platform',
    audience: 'unify-refresh',
  }) as RefreshTokenPayload;
}
