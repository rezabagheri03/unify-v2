/**
 * prisma/seed-demo.ts — Optional seed script that populates demo data.
 * Run with: npx ts-node prisma/seed-demo.ts
 *
 * WARNING: This creates real users with predictable passwords.
 * ONLY use in development/testing. Never run in production.
 */

import { PrismaClient, Role, Phase, ApprovalStatus, BadgeType, FileType, AcademicStatus, Day, TicketDepartment, TicketStatus, ExamType, AuditActionType } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { toShamsi } from '../apps/api/src/utils/shamsi';

const prisma = new PrismaClient();

const DEMO_PASSWORD = 'Demo1234!@';

async function main() {
  console.log('🌱 Seeding demo data...');

  const hash = await bcrypt.hash(DEMO_PASSWORD, 12);

  // 1. Departments
  const cs = await prisma.department.upsert({
    where: { code: 'CS' },
    update: {},
    create: { name: 'علوم کامپیوتر', code: 'CS' },
  });
  const ee = await prisma.department.upsert({
    where: { code: 'EE' },
    update: {},
    create: { name: 'مهندسی برق', code: 'EE' },
  });
  console.log(`✓ 2 departments`);

  // 2. Users: 1 admin, 1 owner (via main seed), 1 expert, 1 head, 3 professors, 5 students
  const admin = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      passwordHash: hash,
      role: Role.SYSTEM_ADMIN,
      isActive: true,
      onboardingComplete: true,
      firstName: 'مدیر',
      lastName: 'سیستم',
      themePreference: 'default',
      darkMode: false,
    },
  });

  const expertCs = await prisma.user.upsert({
    where: { username: 'expert1' },
    update: {},
    create: {
      username: 'expert1',
      passwordHash: hash,
      role: Role.EXPERT,
      isActive: true,
      onboardingComplete: true,
      firstName: 'کارشناس',
      lastName: 'گروه کامپیوتر',
      departmentId: cs.id,
      themePreference: 'default',
      darkMode: false,
    },
  });

  const headCs = await prisma.user.upsert({
    where: { username: 'head1' },
    update: {},
    create: {
      username: 'head1',
      passwordHash: hash,
      role: Role.HEAD_OF_DEPARTMENT,
      isActive: true,
      onboardingComplete: true,
      firstName: 'مدیر',
      lastName: 'گروه کامپیوتر',
      departmentId: cs.id,
      themePreference: 'default',
      darkMode: false,
    },
  });

  const prof1 = await prisma.user.upsert({
    where: { username: 'prof1' },
    update: {},
    create: {
      username: 'prof1',
      passwordHash: hash,
      role: Role.PROFESSOR,
      isActive: true,
      onboardingComplete: true,
      firstName: 'محمد',
      lastName: 'رضایی',
      departmentId: cs.id,
      themePreference: 'default',
      darkMode: false,
    },
  });

  const prof2 = await prisma.user.upsert({
    where: { username: 'prof2' },
    update: {},
    create: {
      username: 'prof2',
      passwordHash: hash,
      role: Role.PROFESSOR,
      isActive: true,
      onboardingComplete: true,
      firstName: 'فاطمه',
      lastName: 'کریمی',
      departmentId: cs.id,
      themePreference: 'default',
      darkMode: false,
    },
  });

  const prof3 = await prisma.user.upsert({
    where: { username: 'prof3' },
    update: {},
    create: {
      username: 'prof3',
      passwordHash: hash,
      role: Role.PROFESSOR,
      isActive: true,
      onboardingComplete: true,
      firstName: 'علی',
      lastName: 'حسینی',
      departmentId: ee.id,
      themePreference: 'default',
      darkMode: false,
    },
  });

  const students = [];
  for (let i = 1; i <= 5; i++) {
    const s = await prisma.user.upsert({
      where: { username: `9901234${i}` },
      update: {},
      create: {
        username: `9901234${i}`,
        passwordHash: hash,
        role: Role.STUDENT,
        isActive: true,
        onboardingComplete: true,
        firstName: 'دانشجو',
        lastName: `شماره ${i}`,
        departmentId: cs.id,
        themePreference: 'default',
        darkMode: false,
        supplementaryInfo: 'ACADEMIC_STATUS:NORMAL',
      },
    });
    students.push(s);
  }
  console.log(`✓ 10 users (admin, expert, head, 3 professors, 5 students)`);

  // 3. Courses
  const courseMath = await prisma.course.upsert({
    where: { code: 'MATH201' },
    update: {},
    create: {
      code: 'MATH201',
      name: 'ریاضی ۲',
      credits: 3,
      departmentId: cs.id,
    },
  });
  const courseAlgo = await prisma.course.upsert({
    where: { code: 'CS301' },
    update: {},
    create: {
      code: 'CS301',
      name: 'طراحی الگوریتم',
      credits: 3,
      departmentId: cs.id,
    },
  });
  const courseDb = await prisma.course.upsert({
    where: { code: 'CS302' },
    update: {},
    create: {
      code: 'CS302',
      name: 'پایگاه داده',
      credits: 3,
      departmentId: cs.id,
    },
  });
  const courseNet = await prisma.course.upsert({
    where: { code: 'EE401' },
    update: {},
    create: {
      code: 'EE401',
      name: 'شبکه‌های کامپیوتری',
      credits: 3,
      departmentId: ee.id,
    },
  });
  console.log(`✓ 4 courses`);

  // 4. Semester (current)
  let semester = await prisma.semester.findFirst({ where: { isCurrent: true } });
  if (!semester) {
    const now = new Date();
    const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const end = new Date(now.getFullYear(), now.getMonth() + 4, 30);
    semester = await prisma.semester.create({
      data: {
        name: 'پاییز ۱۴۰۳',
        startDate: start,
        endDate: end,
        isCurrent: true,
        currentPhase: Phase.ENROLLMENT,
      },
    });
  }

  // 5. Course Specifications
  const mathSpec = await prisma.courseSpecification.create({
    data: {
      courseId: courseMath.id,
      professorId: prof1.id,
      semesterId: semester.id,
      classDays: [Day.SATURDAY, Day.MONDAY],
      classStartTime: '08:00',
      classEndTime: '10:00',
      classroomLocation: 'ساختمان A، کلاس ۲۰۴',
      finalExamDate: new Date('2024-12-15T08:00:00Z'),
      finalExamTime: '08:00',
      finalExamLocation: 'سالن امتحانات',
      telegramLink: 'https://t.me/example_math',
    },
  });

  const algoSpec = await prisma.courseSpecification.create({
    data: {
      courseId: courseAlgo.id,
      professorId: prof2.id,
      semesterId: semester.id,
      classDays: [Day.SUNDAY, Day.TUESDAY],
      classStartTime: '10:00',
      classEndTime: '12:00',
      classroomLocation: 'ساختمان B، کلاس ۳۰۱',
      finalExamDate: new Date('2024-12-17T10:00:00Z'),
      finalExamTime: '10:00',
      finalExamLocation: 'سالن امتحانات',
    },
  });

  const dbSpec = await prisma.courseSpecification.create({
    data: {
      courseId: courseDb.id,
      professorId: prof1.id,
      semesterId: semester.id,
      classDays: [Day.WEDNESDAY],
      classStartTime: '14:00',
      classEndTime: '16:00',
      classroomLocation: 'ساختمان C، کلاس ۱۰۵',
      finalExamDate: new Date('2024-12-20T14:00:00Z'),
      finalExamTime: '14:00',
      finalExamLocation: 'سالن امتحانات',
    },
  });
  console.log(`✓ 3 course specifications`);

  // 6. Enroll first 3 students in all 3 courses
  for (let i = 0; i < 3; i++) {
    for (const spec of [mathSpec, algoSpec, dbSpec]) {
      await prisma.enrollment.upsert({
        where: {
          studentId_specificationId: { studentId: students[i].id, specificationId: spec.id },
        },
        update: {},
        create: {
          studentId: students[i].id,
          specificationId: spec.id,
          isTemporary: false,
        },
      });
    }
  }
  console.log(`✓ 9 final enrollments`);

  // 7. A sample resource file uploaded by prof1
  await prisma.resourceFile.create({
    data: {
      courseId: courseMath.id,
      professorId: prof1.id,
      title: 'جزوه ریاضی ۲ - فصل اول',
      description: 'مفاهیم پایه',
      filePath: '/app/storage/resources/demo/lecture-1.pdf',
      fileType: FileType.PDF,
      fileSizeBytes: 1024 * 1024,
      versionNumber: 1,
      uploadedById: prof1.id,
      uploaderRole: Role.PROFESSOR,
      approvalStatus: ApprovalStatus.APPROVED,
      badgeType: BadgeType.PROFESSOR_BADGE,
      approvedById: prof1.id,
      approvedAt: new Date(),
    },
  });
  console.log(`✓ 1 demo resource file`);

  // 8. A notice + FAQ
  await prisma.noticeBoard.create({
    data: {
      professorId: prof1.id,
      courseId: courseMath.id,
      title: 'تأخیر در بارگذاری نمرات',
      content: 'نمرات میان‌ترم تا پایان هفته اعلام خواهند شد.',
    },
  });
  await prisma.courseFAQ.create({
    data: {
      professorId: prof1.id,
      courseId: courseMath.id,
      question: 'آیا می‌توانم در امتحان تجدید شرکت کنم؟',
      answer: 'بله، با ارائه عذر موجه به آموزش.',
    },
  });
  console.log(`✓ 1 notice + 1 FAQ`);

  // 9. A sample ticket
  await prisma.ticket.create({
    data: {
      studentId: students[0].id,
      department: TicketDepartment.EDUCATION,
      content: 'لطفاً نمرات میان‌ترم ریاضی ۲ را اعلام کنید.',
      status: TicketStatus.OPEN,
    },
  });
  console.log(`✓ 1 demo ticket`);

  console.log('\n🎉 Demo seed complete!');
  console.log('\n📋 Login credentials (all use password: ' + DEMO_PASSWORD + '):');
  console.log('   - admin:    SYSTEM_ADMIN');
  console.log('   - expert1:  EXPERT (CS dept)');
  console.log('   - head1:    HEAD_OF_DEPARTMENT (CS dept)');
  console.log('   - prof1:    PROFESSOR (Math)');
  console.log('   - prof2:    PROFESSOR (Algorithms)');
  console.log('   - 99012341-99012345: STUDENTS');
  console.log('   - owner:    (from main seed.ts, see SEED_OWNER_PASSWORD env)');
}

main()
  .catch((e) => {
    console.error('❌ Demo seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
