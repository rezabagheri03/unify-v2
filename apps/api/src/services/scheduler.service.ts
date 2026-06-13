/**
 * src/services/scheduler.service.ts — Scheduler business logic.
 * Includes the Golden Schedule algorithm (Agent Guide §6.3).
 */

import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';
import {
  AddToTempListResponse,
  GoldenScheduleCombination,
  GoldenScheduleResponse,
  Phase,
  AcademicStatus,
  ROLE_CREDIT_LIMITS,
  EnrollmentTimeConflict,
  EnrollmentCreditExceeded,
  EnrollmentPhaseClosed,
  Conflict,
  BadRequest,
} from '@unify/shared-types';
import { Phase as PrismaPhase } from '@prisma/client';
import { auditService } from './audit.service';
import { AuditActionType } from '@unify/shared-types';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function timeToMinutes(t: string): number {
  if (!TIME_REGEX.test(t)) throw new Error(`Invalid time: ${t}`);
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function timeRangesOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  return timeToMinutes(start1) < timeToMinutes(end2) && timeToMinutes(start2) < timeToMinutes(end1);
}

export const schedulerService = {
  async getCurrentState(studentId: string) {
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    const enrollments = await prisma.enrollment.findMany({
      where: { studentId, specification: { semesterId: semester?.id } },
      include: { specification: { include: { course: true, professor: true } } },
    });
    const tempEnrollments = enrollments.filter((e) => e.isTemporary);
    const finalEnrollments = enrollments.filter((e) => !e.isTemporary);
    const totalCredits = finalEnrollments.reduce((s, e) => s + e.specification.course.credits, 0);

    const student = await prisma.user.findUnique({
      where: { id: studentId },
      select: { supplementaryInfo: true, academicStatus: true },
    });
    let declaredStatus = student?.academicStatus || AcademicStatus.NORMAL;
    // Fall back to supplementaryInfo for legacy users
    if (!student?.academicStatus) {
      const match = (student?.supplementaryInfo || '').match(/ACADEMIC_STATUS:([A-Z_]+)/);
      if (match && match[1] in AcademicStatus) {
        declaredStatus = match[1] as AcademicStatus;
      }
    }
    const limit = ROLE_CREDIT_LIMITS[declaredStatus];

    let gracePeriodEndsAt: Date | null = null;
    if (semester?.currentPhase === PrismaPhase.ACTIVE) {
      gracePeriodEndsAt = new Date(semester.phaseSwitchedAt.getTime() + 24 * 60 * 60 * 1000);
    }

    return {
      phase: semester?.currentPhase || Phase.ENROLLMENT,
      semesterName: semester?.name || '',
      semesterStartDate: semester
        ? { dateUtc: semester.startDate.toISOString(), dateShamsi: toShamsi(semester.startDate) }
        : { dateUtc: '', dateShamsi: '' },
      semesterEndDate: semester
        ? { dateUtc: semester.endDate.toISOString(), dateShamsi: toShamsi(semester.endDate) }
        : { dateUtc: '', dateShamsi: '' },
      gracePeriodEndsAt: gracePeriodEndsAt
        ? { dateUtc: gracePeriodEndsAt.toISOString(), dateShamsi: toShamsi(gracePeriodEndsAt) }
        : null,
      academicStatus: declaredStatus,
      currentEnrollments: finalEnrollments.length,
      temporaryEnrollments: tempEnrollments.length,
      totalCredits,
      maxCredits: limit.max,
    };
  },

  async searchSpecifications(studentId: string, q: string, semesterId?: string) {
    // If specific semesterId provided (archive view), use it; otherwise current semester.
    let semester;
    if (semesterId) {
      semester = await prisma.semester.findUnique({ where: { id: semesterId } });
    } else {
      semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    }
    if (!semester) return [];

    const specs = await prisma.courseSpecification.findMany({
      where: {
        semesterId: semester.id,
        OR: q
          ? [
              { course: { name: { contains: q, mode: 'insensitive' } } },
              { course: { code: { contains: q, mode: 'insensitive' } } },
            ]
          : undefined,
      },
      include: {
        course: true,
        professor: { select: { firstName: true, lastName: true } },
      },
      take: 100,
    });

    const myEnrollments = await prisma.enrollment.findMany({
      where: { studentId, specification: { semesterId: semester.id } },
    });
    const addedSpecIds = new Set(
      myEnrollments.filter((e) => e.isTemporary).map((e) => e.specificationId),
    );
    const finalSpecIds = new Set(
      myEnrollments.filter((e) => !e.isTemporary).map((e) => e.specificationId),
    );

    return specs.map((s) => ({
      specificationId: s.id,
      courseId: s.courseId,
      courseCode: s.course.code,
      courseName: s.course.name,
      credits: s.course.credits,
      professorName:
        [s.professor.firstName, s.professor.lastName].filter(Boolean).join(' ') || 'نامشخص',
      classDays: s.classDays,
      classStartTime: s.classStartTime,
      classEndTime: s.classEndTime,
      classroomLocation: s.classroomLocation,
      finalExamDate: s.finalExamDate
        ? { dateUtc: s.finalExamDate.toISOString(), dateShamsi: toShamsi(s.finalExamDate) }
        : null,
      finalExamTime: s.finalExamTime,
      isAlreadyAdded: addedSpecIds.has(s.id),
      isAlreadyEnrolledFinal: finalSpecIds.has(s.id),
    }));
  },

  async addToTempList(
    studentId: string,
    specificationId: string,
    confirmConflict = false,
    declaredStatus: AcademicStatus = AcademicStatus.NORMAL,
  ): Promise<AddToTempListResponse> {
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) throw BadRequest('نیم‌سال جاری تعریف نشده است');
    if (semester.currentPhase !== PrismaPhase.ENROLLMENT)
      throw EnrollmentPhaseClosed('فصل ثبت‌نام نیست');

    const spec = await prisma.courseSpecification.findUnique({
      where: { id: specificationId },
      include: { course: true },
    });
    if (!spec) throw BadRequest('مشخصات درس یافت نشد');

    const existing = await prisma.enrollment.findUnique({
      where: { studentId_specificationId: { studentId, specificationId } },
    });
    if (existing && !existing.isTemporary) {
      throw Conflict('شما قبلاً در این گروه به‌صورت قطعی ثبت‌نام کرده‌اید');
    }
    if (existing) {
      return { success: true, warnings: [], errors: [], enrollmentId: existing.id };
    }

    const warnings: string[] = [];
    const errors: string[] = [];
    const limit = ROLE_CREDIT_LIMITS[declaredStatus];

    // DECISION 1: Check same course in another spec — soft block
    const sameCourseOtherSpec = await prisma.enrollment.findFirst({
      where: {
        studentId,
        isTemporary: true,
        specification: { courseId: spec.courseId, NOT: { id: specificationId } },
      },
    });
    if (sameCourseOtherSpec) {
      warnings.push('شما قبلاً در یک گروه دیگر از این درس ثبت‌نام کرده‌اید. آیا مطمئن هستید؟');
    }

    // Golden Doc §2.2.1 PREREQUISITE CHECK — non-blocking warning
    // Has the student declared they passed the prerequisite course?
    const prerequisites = await prisma.courseRelationship.findMany({
      where: { courseId: spec.courseId },
      include: { prerequisite: true },
    });
    if (prerequisites.length > 0) {
      // Read student's declared passed courses from supplementaryInfo
      const student = await prisma.user.findUnique({
        where: { id: studentId },
        select: { supplementaryInfo: true },
      });
      const passedMatch = (student?.supplementaryInfo || '').match(/PASSED_COURSES:\[(.*?)\]/);
      const passedCodes = passedMatch ? passedMatch[1].split(',').filter(Boolean) : [];

      const unpassedPrereqs = prerequisites.filter(
        (p) => !passedCodes.includes(p.prerequisite.code),
      );
      if (unpassedPrereqs.length > 0) {
        const names = unpassedPrereqs.map((p) => p.prerequisite.name).join('، ');
        warnings.push(`پیش‌نیاز ${names} را به‌عنوان پاس‌شده علامت نزده‌اید`);
      }
    }

    // Golden Doc §2.2.1 CO-REQUISITE CHECK — non-blocking warning
    const corequisites = await prisma.corequisiteRelationship.findMany({
      where: { courseAId: spec.courseId },
      include: { courseB: true },
    });
    if (corequisites.length > 0) {
      const tempEnrollCourseIds = myTempEnrollments.map((e) => e.specification.courseId);
      const missingCoreqs = corequisites.filter(
        (c) => !tempEnrollCourseIds.includes(c.courseBId),
      );
      if (missingCoreqs.length > 0) {
        const names = missingCoreqs.map((c) => c.courseB.name).join('، ');
        warnings.push(`هم‌نیاز ${names} در لیست موقت شما نیست`);
      }
    }

    // Get current temp list
    const myTempEnrollments = await prisma.enrollment.findMany({
      where: { studentId, isTemporary: true, NOT: { specificationId } },
      include: { specification: { include: { course: true } } },
    });

    const myCurrentCredits = myTempEnrollments.reduce(
      (s, e) => s + e.specification.course.credits,
      0,
    );
    // MAX credits enforcement
    if (myCurrentCredits + spec.course.credits > limit.max) {
      if (declaredStatus !== AcademicStatus.FINAL_SEMESTER || !confirmConflict) {
        throw EnrollmentCreditExceeded(`تعداد واحدها از حد مجاز (${limit.max}) بیشتر می‌شود`);
      }
    }
    // MIN credits enforcement — only checked at submission time, not on each add.
    // Students may add courses one-by-one, going below the min temporarily.
    // The submit-final-list endpoint will validate the total.

    // Time overlap check
    for (const e of myTempEnrollments) {
      const s = e.specification;
      const dayOverlap = s.classDays.some((d) => spec.classDays.includes(d));
      if (
        dayOverlap &&
        timeRangesOverlap(s.classStartTime, s.classEndTime, spec.classStartTime, spec.classEndTime)
      ) {
        if (declaredStatus !== AcademicStatus.FINAL_SEMESTER) {
          throw EnrollmentTimeConflict(`تعارض زمانی با درس ${s.course.name}`);
        }
        warnings.push(`تعارض زمانی با درس ${s.course.name} (نادیده گرفته شد به دلیل ترم آخر)`);
      }
    }

    // Exam time overlap check
    for (const e of myTempEnrollments) {
      const s = e.specification;
      if (s.finalExamDate && spec.finalExamDate && s.finalExamTime && spec.finalExamTime) {
        const sameDay = s.finalExamDate.getTime() === spec.finalExamDate.getTime();
        if (
          sameDay &&
          timeRangesOverlap(s.finalExamTime, s.finalExamTime, spec.finalExamTime, spec.finalExamTime)
        ) {
          if (declaredStatus !== AcademicStatus.FINAL_SEMESTER) {
            throw EnrollmentTimeConflict(`تعارض زمان امتحان با درس ${s.course.name}`);
          }
          warnings.push(`تعارض زمان امتحان با درس ${s.course.name} (نادیده گرفته شد)`);
        }
      }
    }

    if (!confirmConflict && warnings.length > 0) {
      return { success: false, warnings, errors: ['لطفاً تأیید کنید'], enrollmentId: undefined };
    }

    const enrollment = await prisma.enrollment.create({
      data: { studentId, specificationId, isTemporary: true },
    });

    return { success: true, warnings, errors, enrollmentId: enrollment.id };
  },

  async removeFromTempList(studentId: string, specificationId: string) {
    const enrollment = await prisma.enrollment.findUnique({
      where: { studentId_specificationId: { studentId, specificationId } },
    });
    if (!enrollment || !enrollment.isTemporary)
      throw BadRequest('این درس در لیست موقت شما نیست');
    await prisma.enrollment.delete({ where: { id: enrollment.id } });
  },

  async submitFinalList(studentId: string) {
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) throw BadRequest('نیم‌سال جاری تعریف نشده است');
    if (semester.currentPhase !== PrismaPhase.ENROLLMENT) throw EnrollmentPhaseClosed();

    const tempEnrollments = await prisma.enrollment.findMany({
      where: { studentId, isTemporary: true },
      include: { specification: { include: { course: true } } },
    });
    if (tempEnrollments.length === 0) throw BadRequest('لیست موقت شما خالی است');

    // Read declared academic status (from User.academicStatus or supplementaryInfo fallback)
    const user = await prisma.user.findUnique({
      where: { id: studentId },
      select: { academicStatus: true, supplementaryInfo: true },
    });
    let declaredStatus = user?.academicStatus || AcademicStatus.NORMAL;
    if (!user?.academicStatus) {
      const match = (user?.supplementaryInfo || '').match(/ACADEMIC_STATUS:([A-Z_]+)/);
      if (match && match[1] in AcademicStatus) {
        declaredStatus = match[1] as AcademicStatus;
      }
    }
    const limit = ROLE_CREDIT_LIMITS[declaredStatus];
    const totalCredits = tempEnrollments.reduce((s, e) => s + e.specification.course.credits, 0);

    // MIN credits enforcement (Golden Doc §2.2.1)
    if (limit.min > 0 && totalCredits < limit.min) {
      throw EnrollmentCreditExceeded(
        `تعداد واحدها (${totalCredits}) از حداقل مجاز (${limit.min}) کمتر است. وضعیت تحصیلی شما: ${declaredStatus}`,
      );
    }

    await prisma.enrollment.updateMany({
      where: { studentId, isTemporary: true },
      data: { isTemporary: false },
    });

    return { lockedAt: new Date(), enrolledCount: tempEnrollments.length, totalCredits };
  },

  /**
   * Golden Schedule Algorithm (Agent Guide §6.3).
   * Constraint satisfaction with backtracking + memoization.
   */
  async generateGoldenSchedule(
    studentId: string,
    remainingCourseIds: string[],
    declaredStatus: AcademicStatus = AcademicStatus.NORMAL,
  ): Promise<GoldenScheduleResponse> {
    const startTime = Date.now();
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) return { combinations: [], generatedInMs: 0 };

    const allSpecs = await prisma.courseSpecification.findMany({
      where: {
        semesterId: semester.id,
        courseId: { in: remainingCourseIds },
      },
      include: { course: true, professor: { select: { firstName: true, lastName: true } } },
    });

    const byCourse = new Map<string, typeof allSpecs>();
    for (const s of allSpecs) {
      const list = byCourse.get(s.courseId) || [];
      list.push(s);
      byCourse.set(s.courseId, list);
    }

    const courseIds = Array.from(byCourse.keys()).slice(0, 8);
    const limit = ROLE_CREDIT_LIMITS[declaredStatus];

    type Combination = {
      specs: typeof allSpecs;
      credits: number;
      compactness: number;
      prereqSatisfied: number;
      warnings: string[];
    };

    const memoCache = new Map<string, number>();
    const memoOverlap = (
      s1: { classStartTime: string; classEndTime: string; classDays: string[] },
      s2: { classStartTime: string; classEndTime: string; classDays: string[] },
    ): boolean => {
      const key = [
        s1.classStartTime,
        s1.classEndTime,
        s2.classStartTime,
        s2.classEndTime,
        ...s1.classDays,
        ...s2.classDays,
      ]
        .sort()
        .join('|');
      const cached = memoCache.get(key);
      if (cached !== undefined) return cached === 1;
      const dayOverlap = s1.classDays.some((d) => s2.classDays.includes(d));
      const timeOverlap =
        dayOverlap &&
        timeRangesOverlap(s1.classStartTime, s1.classEndTime, s2.classStartTime, s2.classEndTime);
      memoCache.set(key, timeOverlap ? 1 : 0);
      return timeOverlap;
    };

    const validCombinations: Combination[] = [];

    function backtrack(idx: number, currentSpecs: typeof allSpecs, currentCredits: number) {
      if (validCombinations.length >= 5) return;
      if (idx === courseIds.length) {
        const dayBuckets = new Map<string, { start: number; end: number }>();
        for (const s of currentSpecs) {
          for (const day of s.classDays) {
            const cur = dayBuckets.get(day);
            const start = timeToMinutes(s.classStartTime);
            const end = timeToMinutes(s.classEndTime);
            if (!cur) {
              dayBuckets.set(day, { start, end });
            } else {
              if (start < cur.start) cur.start = start;
              if (end > cur.end) cur.end = end;
            }
          }
        }
        let gaps = 0;
        for (const bucket of dayBuckets.values()) {
          gaps += (bucket.end - bucket.start) / 60;
        }
        const compactness = Math.max(0, 100 - gaps);

        validCombinations.push({
          specs: [...currentSpecs],
          credits: currentCredits,
          compactness,
          prereqSatisfied: currentSpecs.length,
          warnings: [],
        });
        return;
      }

      const courseId = courseIds[idx];
      const candidates = byCourse.get(courseId) || [];
      for (const spec of candidates) {
        let conflict = false;
        for (const existing of currentSpecs) {
          if (memoOverlap(existing, spec)) {
            conflict = true;
            break;
          }
          if (
            existing.finalExamDate &&
            spec.finalExamDate &&
            existing.finalExamTime &&
            spec.finalExamTime
          ) {
            const sameDay = existing.finalExamDate.getTime() === spec.finalExamDate.getTime();
            if (
              sameDay &&
              timeRangesOverlap(
                existing.finalExamTime,
                existing.finalExamTime,
                spec.finalExamTime,
                spec.finalExamTime,
              )
            ) {
              if (declaredStatus !== AcademicStatus.FINAL_SEMESTER) {
                conflict = true;
                break;
              }
            }
          }
        }
        if (conflict) continue;

        if (currentCredits + spec.course.credits > limit.max) {
          if (declaredStatus !== AcademicStatus.FINAL_SEMESTER) continue;
        }

        currentSpecs.push(spec);
        backtrack(idx + 1, currentSpecs, currentCredits + spec.course.credits);
        currentSpecs.pop();
        if (validCombinations.length >= 5) return;
      }
    }

    await backtrack(0, [], 0);

    validCombinations.sort((a, b) => {
      const aScore = a.compactness * 2 + a.prereqSatisfied * 10;
      const bScore = b.compactness * 2 + b.prereqSatisfied * 10;
      return bScore - aScore;
    });

    const combinations: GoldenScheduleCombination[] = validCombinations
      .slice(0, 5)
      .map((c) => ({
        specifications: c.specs.map((s) => ({
          specificationId: s.id,
          courseId: s.courseId,
          courseCode: s.course.code,
          courseName: s.course.name,
          credits: s.course.credits,
          professorName:
            [s.professor.firstName, s.professor.lastName].filter(Boolean).join(' ') || 'نامشخص',
          classDays: s.classDays,
          classStartTime: s.classStartTime,
          classEndTime: s.classEndTime,
          classroomLocation: s.classroomLocation,
          finalExamDate: s.finalExamDate
            ? { dateUtc: s.finalExamDate.toISOString(), dateShamsi: toShamsi(s.finalExamDate) }
            : null,
          finalExamTime: s.finalExamTime,
          isAlreadyAdded: false,
          isAlreadyEnrolledFinal: false,
        })),
        totalCredits: c.credits,
        compactnessScore: c.compactness,
        prerequisitesSatisfied: c.prereqSatisfied,
        warnings: c.warnings,
      }));

    return { combinations, generatedInMs: Date.now() - startTime };
  },

  async getExamSchedule(studentId: string) {
    const semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!semester) return [];

    const enrollments = await prisma.enrollment.findMany({
      where: {
        studentId,
        isTemporary: false,
        specification: { semesterId: semester.id },
      },
      include: {
        specification: {
          include: { course: true, professor: { select: { firstName: true, lastName: true } } },
        },
      },
    });

    const exams: Array<{
      specificationId: string;
      courseName: string;
      professorName: string;
      examType: 'FINAL' | 'MIDTERM';
      date: { dateUtc: string; dateShamsi: string };
      time: string;
      location: string;
    }> = [];

    for (const e of enrollments) {
      const s = e.specification;
      const profName =
        [s.professor.firstName, s.professor.lastName].filter(Boolean).join(' ') || 'نامشخص';
      if (s.finalExamDate && s.finalExamTime) {
        exams.push({
          specificationId: s.id,
          courseName: s.course.name,
          professorName: profName,
          examType: 'FINAL',
          date: {
            dateUtc: s.finalExamDate.toISOString(),
            dateShamsi: toShamsi(s.finalExamDate),
          },
          time: s.finalExamTime,
          location: s.finalExamLocation || '',
        });
      }
      if (s.midtermExamDate && s.midtermExamTime) {
        exams.push({
          specificationId: s.id,
          courseName: s.course.name,
          professorName: profName,
          examType: 'MIDTERM',
          date: {
            dateUtc: s.midtermExamDate.toISOString(),
            dateShamsi: toShamsi(s.midtermExamDate),
          },
          time: s.midtermExamTime,
          location: s.midtermExamLocation || '',
        });
      }
    }

    exams.sort((a, b) => {
      const dateCmp = a.date.dateUtc.localeCompare(b.date.dateUtc);
      if (dateCmp !== 0) return dateCmp;
      return a.time.localeCompare(b.time);
    });

    return exams;
  },
};
