/**
 * src/utils/errors.ts — Standard API errors per Agent Guide §9.1.
 */

import { ErrorCodeValue, ErrorCode } from '@unify/shared-types';

export class APIError extends Error {
  public readonly code: ErrorCodeValue;
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(code: ErrorCodeValue, message: string, statusCode: number, details?: unknown) {
    super(message);
    this.code = code;
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'APIError';
  }
}

// ── Convenience constructors ──────────────────────────────────────────────
export const AuthInvalidCredentials = (msg = 'نام کاربری یا رمز عبور اشتباه است') =>
  new APIError(ErrorCode.AUTH_INVALID_CREDENTIALS, msg, 401);

export const AuthTokenExpired = (msg = 'توکن منقضی شده است') =>
  new APIError(ErrorCode.AUTH_TOKEN_EXPIRED, msg, 401);

export const AuthForbidden = (msg = 'شما دسترسی لازم را ندارید') =>
  new APIError(ErrorCode.AUTH_FORBIDDEN, msg, 403);

export const UserNotFound = (username: string) =>
  new APIError(ErrorCode.USER_NOT_FOUND, `کاربر یافت نشد: ${username}`, 404);

export const NotFound = (entity = 'منبع') =>
  new APIError(ErrorCode.NOT_FOUND, `${entity} یافت نشد`, 404);

export const ValidationError = (details: unknown, msg = 'داده‌های ورودی نامعتبر است') =>
  new APIError(ErrorCode.VALIDATION_ERROR, msg, 422, details);

export const QuotaExceeded = (msg = 'سهمیه شما تمام شده است') =>
  new APIError(ErrorCode.QUOTA_EXCEEDED, msg, 429);

export const Conflict = (msg = 'تعارض در داده‌ها') =>
  new APIError(ErrorCode.CONFLICT, msg, 409);

export const EnrollmentTimeConflict = (msg = 'تعارض زمانی با درس دیگر') =>
  new APIError(ErrorCode.ENROLLMENT_TIME_CONFLICT, msg, 409);

export const EnrollmentCreditExceeded = (msg = 'تعداد واحدها از حد مجاز بیشتر است') =>
  new APIError(ErrorCode.ENROLLMENT_CREDIT_EXCEEDED, msg, 409);

export const EnrollmentPhaseClosed = (msg = 'فصل ثبت‌نام بسته شده است') =>
  new APIError(ErrorCode.ENROLLMENT_PHASE_CLOSED, msg, 403);

export const FileTypeInvalid = (msg = 'نوع فایل مجاز نیست') =>
  new APIError(ErrorCode.FILE_TYPE_INVALID, msg, 422);

export const FileSizeExceeded = (msg = 'حجم فایل بیش از حد مجاز است') =>
  new APIError(ErrorCode.FILE_SIZE_EXCEEDED, msg, 422);

export const DepartmentAccessDenied = (msg = 'دسترسی به این گروه آموزشی ندارید') =>
  new APIError(ErrorCode.DEPARTMENT_ACCESS_DENIED, msg, 403);

export const InternalError = (msg = 'خطای داخلی سرور') =>
  new APIError(ErrorCode.INTERNAL_ERROR, msg, 500);

export const BadRequest = (msg = 'درخواست نامعتبر') =>
  new APIError(ErrorCode.BAD_REQUEST, msg, 400);
