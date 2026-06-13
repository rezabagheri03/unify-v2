/**
 * @unify/shared-types — Zod validation schemas
 * Used on BOTH frontend and backend for shared validation rules.
 * Resolution of Agent Guide DECISION 10: password policy enforced here.
 */

import { z } from 'zod';
import {
  Role,
  Phase,
  AcademicStatus,
  FileType,
  ApprovalStatus,
  BadgeType,
  TicketDepartment,
  TicketStatus,
  ExamType,
  Day,
  NotificationType,
  MessageSource,
} from './enums';

// ── Auth ──────────────────────────────────────────────────────────────────
export const passwordSchema = z
  .string()
  .min(8, 'رمز عبور باید حداقل ۸ کاراکتر باشد')
  .max(128, 'رمز عبور نمی‌تواند بیش از ۱۲۸ کاراکتر باشد')
  .refine((v) => /[A-Z]/.test(v), 'رمز عبور باید حداقل یک حرف بزرگ داشته باشد')
  .refine((v) => /[a-z]/.test(v), 'رمز عبور باید حداقل یک حرف کوچک داشته باشد')
  .refine((v) => /[0-9]/.test(v), 'رمز عبور باید حداقل یک عدد داشته باشد')
  .refine((v) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(v), 'رمز عبور باید حداقل یک کاراکتر خاص داشته باشد');

export const usernameSchema = z
  .string()
  .min(3, 'نام کاربری باید حداقل ۳ کاراکتر باشد')
  .max(50, 'نام کاربری نمی‌تواند بیش از ۵۰ کاراکتر باشد')
  .regex(/^[a-zA-Z0-9_-]+$/, 'نام کاربری فقط می‌تواند شامل حروف، اعداد، خط تیره و زیرخط باشد');

export const loginSchema = z.object({
  username: usernameSchema,
  password: z.string().min(1, 'رمز عبور الزامی است'),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'رمز عبور فعلی الزامی است'),
  newPassword: passwordSchema,
});

export const resetPasswordSchema = z.object({
  newPassword: passwordSchema,
});

export const onboardingSchema = z.object({
  firstName: z.string().min(2, 'نام باید حداقل ۲ کاراکتر باشد').max(50),
  lastName: z.string().min(2, 'نام خانوادگی باید حداقل ۲ کاراکتر باشد').max(50),
  themePreference: z.string().max(50).optional(),
  darkMode: z.boolean().optional(),
});

// ── User Management (Owner) ──────────────────────────────────────────────
export const createUserSchema = z.object({
  username: usernameSchema,
  role: z.nativeEnum(Role),
  departmentId: z.string().uuid().optional().nullable(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
});

export const bulkUserRowSchema = z.object({
  username: usernameSchema,
  role: z.nativeEnum(Role),
  departmentCode: z.string().max(20).optional(),
  firstName: z.string().min(2).max(50).optional(),
  lastName: z.string().min(2).max(50).optional(),
});

export const updateRoleSchema = z.object({
  role: z.nativeEnum(Role),
});

export const banUserSchema = z.object({
  isActive: z.boolean(),
});

// ── Academic Structure ────────────────────────────────────────────────────
export const departmentSchema = z.object({
  name: z.string().min(2).max(100),
  code: z.string().min(2).max(20),
});

export const courseSchema = z.object({
  code: z.string().min(2).max(20),
  name: z.string().min(2).max(150),
  credits: z.number().int().min(0).max(10),
  departmentId: z.string().uuid(),
});

export const courseRelationshipSchema = z.object({
  prerequisiteId: z.string().uuid(),
});

export const corequisiteRelationshipSchema = z.object({
  courseBId: z.string().uuid(),
});

const timeString = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'زمان باید به فرمت HH:MM باشد');

export const specificationSchema = z.object({
  courseId: z.string().uuid(),
  professorId: z.string().uuid(),
  semesterId: z.string().uuid(),
  classDays: z.array(z.nativeEnum(Day)).min(1, 'حداقل یک روز برای کلاس الزامی است'),
  classStartTime: timeString,
  classEndTime: timeString,
  classroomLocation: z.string().min(1).max(200),
  telegramLink: z.string().url().optional().nullable(),
  finalExamDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ باید به فرتز شمسی YYYY/MM/DD باشد').optional().nullable(),
  finalExamTime: timeString.optional().nullable(),
  finalExamLocation: z.string().max(200).optional().nullable(),
  midtermExamDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/).optional().nullable(),
  midtermExamTime: timeString.optional().nullable(),
  midtermExamLocation: z.string().max(200).optional().nullable(),
});

export const semesterSchema = z.object({
  name: z.string().min(2).max(50),
  startDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی YYYY/MM/DD'),
  endDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی YYYY/MM/DD'),
});

// ── Resource Hub ──────────────────────────────────────────────────────────
export const resourceUploadSchema = z.object({
  courseId: z.string().uuid(),
  professorId: z.string().uuid(),
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional(),
  notifyStudents: z.boolean().optional().default(false),
});

export const ratingSchema = z.object({
  stars: z.number().int().min(1).max(5),
});

export const stickyNoteSchema = z.object({
  noteText: z.string().min(1).max(2000),
});

