/**
 * src/config.ts — Centralized typed config. Reads from process.env once at boot.
 * Fail fast on missing critical vars (Agent Guide Rule 6: resolve before code).
 */

import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

function required(name: string): string {
  const v = process.env[name];
  if (!v || v.trim() === '') {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return v;
}

function optional(name: string, fallback: string): string {
  return process.env[name] || fallback;
}

function intEnv(name: string, fallback: number): number {
  const v = process.env[name];
  if (!v) return fallback;
  const n = parseInt(v, 10);
  if (isNaN(n)) throw new Error(`Env var ${name} must be an integer. Got: "${v}"`);
  return n;
}

export const config = {
  env: optional('NODE_ENV', 'development'),
  isProduction: optional('NODE_ENV', 'development') === 'production',
  isDevelopment: optional('NODE_ENV', 'development') === 'development',

  apiPort: intEnv('API_PORT', 3001),
  frontendUrl: optional('FRONTEND_URL', 'http://localhost:3000'),
  apiBaseUrl: optional('API_BASE_URL', 'http://localhost:3001'),

  databaseUrl: required('DATABASE_URL'),
  redisUrl: required('REDIS_URL'),

  jwt: {
    accessSecret: required('JWT_ACCESS_SECRET'),
    refreshSecret: required('JWT_REFRESH_SECRET'),
    accessExpiry: optional('JWT_ACCESS_EXPIRY', '1h'),
    refreshExpiry: optional('JWT_REFRESH_EXPIRY', '7d'),
  },

  bcrypt: {
    costFactor: intEnv('BCRYPT_COST_FACTOR', 12),
  },

  storage: {
    basePath: optional('STORAGE_BASE_PATH', './storage'),
    maxFileSizeBytes: intEnv('MAX_FILE_SIZE_BYTES', 52_428_800), // 50MB
    maxTicketImageSizeBytes: intEnv('MAX_TICKET_IMAGE_SIZE_BYTES', 5_242_880), // 5MB
    studentDailyUploadQuota: intEnv('STUDENT_DAILY_UPLOAD_QUOTA', 5),
    maxTicketImages: intEnv('MAX_TICKET_IMAGES', 3),
  },

  pushe: {
    appId: optional('PUSHE_APP_ID', ''),
    apiKey: optional('PUSHE_API_KEY', ''),
    apiUrl: optional('PUSHE_API_URL', 'https://api.pushe.co/v2'),
    enabled: Boolean(process.env.PUSHE_APP_ID && process.env.PUSHE_API_KEY),
  },

  rateLimit: {
    windowMs: intEnv('RATE_LIMIT_WINDOW_MS', 60_000),
    loginMax: intEnv('RATE_LIMIT_LOGIN_MAX', 5),
    uploadMax: intEnv('RATE_LIMIT_UPLOAD_MAX', 10),
    messageMax: intEnv('RATE_LIMIT_MESSAGE_MAX', 30),
  },

  cors: {
    allowedOrigins: optional('ALLOWED_ORIGINS', 'http://localhost:3000').split(',').map((s) => s.trim()),
  },

  seed: {
    ownerUsername: optional('SEED_OWNER_USERNAME', 'owner'),
    ownerPassword: process.env.SEED_OWNER_PASSWORD || 'ChangeThisOnFirstLogin!1',
  },

  ticket: {
    escalationHours: 48,
    gracePeriodHours: 24,
    cancelledNoticeTtlDays: 7,
  },

  logLevel: optional('LOG_LEVEL', 'info'),
  timezone: optional('TZ', 'Asia/Tehran'),
} as const;

// Validation: JWT secrets must be long enough (Agent Guide Rule: minimum 64 chars)
if (config.jwt.accessSecret.length < 64) {
  console.warn(
    '\n⚠️  WARNING: JWT_ACCESS_SECRET is shorter than 64 characters.\n' +
      '   This is a SECURITY risk. Generate a new one with: openssl rand -base64 64\n',
  );
}
if (config.jwt.refreshSecret.length < 64) {
  console.warn(
    '\n⚠️  WARNING: JWT_REFRESH_SECRET is shorter than 64 characters.\n' +
      '   This is a SECURITY risk. Generate a new one with: openssl rand -base64 64\n',
  );
}
