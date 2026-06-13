/**
 * src/utils/audit-logger.ts — Audit logging service.
 * Agent Guide Rule 7: every sensitive operation MUST call this.
 *
 * Per Golden Doc §F.2: "Audit logs must be append-only. No update or delete
 * operations permitted on audit log entries." Therefore this helper NEVER
 * updates an existing entry — FAILED operations are recorded as a separate
 * entry referencing the original.
 */

import { prisma } from '../prisma/prisma.client';
import { toShamsiDateTime } from '../utils/shamsi';
import { AuditActionType, Role } from '@unify/shared-types';
import { logger } from '../utils/logger';

export interface AuditLogInput {
  actorId: string;
  actorRole: Role;
  actionType: AuditActionType;
  targetEntityType: string;
  targetEntityId: string;
  beforeState?: Record<string, unknown> | null;
  afterState?: Record<string, unknown> | null;
  context?: Record<string, unknown> | null;
}

/**
 * Writes an audit log entry. Append-only — never updates an existing record.
 * Agent Guide Rule 7 + Golden Doc §F.2 integrity requirement.
 */
export async function writeAuditLog(input: AuditLogInput): Promise<void> {
  try {
    const now = new Date();
    await prisma.auditLog.create({
      data: {
        timestampUtc: now,
        timestampShamsi: toShamsiDateTime(now),
        actorId: input.actorId,
        actorRole: input.actorRole,
        actionType: input.actionType,
        targetEntityType: input.targetEntityType,
        targetEntityId: input.targetEntityId,
        beforeState: input.beforeState ?? undefined,
        afterState: input.afterState ?? undefined,
        context: input.context
          ? { status: 'SUCCESS', ...input.context }
          : { status: 'SUCCESS' },
      },
    });
  } catch (err) {
    logger.error({ err, input }, 'Failed to write audit log');
  }
}

/**
 * Records the start of an action, runs the operation, then records the outcome
 * as a separate audit entry. The pair of entries (START + SUCCESS|FAILED)
 * replaces the previous UPDATE-based FAILED pattern that violated append-only.
 */
export async function auditedAction<T>(
  input: AuditLogInput,
  operation: () => Promise<T>,
): Promise<T> {
  await writeAuditLog({
    ...input,
    context: {
      ...(input.context || {}),
      status: 'PENDING',
    },
  });
  try {
    const result = await operation();
    // Append a SUCCESS entry with a reference back to the PENDING attempt.
    await writeAuditLog({
      ...input,
      context: {
        ...(input.context || {}),
        status: 'SUCCESS',
        attemptType: 'COMPLETION',
      },
    });
    return result;
  } catch (err) {
    // Append a FAILED entry as a separate record.
    await writeAuditLog({
      ...input,
      context: {
        ...(input.context || {}),
        status: 'FAILED',
        error: err instanceof Error ? err.message : String(err),
        attemptType: 'COMPLETION',
      },
    });
    throw err;
  }
}