export const approvalDecisionSchema = z.object({
  decision: z.enum(['approve', 'reject']),
  badgeType: z.nativeEnum(BadgeType).optional(),
});

// ── Messaging ─────────────────────────────────────────────────────────────
export const broadcastMessageSchema = z.object({
  specificationId: z.string().uuid(),
  content: z.string().min(1).max(5000),
});

export const directMessageSchema = z.object({
  recipientIds: z.array(z.string().uuid()).min(1).max(100),
  content: z.string().min(1).max(5000),
});

export const messageReplySchema = z.object({
  content: z.string().min(1).max(5000),
});

export const messageEditSchema = z.object({
  content: z.string().min(1).max(5000),
});

// ── Tickets ───────────────────────────────────────────────────────────────
export const ticketCreateSchema = z.object({
  department: z.nativeEnum(TicketDepartment),
  content: z.string().min(10, 'متن تیکت باید حداقل ۱۰ کاراکتر باشد').max(5000),
});

export const ticketReplySchema = z.object({
  content: z.string().min(1).max(5000),
});

export const ticketCloseSchema = z.object({
  reason: z.string().max(500).optional(),
});

// ── Scheduler ─────────────────────────────────────────────────────────────
export const schedulerAddSchema = z.object({
  specificationId: z.string().uuid(),
  confirmConflict: z.boolean().optional(),
});

export const goldenScheduleRequestSchema = z.object({
  remainingCourseIds: z.array(z.string().uuid()).min(1).max(30),
  academicStatus: z.nativeEnum(AcademicStatus),
});

// ── Notification ──────────────────────────────────────────────────────────
export const notificationSendSchema = z.object({
  type: z.nativeEnum(NotificationType),
  title: z.string().min(1).max(200),
  body: z.string().min(1).max(2000),
  recipientIds: z.array(z.string().uuid()).min(1).max(1000),
  data: z.record(z.string()).optional(),
  bypassMute: z.boolean().optional().default(false),
});

export const notificationPreferenceSchema = z.object({
  specificationId: z.string().uuid(),
  isMuted: z.boolean(),
});

// ── System State ──────────────────────────────────────────────────────────
export const phaseChangeSchema = z.object({
  phase: z.nativeEnum(Phase),
  reason: z.string().max(500).optional(),
});

export const setCurrentSemesterSchema = z.object({
  semesterId: z.string().uuid(),
});

// ── Curriculum & Utilities ────────────────────────────────────────────────
export const curriculumChartSchema = z.object({
  departmentId: z.string().uuid(),
  entryYear: z.number().int().min(1300).max(1500),
  chartData: z.array(z.object({
    courseCode: z.string(),
    courseName: z.string(),
    credits: z.number().int().min(0).max(10),
    semester: z.number().int().min(1).max(12),
    prerequisites: z.array(z.string()),
    type: z.enum(['REQUIRED', 'ELECTIVE', 'GENERAL']),
  })),
});

export const administrativeFormSchema = z.object({
  departmentId: z.string().uuid().optional().nullable(),
  name: z.string().min(2).max(200),
  description: z.string().min(2).max(1000),
  signatureGuide: z.string().min(2).max(1000),
});

export const academicCalendarEventSchema = z.object({
  title: z.string().min(2).max(200),
  description: z.string().max(2000).optional().nullable(),
  eventDate: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی YYYY/MM/DD'),
});

export const assignmentTaskSchema = z.object({
  title: z.string().min(2).max(200),
  taskType: z.enum(['ASSIGNMENT', 'QUIZ', 'OTHER']),
  courseNote: z.string().max(500).optional().nullable(),
  dueDateShamsi: z.string().regex(/^\d{4}\/\d{2}\/\d{2}$/, 'تاریخ شمسی YYYY/MM/DD'),
  reminderEnabled: z.boolean().optional().default(false),
});

export const noticeBoardSchema = z.object({
  courseId: z.string().uuid(),
  title: z.string().min(2).max(200),
  content: z.string().min(2).max(5000),
});

export const faqSchema = z.object({
  courseId: z.string().uuid(),
  question: z.string().min(2).max(500),
  answer: z.string().min(2).max(5000),
});

// ── Pagination ────────────────────────────────────────────────────────────
export const paginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  order: z.enum(['asc', 'desc']).optional().default('desc'),
});

// ── Card color customization ──────────────────────────────────────────────
export const enrollmentColorSchema = z.object({
  enrollmentId: z.string().uuid(),
  cardColor: z.string().regex(/^#[0-9A-Fa-f]{6}$/, 'کد رنگ نامعتبر است'),
});

// ── Type exports for frontend ─────────────────────────────────────────────
export type LoginInput = z.infer<typeof loginSchema>;
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;
export type OnboardingInput = z.infer<typeof onboardingSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type SpecificationInput = z.infer<typeof specificationSchema>;
export type ResourceUploadInput = z.infer<typeof resourceUploadSchema>;
export type TicketCreateInput = z.infer<typeof ticketCreateSchema>;
export type NotificationSendInput = z.infer<typeof notificationSendSchema>;
export type AssignmentTaskInput = z.infer<typeof assignmentTaskSchema>;
export type CurriculumChartInput = z.infer<typeof curriculumChartSchema>;
