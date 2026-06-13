/**
 * src/services/conflict-detector.service.ts — Detect student time conflicts
 * after an Expert edits a specification's time/location.
 */

import { prisma } from '../prisma/prisma.client';
import { notificationService } from './notification.service';
import { NotificationType } from '@unify/shared-types';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;
function timeToMinutes(t: string): number {
  if (!TIME_REGEX.test(t)) throw new Error(`Invalid time: ${t}`);
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}
function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return timeToMinutes(start1) < timeToMinutes(end2) && timeToMinutes(start2) < timeToMinutes(end1);
}

export interface ConflictResult {
  studentId: string;
  conflictWithSpecId: string;
  conflictWithCourseName: string;
  conflictType: 'CLASS' | 'EXAM';
}

/** Find all enrolled students whose other specifications conflict with the given one. */
export async function detectSpecConflicts(
  specId: string,
  newClassDays: string[],
  newClassStartTime: string,
  newClassEndTime: string,
  newFinalExamDate: Date | null,
  newFinalExamTime: string | null,
): Promise<ConflictResult[]> {
  const spec = await prisma.courseSpecification.findUnique({
    where: { id: specId },
    include: { course: true },
  });
  if (!spec) return [];

  const enrollments = await prisma.enrollment.findMany({
    where: { specificationId: specId, isTemporary: false },
    select: { studentId: true },
  });
  if (enrollments.length === 0) return [];

  const studentIds = enrollments.map((e) => e.studentId);

  const otherEnrollments = await prisma.enrollment.findMany({
    where: {
      studentId: { in: studentIds },
      isTemporary: false,
      NOT: { specificationId: specId },
    },
    include: {
      specification: { include: { course: true } },
    },
  });

  const conflictsByStudent = new Map<string, ConflictResult>();

  for (const enr of otherEnrollments) {
    const other = enr.specification;

    // Class time overlap
    const dayOverlap = other.classDays.some((d) => newClassDays.includes(d));
    if (
      dayOverlap &&
      timeRangesOverlap(
        other.classStartTime,
        other.classEndTime,
        newClassStartTime,
        newClassEndTime,
      )
    ) {
      if (!conflictsByStudent.has(enr.studentId)) {
        conflictsByStudent.set(enr.studentId, {
          studentId: enr.studentId,
          conflictWithSpecId: other.id,
          conflictWithCourseName: other.course.name,
          conflictType: 'CLASS',
        });
      }
    }

    // Exam time overlap
    if (
      newFinalExamDate &&
      other.finalExamDate &&
      newFinalExamTime &&
      other.finalExamTime &&
      newFinalExamDate.getTime() === other.finalExamDate.getTime() &&
      timeRangesOverlap(
        other.finalExamTime,
        other.finalExamTime,
        newFinalExamTime,
        newFinalExamTime,
      )
    ) {
      if (!conflictsByStudent.has(enr.studentId)) {
        conflictsByStudent.set(enr.studentId, {
          studentId: enr.studentId,
          conflictWithSpecId: other.id,
          conflictWithCourseName: other.course.name,
          conflictType: 'EXAM',
        });
      }
    }
  }

  return Array.from(conflictsByStudent.values());
}

/** Send conflict notifications to affected students. */
export async function notifyConflicts(
  specId: string,
  conflicts: ConflictResult[],
  courseName: string,
): Promise<void> {
  if (conflicts.length === 0) return;
  for (const c of conflicts) {
    await notificationService.send({
      type: NotificationType.CRITICAL_ALERT,
      title: 'تعارض در برنامه درسی شما!',
      body:
        c.conflictType === 'CLASS'
          ? `تغییر ${courseName} با ${c.conflictWithCourseName} تداخل زمانی ایجاد کرد`
          : `زمان امتحان ${courseName} با ${c.conflictWithCourseName} تداخل دارد`,
      recipientIds: [c.studentId],
      data: { specificationId: specId, conflictType: c.conflictType },
      bypassMute: true,
    });
  }
}
