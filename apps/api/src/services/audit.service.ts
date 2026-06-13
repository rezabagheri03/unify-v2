/**
 * src/services/audit.service.ts — High-level audit operations + log queries.
 */

import { prisma } from '../prisma/prisma.client';
import { AuditActionType, Role } from '@unify/shared-types';
import { writeAuditLog } from '../utils/audit-logger';

export interface AuditLogQuery {
  startDate?: Date;
  endDate?: Date;
  actorId?: string;
  actionType?: AuditActionType;
  entityType?: string;
  page?: number;
  limit?: number;
}

export const auditService = {
  async log(input: {
    actorId: string;
    actorRole: Role;
    actionType: AuditActionType;
    targetEntityType: string;
    targetEntityId: string;
    beforeState?: Record<string, unknown> | null;
    afterState?: Record<string, unknown> | null;
    context?: Record<string, unknown> | null;
  }): Promise<void> {
    await writeAuditLog(input);
  },

  async query(filters: AuditLogQuery): Promise<{
    items: Array<{
      id: string;
      timestampUtc: Date;
      timestampShamsi: string;
      actorId: string;
      actorName: string;
      actorRole: Role;
      actionType: string;
      targetEntityType: string;
      targetEntityId: string;
      beforeState: Record<string, unknown> | null;
      afterState: Record<string, unknown> | null;
      context: Record<string, unknown> | null;
    }>;
    total: number;
  }> {
    const page = filters.page || 1;
    const limit = Math.min(filters.limit || 50, 200);
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (filters.actorId) where.actorId = filters.actorId;
    if (filters.actionType) where.actionType = filters.actionType;
    if (filters.entityType) where.targetEntityType = filters.entityType;
    if (filters.startDate || filters.endDate) {
      where.timestampUtc = {};
      if (filters.startDate) (where.timestampUtc as Record<string, Date>).gte = filters.startDate;
      if (filters.endDate) (where.timestampUtc as Record<string, Date>).lte = filters.endDate;
    }

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { timestampUtc: 'desc' },
        skip,
        take: limit,
        include: { actor: { select: { firstName: true, lastName: true, username: true } } },
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      items: logs.map((l) => ({
        id: l.id,
        timestampUtc: l.timestampUtc,
        timestampShamsi: l.timestampShamsi,
        actorId: l.actorId,
        actorName: [l.actor.firstName, l.actor.lastName].filter(Boolean).join(' ') || l.actor.username,
        actorRole: l.actorRole,
        actionType: l.actionType,
        targetEntityType: l.targetEntityType,
        targetEntityId: l.targetEntityId,
        beforeState: l.beforeState as Record<string, unknown> | null,
        afterState: l.afterState as Record<string, unknown> | null,
        context: l.context as Record<string, unknown> | null,
      })),
      total,
    };
  },
};
