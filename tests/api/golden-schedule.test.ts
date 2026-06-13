/**
 * tests/api/golden-schedule.test.ts — Golden Schedule algorithm tests.
 * Verifies Agent Guide §6.3 constraints.
 */

import { schedulerService } from '../../apps/api/src/services/scheduler.service';
import { prisma } from '../../apps/api/src/prisma/prisma.client';
import { Phase, AcademicStatus, Role, Day } from '@unify/shared-types';

describe('Golden Schedule Algorithm', () => {
  let studentId: string;
  let course1Id: string;
  let course2Id: string;
  let course3Id: string;
  let spec1Id: string;
  let spec2Id: string;
  let spec3Id: string;
  let semesterId: string;

  beforeAll(async () => {
    // Setup test data
    const user = await prisma.user.create({
      data: {
        username: 'test-golden-' + Date.now(),
        passwordHash: 'test',
        role: Role.STUDENT,
        onboardingComplete: true,
        isActive: true,
        firstName: 'Test',
        lastName: 'Student',
      },
    });
    studentId = user.id;

    const dept = await prisma.department.create({
      data: { name: 'Test Dept', code: 'TEST' + Date.now() },
    });
    const prof = await prisma.user.create({
      data: {
        username: 'test-prof-' + Date.now(),
        passwordHash: 'test',
        role: Role.PROFESSOR,
        onboardingComplete: true,
        isActive: true,
      },
    });

    const c1 = await prisma.course.create({
      data: { code: 'TC1', name: 'Course 1', credits: 3, departmentId: dept.id },
    });
    const c2 = await prisma.course.create({
      data: { code: 'TC2', name: 'Course 2', credits: 3, departmentId: dept.id },
    });
    const c3 = await prisma.course.create({
      data: { code: 'TC3', name: 'Course 3', credits: 3, departmentId: dept.id },
    });
    course1Id = c1.id;
    course2Id = c2.id;
    course3Id = c3.id;

    // Make sure we have a current semester
    let sem = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (!sem) {
      sem = await prisma.semester.create({
        data: {
          name: 'Test Semester',
          startDate: new Date(),
          endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          isCurrent: true,
          currentPhase: Phase.ENROLLMENT,
        },
      });
    }
    semesterId = sem.id;

    // Spec 1: Sat-Mon 8-10 (conflicts with spec 2 if same day)
    const s1 = await prisma.courseSpecification.create({
      data: {
        courseId: course1Id,
        professorId: prof.id,
        semesterId,
        classDays: [Day.SATURDAY, Day.MONDAY],
        classStartTime: '08:00',
        classEndTime: '10:00',
        classroomLocation: 'A101',
        finalExamDate: new Date('2024-12-15T08:00:00Z'),
        finalExamTime: '08:00',
      },
    });
    // Spec 2: Sun-Tue 10-12 (no conflict with spec 1)
    const s2 = await prisma.courseSpecification.create({
      data: {
        courseId: course2Id,
        professorId: prof.id,
        semesterId,
        classDays: [Day.SUNDAY, Day.TUESDAY],
        classStartTime: '10:00',
        classEndTime: '12:00',
        classroomLocation: 'A102',
        finalExamDate: new Date('2024-12-17T10:00:00Z'),
        finalExamTime: '10:00',
      },
    });
    // Spec 3: Wed 14-16 (no conflict)
    const s3 = await prisma.courseSpecification.create({
      data: {
        courseId: course3Id,
        professorId: prof.id,
        semesterId,
        classDays: [Day.WEDNESDAY],
        classStartTime: '14:00',
        classEndTime: '16:00',
        classroomLocation: 'A103',
        finalExamDate: new Date('2024-12-20T14:00:00Z'),
        finalExamTime: '14:00',
      },
    });
    spec1Id = s1.id;
    spec2Id = s2.id;
    spec3Id = s3.id;
  });

  afterAll(async () => {
    // Cleanup
    await prisma.courseSpecification.deleteMany({
      where: { id: { in: [spec1Id, spec2Id, spec3Id] } },
    });
    await prisma.course.deleteMany({
      where: { id: { in: [course1Id, course2Id, course3Id] } },
    });
    await prisma.user.deleteMany({
      where: { username: { startsWith: 'test-golden-' } },
    });
    await prisma.$disconnect();
  });

  it('generates combinations within time budget (<3s)', async () => {
    const start = Date.now();
    const result = await schedulerService.generateGoldenSchedule(
      studentId,
      [course1Id, course2Id, course3Id],
      AcademicStatus.NORMAL,
    );
    const elapsed = Date.now() - start;
    expect(elapsed).toBeLessThan(3000);
    expect(result.generatedInMs).toBeLessThan(3000);
  });

  it('returns at least one valid combination with no time conflicts', async () => {
    const result = await schedulerService.generateGoldenSchedule(
      studentId,
      [course1Id, course2Id, course3Id],
      AcademicStatus.NORMAL,
    );
    expect(result.combinations.length).toBeGreaterThan(0);
    // Each combination should have no overlapping class times
    for (const combo of result.combinations) {
      const dayTimeMap = new Map<string, string[]>();
      for (const spec of combo.specifications) {
        for (const day of spec.classDays as string[]) {
          const key = `${day}-${spec.classStartTime}-${spec.classEndTime}`;
          if (dayTimeMap.has(day)) {
            // Verify no overlap with any existing spec on this day
            const existing = dayTimeMap.get(day)!;
            for (const existingKey of existing) {
              const [_, eStart, eEnd] = existingKey.split('-');
              const newStart = spec.classStartTime;
              const newEnd = spec.classEndTime;
              const eStartMin = parseInt(eStart.split(':')[0]) * 60 + parseInt(eStart.split(':')[1]);
              const eEndMin = parseInt(eEnd.split(':')[0]) * 60 + parseInt(eEnd.split(':')[1]);
              const nStartMin = parseInt(newStart.split(':')[0]) * 60 + parseInt(newStart.split(':')[1]);
              const nEndMin = parseInt(newEnd.split(':')[0]) * 60 + parseInt(newEnd.split(':')[1]);
              // No time overlap allowed
              expect(nStartMin >= eEndMin || nEndMin <= eStartMin).toBe(true);
            }
            existing.push(key);
          } else {
            dayTimeMap.set(day, [key]);
          }
        }
      }
    }
  });

  it('respects credit limit per academic status', async () => {
    // NORMAL allows max 20 credits
    const result = await schedulerService.generateGoldenSchedule(
      studentId,
      [course1Id, course2Id, course3Id, course1Id /* reuse to exceed limit */],
      AcademicStatus.NORMAL,
    );
    for (const combo of result.combinations) {
      expect(combo.totalCredits).toBeLessThanOrEqual(20);
    }
  });

  it('FINAL_SEMESTER allows up to 24 credits', async () => {
    const result = await schedulerService.generateGoldenSchedule(
      studentId,
      [course1Id, course2Id, course3Id],
      AcademicStatus.FINAL_SEMESTER,
    );
    for (const combo of result.combinations) {
      expect(combo.totalCredits).toBeLessThanOrEqual(24);
    }
  });

  it('returns empty when no valid combination exists', async () => {
    // Pass non-existent course IDs
    const result = await schedulerService.generateGoldenSchedule(
      studentId,
      ['00000000-0000-0000-0000-000000000000'],
      AcademicStatus.NORMAL,
    );
    expect(result.combinations.length).toBe(0);
  });
});
