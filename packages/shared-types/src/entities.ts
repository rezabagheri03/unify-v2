/**
 * @unify/shared-types — Entity interfaces
 * Mirror Prisma models. Use these in services / UI for typed contracts.
 */

import type {
  Role,
  Phase,
  AcademicStatus,
  FileType,
  ApprovalStatus,
  BadgeType,
  TicketDepartment,
  TicketStatus,
  AuditActionType,
  ExamType,
  Day,
  NotificationType,
  MessageSource,
} from './enums';

// ── Auth & Users ──────────────────────────────────────────────────────────
export interface User {
  id: string;
  username: string;
  role: Role;
  isActive: boolean;
  onboardingComplete: boolean;
  firstName: string | null;
  lastName: string | null;
  themePreference: string;
  darkMode: boolean;
  supplementaryInfo: string | null;
  departmentId: string | null;
  createdAt: Date;
  updatedAt: Date;
  lastLoginAt: Date | null;
}

export interface PublicUser {
  id: string;
  username: string;
  role: Role;
  firstName: string | null;
  lastName: string | null;
  departmentId: string | null;
  onboardingComplete: boolean;
}

// ── Academic Structure ────────────────────────────────────────────────────
export interface Department {
  id: string;
  name: string;
  code: string;
  createdAt: Date;
}

export interface Course {
  id: string;
  code: string;
  name: string;
  credits: number;
  departmentId: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseRelationship {
  id: string;
  courseId: string;
  prerequisiteId: string;
}

export interface CorequisiteRelationship {
  id: string;
  courseAId: string;
  courseBId: string;
}

export interface Semester {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  isCurrent: boolean;
  currentPhase: Phase;
  phaseSwitchedAt: Date;
  createdAt: Date;
}

export interface CourseSpecification {
  id: string;
  courseId: string;
  professorId: string;
  semesterId: string;
  classDays: Day[];
  classStartTime: string;
  classEndTime: string;
  classroomLocation: string;
  telegramLink: string | null;
  finalExamDate: Date | null;
  finalExamTime: string | null;
  finalExamLocation: string | null;
  midtermExamDate: Date | null;
  midtermExamTime: string | null;
  midtermExamLocation: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface Enrollment {
  id: string;
  studentId: string;
  specificationId: string;
  isTemporary: boolean;
  enrolledAt: Date;
}

// ── Resource Hub ──────────────────────────────────────────────────────────
export interface ResourceFile {
  id: string;
  courseId: string;
  professorId: string;
  title: string;
  description: string | null;
  filePath: string;
  fileType: FileType;
  fileSizeBytes: number;
  versionNumber: number;
  uploadedById: string;
  uploaderRole: Role;
  approvalStatus: ApprovalStatus;
  approvedById: string | null;
  badgeType: BadgeType | null;
  approvedAt: Date | null;
  averageRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Rating {
  id: string;
  resourceFileId: string;
  studentId: string;
  stars: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface StickyNote {
  id: string;
  resourceFileId: string;
  studentId: string;
  noteText: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Messaging ─────────────────────────────────────────────────────────────
export interface Message {
  id: string;
  senderId: string;
  content: string;
  isEdited: boolean;
  editedAt: Date | null;
  specificationId: string | null;
  parentMessageId: string | null;
  source: MessageSource;
  createdAt: Date;
  updatedAt: Date;
}

export interface MessageRecipient {
  id: string;
  messageId: string;
  recipientId: string;
  isRead: boolean;
  readAt: Date | null;
  createdAt: Date;
}

// ── Ticketing ─────────────────────────────────────────────────────────────
export interface Ticket {
  id: string;
  studentId: string;
  department: TicketDepartment;
  content: string;
  imageUrl: string | null;
  status: TicketStatus;
  isEscalated: boolean;
  escalatedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface TicketReply {
  id: string;
  ticketId: string;
  senderId: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: Date;
}

// ── Curriculum & Utilities ────────────────────────────────────────────────
export interface CurriculumChart {
  id: string;
  departmentId: string;
  entryYear: number;
  chartData: CurriculumChartNode[];
  isPublished: boolean;
  uploadedById: string;
  approvedById: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface CurriculumChartNode {
  courseCode: string;
  courseName: string;
  credits: number;
  semester: number;
  prerequisites: string[];
  type: 'REQUIRED' | 'ELECTIVE' | 'GENERAL';
}

export interface AdministrativeForm {
  id: string;
  departmentId: string | null;
  name: string;
  description: string;
  signatureGuide: string;
  filePath: string;
  uploadedById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface AcademicCalendarEvent {
  id: string;
  title: string;
  description: string | null;
  eventDate: Date;
  createdById: string;
  createdAt: Date;
}

export interface AssignmentTask {
  id: string;
  studentId: string;
  title: string;
  taskType: string;
  courseNote: string | null;
  dueDateShamsi: string;
  dueDateUtc: Date;
  reminderEnabled: boolean;
  reminderSent: boolean;
  createdAt: Date;
}

export interface NotificationPreference {
  id: string;
  studentId: string;
  specificationId: string;
  isMuted: boolean;
}

// ── Audit ─────────────────────────────────────────────────────────────────
export interface AuditLog {
  id: string;
  timestampUtc: Date;
  timestampShamsi: string;
  actorId: string;
  actorRole: Role;
  actionType: AuditActionType;
  targetEntityType: string;
  targetEntityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}

// ── Notice Board & FAQ ────────────────────────────────────────────────────
export interface NoticeBoard {
  id: string;
  professorId: string;
  courseId: string;
  title: string;
  content: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CourseFAQ {
  id: string;
  professorId: string;
  courseId: string;
  question: string;
  answer: string;
  createdAt: Date;
  updatedAt: Date;
}

// ── Notification ──────────────────────────────────────────────────────────
export interface NotificationPayload {
  type: NotificationType;
  title: string;
  body: string;
  recipientIds: string[];
  data?: Record<string, string>;
  bypassMute?: boolean;
}

// ── System State ──────────────────────────────────────────────────────────
export interface SystemState {
  currentSemester: Semester | null;
  currentPhase: Phase;
  gracePeriodEndsAt: Date | null;
}
