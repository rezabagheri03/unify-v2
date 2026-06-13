/**
 * src/services/resource.service.ts — Resource Hub business logic.
 */

import { prisma } from '../prisma/prisma.client';
import { toShamsi, fromShamsi } from '../utils/shamsi';
import { config } from '../config';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import {
  ResourceFileResponse,
  NotificationType,
  Role,
  ApprovalStatus,
  BadgeType,
  FileType,
  NotFound,
  BadRequest,
  AuthForbidden,
  QuotaExceeded,
  Conflict,
} from '@unify/shared-types';
import { auditService } from './audit.service';
import { AuditActionType } from '@unify/shared-types';
import { notificationService } from './notification.service';

// Format the current date in Asia/Tehran timezone (per Golden Doc §F.4: Persian users
// should see "today" in their local timezone). Produces "YYYY-MM-DD" in Tehran.
const todayTehranString = (): string => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Tehran',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === 'year')?.value || '';
  const m = parts.find((p) => p.type === 'month')?.value || '';
  const d = parts.find((p) => p.type === 'day')?.value || '';
  return `${y}-${m}-${d}`;
};

export const resourceService = {
  async list(courseId: string, professorId: string, userId: string, role: Role, sort: string = 'newest') {
    const where: Record<string, unknown> = {
      courseId,
      professorId,
      approvalStatus: ApprovalStatus.APPROVED,
    };

    const orderBy: Record<string, string> = sort === 'top_rated'
      ? { averageRating: 'desc' }
      : sort === 'oldest'
        ? { createdAt: 'asc' }
        : { createdAt: 'desc' };

    const files = await prisma.resourceFile.findMany({
      where,
      orderBy,
      include: {
        course: { select: { code: true, name: true } },
        professor: { select: { firstName: true, lastName: true } },
        uploadedBy: { select: { firstName: true, lastName: true, username: true } },
        ratings: { where: { studentId: userId }, select: { stars: true } },
        stickyNotes: { where: { studentId: userId }, select: { noteText: true } },
      },
    });

    return files.map((f): ResourceFileResponse => ({
      id: f.id,
      courseId: f.courseId,
      courseCode: f.course.code,
      courseName: f.course.name,
      professorId: f.professorId,
      professorName: [f.professor.firstName, f.professor.lastName].filter(Boolean).join(' ') || 'نامشخص',
      title: f.title,
      description: f.description,
      fileType: f.fileType,
      fileSizeBytes: f.fileSizeBytes,
      versionNumber: f.versionNumber,
      approvalStatus: f.approvalStatus,
      badgeType: f.badgeType,
      approvedAt: f.approvedAt ? { dateUtc: f.approvedAt.toISOString(), dateShamsi: toShamsi(f.approvedAt) } : null,
      averageRating: f.averageRating,
      ratingCount: f.ratingCount,
      uploaderName: [f.uploadedBy.firstName, f.uploadedBy.lastName].filter(Boolean).join(' ') || f.uploadedBy.username,
      uploaderRole: f.uploaderRole,
      userRating: f.ratings[0]?.stars || null,
      userStickyNote: f.stickyNotes[0]?.noteText || null,
      // Golden Doc §2.3.6: "The displayed upload date updates to the new version's date"
      // Use updatedAt for the displayed date (latest version), keep createdAt for first-upload record.
      createdAt: { dateUtc: f.createdAt.toISOString(), dateShamsi: toShamsi(f.createdAt) },
      latestVersionAt: { dateUtc: f.updatedAt.toISOString(), dateShamsi: toShamsi(f.updatedAt) },
    }));
  },

  async uploadProfessorFile(
    uploaderId: string,
    courseId: string,
    professorId: string,
    title: string,
    description: string | undefined,
    file: Express.Multer.File,
    notifyStudents: boolean,
  ) {
    const ext = path.extname(file.originalname).toLowerCase();
    const fileType: FileType = ext === '.pdf' ? FileType.PDF : FileType.DOCX;

    const fileId = uuidv4();
    const storagePath = path.join(
      config.storage.basePath,
      'resources',
      courseId,
      professorId,
      `${fileId}-v1${ext}`,
    );
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.renameSync(file.path, storagePath);

    const created = await prisma.resourceFile.create({
      data: {
        id: fileId,
        courseId,
        professorId,
        title,
        description: description || null,
        filePath: storagePath,
        fileType,
        fileSizeBytes: file.size,
        uploadedById: uploaderId,
        uploaderRole: Role.PROFESSOR,
        approvalStatus: ApprovalStatus.APPROVED,
        badgeType: BadgeType.PROFESSOR_BADGE,
        approvedById: uploaderId,
        approvedAt: new Date(),
      },
    });

    if (notifyStudents) {
      const enrollments = await prisma.enrollment.findMany({
        where: { specification: { courseId, professorId }, isTemporary: false },
        select: { studentId: true },
      });
      await notificationService.send({
        type: NotificationType.INFO,
        title: 'فایل جدید بارگذاری شد',
        body: title,
        recipientIds: enrollments.map((e) => e.studentId),
        data: { resourceFileId: created.id, courseId, professorId },
      });
    }

    await auditService.log({
      actorId: uploaderId,
      actorRole: Role.PROFESSOR,
      actionType: AuditActionType.FILE_VERSION_UPLOADED,
      targetEntityType: 'ResourceFile',
      targetEntityId: created.id,
      afterState: { title, courseId, professorId },
    });

    return created;
  },

  async uploadStudentFile(
    studentId: string,
    courseId: string,
    professorId: string,
    title: string,
    description: string | undefined,
    file: Express.Multer.File,
  ) {
    // Daily quota check (Tehran timezone — matches student's "today")
    const today = todayTehranString();
    const quota = await prisma.dailyUploadQuota.upsert({
      where: { studentId_date: { studentId, date: today } },
      update: {},
      create: { studentId, date: today, uploadCount: 0 },
    });
    if (quota.uploadCount >= config.storage.studentDailyUploadQuota) {
      throw QuotaExceeded(`سهمیه روزانه شما (${config.storage.studentDailyUploadQuota} فایل) تمام شده است`);
    }

    const ext = path.extname(file.originalname).toLowerCase();
    const fileType: FileType = ext === '.pdf' ? FileType.PDF : FileType.DOCX;
    const fileId = uuidv4();
    const storagePath = path.join(
      config.storage.basePath,
      'resources',
      courseId,
      professorId,
      `${fileId}-v1${ext}`,
    );
    fs.mkdirSync(path.dirname(storagePath), { recursive: true });
    fs.renameSync(file.path, storagePath);

    await prisma.dailyUploadQuota.update({
      where: { studentId_date: { studentId, date: today } },
      data: { uploadCount: { increment: 1 } },
    });

    return prisma.resourceFile.create({
      data: {
        id: fileId,
        courseId,
        professorId,
        title,
        description: description || null,
        filePath: storagePath,
        fileType,
        fileSizeBytes: file.size,
        uploadedById: studentId,
        uploaderRole: Role.STUDENT,
        approvalStatus: ApprovalStatus.PENDING,
      },
    });
  },

  async uploadNewVersion(uploaderId: string, role: Role, fileId: string, file: Express.Multer.File) {
    const existing = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!existing) throw NotFound('فایل');
    if (role !== Role.PROFESSOR && role !== Role.SYSTEM_ADMIN && role !== Role.SYSTEM_OWNER) {
      throw AuthForbidden('شما اجازه بارگذاری نسخه جدید را ندارید');
    }
    if (role === Role.PROFESSOR && existing.uploadedById !== uploaderId) {
      throw AuthForbidden('فقط صاحب فایل یا مدیر می‌تواند نسخه جدید بارگذاری کند');
    }

    const newVersion = existing.versionNumber + 1;
    const ext = path.extname(file.originalname).toLowerCase();
    const newPath = path.join(
      config.storage.basePath,
      'resources',
      existing.courseId,
      existing.professorId,
      `${existing.id}-v${newVersion}${ext}`,
    );
    fs.mkdirSync(path.dirname(newPath), { recursive: true });
    fs.renameSync(file.path, newPath);

    // Agent Guide DECISION 2: All ratings are preserved across versions.
    const updated = await prisma.resourceFile.update({
      where: { id: fileId },
      data: {
        filePath: newPath,
        fileSizeBytes: file.size,
        versionNumber: newVersion,
        updatedAt: new Date(),
      },
    });

    await auditService.log({
      actorId: uploaderId,
      actorRole: role,
      actionType: AuditActionType.FILE_VERSION_UPLOADED,
      targetEntityType: 'ResourceFile',
      targetEntityId: fileId,
      beforeState: { versionNumber: existing.versionNumber },
      afterState: { versionNumber: newVersion },
    });

    return updated;
  },

  async rateFile(studentId: string, fileId: string, stars: number) {
    const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!file) throw NotFound('فایل');
    if (file.approvalStatus !== ApprovalStatus.APPROVED) throw BadRequest('این فایل هنوز تأیید نشده است');

    await prisma.rating.upsert({
      where: { resourceFileId_studentId: { resourceFileId: fileId, studentId } },
      create: { resourceFileId: fileId, studentId, stars },
      update: { stars },
    });

    // Recompute average
    const allRatings = await prisma.rating.findMany({
      where: { resourceFileId: fileId },
      select: { stars: true },
    });
    const sum = allRatings.reduce((s, r) => s + r.stars, 0);
    const avg = allRatings.length > 0 ? sum / allRatings.length : 0;

    await prisma.resourceFile.update({
      where: { id: fileId },
      data: { averageRating: avg, ratingCount: allRatings.length },
    });

    return { averageRating: avg, ratingCount: allRatings.length };
  },

  async setStickyNote(studentId: string, fileId: string, noteText: string) {
    const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!file) throw NotFound('فایل');

    return prisma.stickyNote.upsert({
      where: { resourceFileId_studentId: { resourceFileId: fileId, studentId } },
      create: { resourceFileId: fileId, studentId, noteText },
      update: { noteText },
    });
  },

  async approveFile(approverId: string, role: Role, fileId: string, decision: 'approve' | 'reject', badgeType?: BadgeType) {
    const file = await prisma.resourceFile.findUnique({
      where: { id: fileId },
      include: { course: true, professor: true, uploadedBy: true },
    });
    if (!file) throw NotFound('فایل');
    if (file.approvalStatus !== ApprovalStatus.PENDING) throw Conflict('این فایل قبلاً بررسی شده است');

    // Authorization
    const canApprove =
      (role === Role.PROFESSOR && file.uploadedBy.role === Role.STUDENT) ||
      (role === Role.EXPERT || role === Role.HEAD_OF_DEPARTMENT || role === Role.SYSTEM_ADMIN);
    if (!canApprove) throw AuthForbidden();

    if (decision === 'approve') {
      const finalBadgeType = badgeType || (role === Role.PROFESSOR ? BadgeType.PROFESSOR_BADGE : BadgeType.GENERAL_BADGE);
      await prisma.resourceFile.update({
        where: { id: fileId },
        data: {
          approvalStatus: ApprovalStatus.APPROVED,
          approvedById: approverId,
          approvedAt: new Date(),
          badgeType: finalBadgeType,
        },
      });

      // Notify the uploader and enrolled students
      const enrollments = await prisma.enrollment.findMany({
        where: { specification: { courseId: file.courseId, professorId: file.professorId }, isTemporary: false },
        select: { studentId: true },
      });
      await notificationService.send({
        type: NotificationType.INFO,
        title: 'فایل جدید تأیید شد',
        body: `${file.course.name}: ${file.title}`,
        recipientIds: enrollments.map((e) => e.studentId),
        data: { resourceFileId: fileId },
      });
    } else {
      // Hard delete
      await this.hardDeleteFile(approverId, role, fileId);
      await notificationService.send({
        type: NotificationType.INFO,
        title: 'فایل شما رد شد',
        body: `فایل "${file.title}" توسط ${role} رد شد`,
        recipientIds: [file.uploadedById],
      });
    }
  },

  async hardDeleteFile(actorId: string, role: Role, fileId: string) {
    const file = await prisma.resourceFile.findUnique({ where: { id: fileId } });
    if (!file) throw NotFound('فایل');

    // Authorization: Admin can delete any; professor only own; system owner via analytics
    if (role === Role.PROFESSOR && file.uploadedById !== actorId) {
      throw AuthForbidden('فقط صاحب فایل می‌تواند آن را حذف کند');
    }
    if (![Role.PROFESSOR, Role.SYSTEM_ADMIN, Role.SYSTEM_OWNER].includes(role)) {
      throw AuthForbidden();
    }

    // Delete from disk
    try {
      if (fs.existsSync(file.filePath)) fs.unlinkSync(file.filePath);
    } catch {
      // swallow
    }

    // DB cascade handles ratings + sticky notes
    await prisma.resourceFile.delete({ where: { id: fileId } });

    await auditService.log({
      actorId,
      actorRole: role,
      actionType: AuditActionType.FILE_DELETED,
      targetEntityType: 'ResourceFile',
      targetEntityId: fileId,
      beforeState: { title: file.title, courseId: file.courseId },
    });
  },

  async listPending(approverId: string, role: Role, departmentId: string | null) {
    const where: Record<string, unknown> = { approvalStatus: ApprovalStatus.PENDING };
    if (role === Role.PROFESSOR) {
      where.professorId = approverId;
    } else if ((role === Role.EXPERT || role === Role.HEAD_OF_DEPARTMENT) && departmentId) {
      where.course = { departmentId };
    }
    // System admin sees all

    const files = await prisma.resourceFile.findMany({
      where,
      include: {
        course: true,
        professor: { select: { firstName: true, lastName: true } },
        uploadedBy: { select: { firstName: true, lastName: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return files;
  },
};
