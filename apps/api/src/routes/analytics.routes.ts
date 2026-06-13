/**
 * src/routes/analytics.routes.ts — Owner analytics dashboard.
 * Uses ACTUAL ResourceDownload records (Golden Doc §3.6.5) rather than file counts.
 */

import { Router } from 'express';
import { authenticateToken } from '../middleware/auth.middleware';
import { requireOnboardingComplete, requireRole } from '../middleware/rbac.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { prisma } from '../prisma/prisma.client';
import { Role } from '@unify/shared-types';

export const analyticsRouter = Router();
analyticsRouter.use(authenticateToken, requireOnboardingComplete, requireRole([Role.SYSTEM_OWNER]));

analyticsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const now = new Date();
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

    const [dailyCount, weeklyCount, monthlyCount, byRole, totalFiles, totalTickets, escalatedTickets, messagesThisWeek, totalDownloads, weekDownloads] = await Promise.all([
      prisma.user.count({ where: { lastLoginAt: { gte: dayAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: weekAgo } } }),
      prisma.user.count({ where: { lastLoginAt: { gte: monthAgo } } }),
      prisma.user.groupBy({ by: ['role'], _count: { id: true } }),
      prisma.resourceFile.count({ where: { approvalStatus: 'APPROVED' } }),
      prisma.ticket.count(),
      prisma.ticket.count({ where: { isEscalated: true } }),
      prisma.message.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.resourceDownload.count(),
      prisma.resourceDownload.count({ where: { downloadedAt: { gte: weekAgo } } }),
    ]);

    // Download metrics — GROUP BY course (real download counts)
    const downloadsByCourse = await prisma.resourceDownload.groupBy({
      by: ['resourceFileId'],
      _count: { id: true },
      orderBy: { _count: { id: 'desc' } },
      take: 20,
    });
    const fileIds = downloadsByCourse.map((d) => d.resourceFileId);
    const files = await prisma.resourceFile.findMany({
      where: { id: { in: fileIds } },
      include: { course: { select: { id: true, name: true } }, professor: { select: { firstName: true, lastName: true } } },
    });
    const fileMap = new Map(files.map((f) => [f.id, f]));

    const byCourse = downloadsByCourse.map((d) => {
      const f = fileMap.get(d.resourceFileId);
      return {
        courseId: f?.courseId || '',
        courseName: f?.course.name || 'نامشخص',
        count: d._count.id,
      };
    }).reduce<Array<{ courseId: string; courseName: string; count: number }>>((acc, c) => {
      const existing = acc.find((x) => x.courseId === c.courseId);
      if (existing) existing.count += c.count;
      else acc.push(c);
      return acc;
    }, []).sort((a, b) => b.count - a.count).slice(0, 10);

    // Downloads by professor
    const downloadsByProf = await prisma.resourceDownload.groupBy({
      by: ['resourceFileId'],
      _count: { id: true },
    });
    const profCounts = new Map<string, { name: string; count: number }>();
    for (const d of downloadsByProf) {
      const f = fileMap.get(d.resourceFileId);
      if (!f) continue;
      const key = f.professorId;
      const profName = [f.professor.firstName, f.professor.lastName].filter(Boolean).join(' ') || 'نامشخص';
      const existing = profCounts.get(key);
      if (existing) existing.count += d._count.id;
      else profCounts.set(key, { name: profName, count: d._count.id });
    }
    const byProfessor = Array.from(profCounts.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)
      .map((p, i) => ({
        professorId: Array.from(profCounts.keys())[i] || '',
        professorName: p.name,
        count: p.count,
      }));

    const totalStudents = await prisma.user.count({ where: { role: Role.STUDENT, isActive: true } });
    const studentsInScheduler = await prisma.user.count({
      where: { role: Role.STUDENT, isActive: true, enrollments: { some: { isTemporary: false } } },
    });
    const schedulerUsageRate = totalStudents > 0 ? (studentsInScheduler / totalStudents) * 100 : 0;

    res.json({
      success: true,
      data: {
        activeUsers: {
          daily: dailyCount,
          weekly: weeklyCount,
          monthly: monthlyCount,
          byRole: Object.fromEntries(byRole.map((r) => [r.role, r._count.id])),
        },
        downloads: {
          total: totalDownloads,
          thisWeek: weekDownloads,
          byCourse,
          byProfessor,
        },
        engagement: {
          ticketsTotal: totalTickets,
          ticketsEscalated: escalatedTickets,
          messagesThisWeek,
          schedulerUsageRate,
        },
      },
      requestId: req.requestId,
    });
  }),
);
