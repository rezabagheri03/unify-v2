/**
 * src/routes/curriculum.routes.ts — Curriculum charts (tree-view, agent-free cloud sync).
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { z } from 'zod';
import { Role } from '@unify/shared-types';
import { AuthForbidden, NotFound } from '../utils/errors';

export const curriculumRouter = Router();
curriculumRouter.use(authenticateToken, requireOnboardingComplete);

const chartSchema = z.object({
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

curriculumRouter.get(
  '/:departmentId/:entryYear',
  asyncHandler(async (req, res) => {
    const deptId = req.params.departmentId;
    const year = parseInt(req.params.entryYear, 10);
    const chart = await prisma.curriculumChart.findUnique({
      where: { departmentId_entryYear: { departmentId: deptId, entryYear: year } },
    });
    if (!chart) throw NotFound('چارت درسی');
    res.json({ success: true, data: chart, requestId: req.requestId });
  }),
);

// Cloud-synced passed-course checklist for students (Golden Doc §2.6.1)
const passedCoursesSchema = z.object({
  courseCodes: z.array(z.string()).max(500),
});

curriculumRouter.get(
  '/passed-courses/me',
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const match = (user?.supplementaryInfo || '').match(/PASSED_COURSES:\[(.*?)\]/);
    const passed = match ? match[1].split(',').filter(Boolean) : [];
    res.json({ success: true, data: { passedCourseCodes: passed }, requestId: req.requestId });
  }),
);

curriculumRouter.post(
  '/passed-courses/me',
  asyncHandler(async (req, res) => {
    const { courseCodes } = passedCoursesSchema.parse(req.body);
    const user = await prisma.user.findUnique({ where: { id: req.user!.userId } });
    const current = user?.supplementaryInfo || '';
    const cleaned = current.replace(/PASSED_COURSES:\[.*?\]/g, '').trim();
    const updated = `${cleaned}\nPASSED_COURSES:[${courseCodes.join(',')}]`.trim();
    await prisma.user.update({
      where: { id: req.user!.userId },
      data: { supplementaryInfo: updated },
    });
    res.json({ success: true, data: { message: 'ذخیره شد' }, requestId: req.requestId });
  }),
);

// Expert/Head management
curriculumRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    if (![Role.EXPERT, Role.HEAD_OF_DEPARTMENT].includes(req.user!.role)) {
      throw AuthForbidden();
    }
    const data = chartSchema.parse(req.body);
    const chart = await prisma.curriculumChart.upsert({
      where: { departmentId_entryYear: { departmentId: data.departmentId, entryYear: data.entryYear } },
      create: {
        departmentId: data.departmentId,
        entryYear: data.entryYear,
        chartData: data.chartData,
        uploadedById: req.user!.userId,
        isPublished: false,
      },
      update: {
        chartData: data.chartData,
        uploadedById: req.user!.userId,
        isPublished: false,
        approvedById: null,
      },
    });
    res.json({ success: true, data: chart, requestId: req.requestId });
  }),
);

curriculumRouter.patch(
  '/:id/publish',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== Role.HEAD_OF_DEPARTMENT) throw AuthForbidden();
    const chart = await prisma.curriculumChart.update({
      where: { id: req.params.id },
      data: { isPublished: true, approvedById: req.user!.userId },
    });
    res.json({ success: true, data: chart, requestId: req.requestId });
  }),
);
