/**
 * @unify/shared-types — API request/response envelopes
 */

export interface APIError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId: string;
}

export interface APISuccess<T> {
  success: true;
  data: T;
  requestId: string;
}

export type APIResponse<T> = APISuccess<T> | APIError;

// ── Standard error codes (Agent Guide §9.1) ───────────────────────────────
export const ErrorCode = {
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_FORBIDDEN: 'AUTH_FORBIDDEN',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  QUOTA_EXCEEDED: 'QUOTA_EXCEEDED',
  CONFLICT: 'CONFLICT',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  ENROLLMENT_TIME_CONFLICT: 'ENROLLMENT_TIME_CONFLICT',
  ENROLLMENT_CREDIT_EXCEEDED: 'ENROLLMENT_CREDIT_EXCEEDED',
  ENROLLMENT_PHASE_CLOSED: 'ENROLLMENT_PHASE_CLOSED',
  FILE_TYPE_INVALID: 'FILE_TYPE_INVALID',
  FILE_SIZE_EXCEEDED: 'FILE_SIZE_EXCEEDED',
  NOT_FOUND: 'NOT_FOUND',
  BAD_REQUEST: 'BAD_REQUEST',
  DEPARTMENT_ACCESS_DENIED: 'DEPARTMENT_ACCESS_DENIED',
} as const;
export type ErrorCodeValue = (typeof ErrorCode)[keyof typeof ErrorCode];

// ── Auth endpoints ─────────────────────────────────────────────────────────
export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  refreshToken: string;
  role: string;
  onboardingComplete: boolean;
  user: {
    id: string;
    username: string;
    firstName: string | null;
    lastName: string | null;
    role: string;
    themePreference: string;
    darkMode: boolean;
    departmentId: string | null;
  };
}

export interface RefreshRequest {
  refreshToken: string;
}

export interface RefreshResponse {
  accessToken: string;
}

// ── Date envelope (Agent Guide §6.4) ──────────────────────────────────────
export interface DateEnvelope {
  dateUtc: string;
  dateShamsi: string;
}

// ── Pagination envelope ───────────────────────────────────────────────────
export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

// ── Scheduler response ─────────────────────────────────────────────────────
export interface SchedulerStateResponse {
  phase: string;
  semesterName: string;
  semesterStartDate: DateEnvelope;
  semesterEndDate: DateEnvelope;
  gracePeriodEndsAt: DateEnvelope | null;
  academicStatus: string;
  currentEnrollments: number;
  temporaryEnrollments: number;
  totalCredits: number;
  maxCredits: number;
}

export interface SpecSearchResult {
  specificationId: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  credits: number;
  professorName: string;
  classDays: string[];
  classStartTime: string;
  classEndTime: string;
  classroomLocation: string;
  finalExamDate: DateEnvelope | null;
  finalExamTime: string | null;
  isAlreadyAdded: boolean;
  isAlreadyEnrolledFinal: boolean;
}

export interface AddToTempListResponse {
  success: boolean;
  warnings: string[];
  errors: string[];
  enrollmentId?: string;
}

export interface GoldenScheduleCombination {
  specifications: SpecSearchResult[];
  totalCredits: number;
  compactnessScore: number;
  prerequisitesSatisfied: number;
  warnings: string[];
}

export interface GoldenScheduleResponse {
  combinations: GoldenScheduleCombination[];
  generatedInMs: number;
}

export interface ExamListItem {
  specificationId: string;
  courseName: string;
  professorName: string;
  examType: 'FINAL' | 'MIDTERM';
  date: DateEnvelope;
  time: string;
  location: string;
}

// ── Resource Hub ───────────────────────────────────────────────────────────
export interface ResourceFileResponse {
  id: string;
  courseId: string;
  courseCode: string;
  courseName: string;
  professorId: string;
  professorName: string;
  title: string;
  description: string | null;
  fileType: string;
  fileSizeBytes: number;
  versionNumber: number;
  approvalStatus: string;
  badgeType: string | null;
  approvedAt: DateEnvelope | null;
  averageRating: number;
  ratingCount: number;
  uploaderName: string;
  uploaderRole: string;
  userRating: number | null;
  userStickyNote: string | null;
  createdAt: DateEnvelope;
  /** Latest version date — Golden Doc §2.3.6 */
  latestVersionAt?: DateEnvelope;
}

// ── Tickets ────────────────────────────────────────────────────────────────
export interface TicketResponse {
  id: string;
  department: string;
  content: string;
  imageUrls: string[];
  status: string;
  isEscalated: boolean;
  escalatedAt: DateEnvelope | null;
  replies: TicketReplyResponse[];
  createdAt: DateEnvelope;
  updatedAt: DateEnvelope;
}

export interface TicketReplyResponse {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  content: string;
  attachmentUrl: string | null;
  createdAt: DateEnvelope;
}

// ── Messaging ──────────────────────────────────────────────────────────────
export interface MessageResponse {
  id: string;
  senderId: string;
  senderName: string;
  senderRole: string;
  source: string;
  content: string;
  isEdited: boolean;
  editedAt: DateEnvelope | null;
  specificationId: string | null;
  parentMessageId: string | null;
  isRead: boolean;
  createdAt: DateEnvelope;
}

export interface InboxResponse {
  threads: InboxThread[];
}

export interface InboxThread {
  rootMessageId: string;
  latestActivityAt: DateEnvelope;
  unreadCount: number;
  rootMessage: MessageResponse;
  replies: MessageResponse[];
}

// ── System State ───────────────────────────────────────────────────────────
export interface SystemStateResponse {
  currentSemester: {
    id: string;
    name: string;
    startDate: DateEnvelope;
    endDate: DateEnvelope;
  } | null;
  currentPhase: string;
  phaseSwitchedAt: DateEnvelope | null;
  gracePeriodEndsAt: DateEnvelope | null;
}

// ── Analytics (Owner only) ─────────────────────────────────────────────────
export interface AnalyticsResponse {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
    byRole: Record<string, number>;
  };
  downloads: {
    total: number;
    byCourse: Array<{ courseId: string; courseName: string; count: number }>;
    byProfessor: Array<{ professorId: string; professorName: string; count: number }>;
  };
  engagement: {
    ticketsTotal: number;
    ticketsEscalated: number;
    messagesThisWeek: number;
    schedulerUsageRate: number;
  };
}

// ── Audit Logs ─────────────────────────────────────────────────────────────
export interface AuditLogResponse {
  id: string;
  timestampUtc: DateEnvelope;
  timestampShamsi: string;
  actorId: string;
  actorName: string;
  actorRole: string;
  actionType: string;
  targetEntityType: string;
  targetEntityId: string;
  beforeState: Record<string, unknown> | null;
  afterState: Record<string, unknown> | null;
  context: Record<string, unknown> | null;
}
