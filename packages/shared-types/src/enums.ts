/**
 * @unify/shared-types — Enums
 * Single source of truth for all system enums.
 * Mirrors the Prisma schema exactly.
 */

export enum Role {
  STUDENT = 'STUDENT',
  PROFESSOR = 'PROFESSOR',
  EXPERT = 'EXPERT',
  HEAD_OF_DEPARTMENT = 'HEAD_OF_DEPARTMENT',
  SYSTEM_ADMIN = 'SYSTEM_ADMIN',
  SYSTEM_OWNER = 'SYSTEM_OWNER',
}

export enum Phase {
  ENROLLMENT = 'ENROLLMENT',
  ACTIVE = 'ACTIVE',
  EXAM = 'EXAM',
}

export enum AcademicStatus {
  NORMAL = 'NORMAL',
  CONDITIONAL = 'CONDITIONAL',
  GPA_A = 'GPA_A',
  FINAL_SEMESTER = 'FINAL_SEMESTER',
}

export enum FileType {
  PDF = 'PDF',
  DOCX = 'DOCX',
}

export enum ApprovalStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
}

export enum BadgeType {
  PROFESSOR_BADGE = 'PROFESSOR_BADGE',
  GENERAL_BADGE = 'GENERAL_BADGE',
}

export enum TicketDepartment {
  EDUCATION = 'EDUCATION',
  TECHNICAL = 'TECHNICAL',
  STUDENT_AFFAIRS = 'STUDENT_AFFAIRS',
}

export enum TicketStatus {
  OPEN = 'OPEN',
  IN_PROGRESS = 'IN_PROGRESS',
  ANSWERED = 'ANSWERED',
  CLOSED = 'CLOSED',
}

export enum AuditActionType {
  USER_CREATED = 'USER_CREATED',
  USER_BANNED = 'USER_BANNED',
  USER_UNBANNED = 'USER_UNBANNED',
  ROLE_CHANGED = 'ROLE_CHANGED',
  PASSWORD_RESET = 'PASSWORD_RESET',
  SPECIFICATION_DELETED = 'SPECIFICATION_DELETED',
  SPECIFICATION_EDITED = 'SPECIFICATION_EDITED',
  FILE_DELETED = 'FILE_DELETED',
  FILE_VERSION_UPLOADED = 'FILE_VERSION_UPLOADED',
  PHASE_CHANGED = 'PHASE_CHANGED',
  SEMESTER_CHANGED = 'SEMESTER_CHANGED',
  FILE_REJECTED = 'FILE_REJECTED',
  LOGIN = 'LOGIN',
  LOGOUT = 'LOGOUT',
}

export enum ExamType {
  FINAL = 'FINAL',
  MIDTERM = 'MIDTERM',
}

export enum Day {
  SATURDAY = 'SATURDAY',
  SUNDAY = 'SUNDAY',
  MONDAY = 'MONDAY',
  TUESDAY = 'TUESDAY',
  WEDNESDAY = 'WEDNESDAY',
}

export enum NotificationType {
  CRITICAL_ALERT = 'CRITICAL_ALERT',
  INFO = 'INFO',
  REMINDER = 'REMINDER',
  MESSAGE = 'MESSAGE',
}

export enum MessageSource {
  PROFESSOR_BROADCAST = 'PROFESSOR_BROADCAST',
  PROFESSOR_DIRECT = 'PROFESSOR_DIRECT',
  EXPERT_TARGETED = 'EXPERT_TARGETED',
  ADMIN_TARGETED = 'ADMIN_TARGETED',
  SYSTEM = 'SYSTEM',
  STUDENT_REPLY = 'STUDENT_REPLY',
}

export const PERSIAN_DAY_NAMES: Record<Day, string> = {
  [Day.SATURDAY]: 'شنبه',
  [Day.SUNDAY]: 'یکشنبه',
  [Day.MONDAY]: 'دوشنبه',
  [Day.TUESDAY]: 'سه‌شنبه',
  [Day.WEDNESDAY]: 'چهارشنبه',
};

export const PERSIAN_DAY_ORDER: Day[] = [
  Day.SATURDAY,
  Day.SUNDAY,
  Day.MONDAY,
  Day.TUESDAY,
  Day.WEDNESDAY,
];

export const PERSIAN_PHASE_NAMES: Record<Phase, string> = {
  [Phase.ENROLLMENT]: 'فصل ثبت‌نام',
  [Phase.ACTIVE]: 'فصل فعال',
  [Phase.EXAM]: 'فصل امتحانات',
};

export const PERSIAN_ROLE_NAMES: Record<Role, string> = {
  [Role.STUDENT]: 'دانشجو',
  [Role.PROFESSOR]: 'استاد',
  [Role.EXPERT]: 'کارشناس گروه',
  [Role.HEAD_OF_DEPARTMENT]: 'مدیر گروه',
  [Role.SYSTEM_ADMIN]: 'مدیر سیستم',
  [Role.SYSTEM_OWNER]: 'مدیر ارشد سیستم',
};

export const PERSIAN_STATUS_NAMES: Record<AcademicStatus, string> = {
  [AcademicStatus.NORMAL]: 'عادی',
  [AcademicStatus.CONDITIONAL]: 'مشروط',
  [AcademicStatus.GPA_A]: 'تراز الف',
  [AcademicStatus.FINAL_SEMESTER]: 'ترم آخر',
};

export const PERSIAN_TICKET_DEPT_NAMES: Record<TicketDepartment, string> = {
  [TicketDepartment.EDUCATION]: 'آموزش',
  [TicketDepartment.TECHNICAL]: 'فنی',
  [TicketDepartment.STUDENT_AFFAIRS]: 'امور دانشجویی',
};

export const PERSIAN_TICKET_STATUS: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'باز',
  [TicketStatus.IN_PROGRESS]: 'در حال بررسی',
  [TicketStatus.ANSWERED]: 'پاسخ داده شده',
  [TicketStatus.CLOSED]: 'بسته شده',
};

export const ROLE_CREDIT_LIMITS: Record<AcademicStatus, { min: number; max: number; allowConflict: boolean }> = {
  [AcademicStatus.NORMAL]: { min: 12, max: 20, allowConflict: false },
  [AcademicStatus.CONDITIONAL]: { min: 0, max: 14, allowConflict: false },
  [AcademicStatus.GPA_A]: { min: 0, max: 24, allowConflict: false },
  [AcademicStatus.FINAL_SEMESTER]: { min: 0, max: 24, allowConflict: true },
};

export const CARD_COLORS = [
  { name: 'بنفش', value: '#6366f1' },
  { name: 'آبی', value: '#3b82f6' },
  { name: 'سبز', value: '#10b981' },
  { name: 'نارنجی', value: '#f97316' },
  { name: 'قرمز', value: '#ef4444' },
  { name: 'صورتی', value: '#ec4899' },
  { name: 'فیروزه‌ای', value: '#06b6d4' },
  { name: 'طلایی', value: '#f59e0b' },
] as const;

export type CardColorValue = (typeof CARD_COLORS)[number]['value'];
