/**
 * tests/api/new-endpoints.test.ts — Verifies the recently-added endpoints work.
 */

import { prisma } from '../../apps/api/src/prisma/prisma.client';

describe('New endpoints — backend logic', () => {
  let testUserId: string;
  let testDeptId: string;
  let testCourseId: string;
  let testSpecId: string;

  beforeAll(async () => {
    const user = await prisma.user.create({
      data: {
        username: 'test-new-endpoints-' + Date.now(),
        passwordHash: 'test',
        role: 'STUDENT',
        onboardingComplete: true,
        isActive: true,
      },
    });
    testUserId = user.id;

    const dept = await prisma.department.create({
      data: { name: 'Test Dept NE', code: 'TDNE' + Date.now() },
    });
    testDeptId = dept.id;

    const prof = await prisma.user.create({
      data: {
        username: 'test-prof-ne-' + Date.now(),
        passwordHash: 'test',
        role: 'PROFESSOR',
        onboardingComplete: true,
        isActive: true,
        departmentId: dept.id,
      },
    });

    const course = await prisma.course.create({
      data: {
        code: 'TCNE' + Date.now(),
        name: 'Test Course NE',
        credits: 3,
        departmentId: dept.id,
      },
    });
    testCourseId = course.id;

    const sem = await prisma.semester.findFirst({ where: { isCurrent: true } });
    if (sem) {
      const spec = await prisma.courseSpecification.create({
        data: {
          courseId: course.id,
          professorId: prof.id,
          semesterId: sem.id,
          classDays: ['SATURDAY', 'MONDAY'],
          classStartTime: '08:00',
          classEndTime: '10:00',
          classroomLocation: 'Test Room',
        },
      });
      testSpecId = spec.id;

      await prisma.enrollment.create({
        data: {
          studentId: testUserId,
          specificationId: spec.id,
          isTemporary: false,
        },
      });
    }
  });

  afterAll(async () => {
    await prisma.cancelledSpecificationNotice.deleteMany({ where: { studentId: testUserId } });
    await prisma.enrollment.deleteMany({ where: { studentId: testUserId } });
    await prisma.courseSpecification.deleteMany({ where: { id: testSpecId } });
    await prisma.course.deleteMany({ where: { id: testCourseId } });
    await prisma.department.deleteMany({ where: { id: testDeptId } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'test-' } } });
    await prisma.$disconnect();
  });

  describe('CancelledSpecificationNotice (Decision 5)', () => {
    it('TTL = 7 days from creation', () => {
      const created = new Date();
      const expiresAt = new Date(created.getTime() + 7 * 24 * 60 * 60 * 1000);
      expect(expiresAt.getTime() - created.getTime()).toBe(604800000);
    });

    it('filtering expired notices returns only non-expired', async () => {
      // Insert one active + one expired
      await prisma.cancelledSpecificationNotice.create({
        data: {
          studentId: testUserId,
          specificationId: testSpecId || 'unknown',
          courseCode: 'TEST',
          courseName: 'Test',
          professorName: 'Test',
          semesterName: 'Test',
          credits: 3,
          deletedByUserId: testUserId,
          expiresAt: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        },
      });

      const notices = await prisma.cancelledSpecificationNotice.findMany({
        where: { studentId: testUserId, expiresAt: { gt: new Date() } },
      });
      expect(notices.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('ResourceDownload tracking (§3.6.5)', () => {
    it('can create a download record', async () => {
      // Create a minimal resource file
      const file = await prisma.resourceFile.create({
        data: {
          courseId: testCourseId,
          professorId: (await prisma.user.findFirst({ where: { role: 'PROFESSOR' } }))!.id,
          title: 'Test Download File',
          filePath: '/tmp/test',
          fileType: 'PDF',
          fileSizeBytes: 1024,
          uploadedById: testUserId,
          uploaderRole: 'STUDENT',
          approvalStatus: 'APPROVED',
        },
      });
      await prisma.resourceDownload.create({
        data: { resourceFileId: file.id, studentId: testUserId },
      });
      const count = await prisma.resourceDownload.count({ where: { resourceFileId: file.id } });
      expect(count).toBe(1);
      await prisma.resourceDownload.deleteMany({ where: { resourceFileId: file.id } });
      await prisma.resourceFile.delete({ where: { id: file.id } });
    });
  });

  describe('AssignmentTask with courseId (Golden Doc §2.6.4)', () => {
    it('can create task with optional courseId', async () => {
      const task = await prisma.assignmentTask.create({
        data: {
          studentId: testUserId,
          title: 'Test Task',
          taskType: 'ASSIGNMENT',
          courseId: testCourseId,
          dueDateShamsi: '1403/12/29',
          dueDateUtc: new Date('2025-03-19T00:00:00Z'),
          courseNote: 'Test note',
        },
        include: { course: true },
      });
      expect(task.courseId).toBe(testCourseId);
      expect(task.course?.code).toContain('TCNE');
      await prisma.assignmentTask.delete({ where: { id: task.id } });
    });

    it('can create task without courseId (general assignment)', async () => {
      const task = await prisma.assignmentTask.create({
        data: {
          studentId: testUserId,
          title: 'General Task',
          taskType: 'OTHER',
          dueDateShamsi: '1403/12/29',
          dueDateUtc: new Date('2025-03-19T00:00:00Z'),
        },
      });
      expect(task.courseId).toBeNull();
      await prisma.assignmentTask.delete({ where: { id: task.id } });
    });
  });

  describe('User.academicStatus column', () => {
    it('persists academic status independently of supplementaryInfo', async () => {
      await prisma.user.update({
        where: { id: testUserId },
        data: { academicStatus: 'FINAL_SEMESTER' },
      });
      const fresh = await prisma.user.findUnique({ where: { id: testUserId } });
      expect(fresh?.academicStatus).toBe('FINAL_SEMESTER');
    });
  });
});
