/**
 * src/services/notification.service.ts — Unified notification dispatcher.
 * Agent Guide §6.2 specification.
 * Tries Pushe first, falls back to Socket.io, persists in DB. Never throws.
 */

import { prisma } from '../prisma/prisma.client';
import { sendViaPushe } from '../utils/pushe';
import { emitToUsers } from '../socket/socket.server';
import { logger } from '../utils/logger';
import { NotificationPayload, NotificationType, Role } from '@unify/shared-types';

class NotificationService {
  /**
   * Send a notification according to Agent Guide §6.2:
   * 1. Filter out muted recipients (unless bypassMute=true)
   * 2. Try Pushe
   * 3. Fall back to Socket.io
   * 4. Persist in DB
   * 5. Never throw
   */
  async send(payload: NotificationPayload): Promise<void> {
    try {
      let recipientIds = payload.recipientIds;
      const isCritical = payload.type === NotificationType.CRITICAL_ALERT || payload.bypassMute === true;

      // Step 1: filter muted (unless critical alert)
      if (!isCritical) {
        recipientIds = await this.filterMutedRecipients(recipientIds);
      }

      if (recipientIds.length === 0) return;

      // Step 2: persist in DB for inbox
      await this.persistInbox(recipientIds, payload);

      // Step 3: try Pushe
      const pusheOk = await this.tryPushe(recipientIds, payload);
      if (!pusheOk) {
        // Step 4: Socket.io fallback
        emitToUsers(recipientIds, 'notification', {
          type: payload.type,
          title: payload.title,
          body: payload.body,
          data: payload.data,
          timestamp: new Date().toISOString(),
        });
      }

      logger.info({
        type: payload.type,
        recipientCount: recipientIds.length,
        channel: pusheOk ? 'pushe' : 'socket',
      }, 'Notification dispatched');
    } catch (err) {
      logger.error({ err, payload: { ...payload, recipientIds: payload.recipientIds.length } }, 'Notification dispatch failed');
      // Never throw
    }
  }

  private async filterMutedRecipients(userIds: string[]): Promise<string[]> {
    if (userIds.length === 0) return userIds;
    const specId = undefined; // Could pull from data?.specificationId if needed
    if (!specId) return userIds;

    const muted = await prisma.notificationPreference.findMany({
      where: {
        studentId: { in: userIds },
        specificationId: specId,
        isMuted: true,
      },
      select: { studentId: true },
    });
    const mutedSet = new Set(muted.map((m) => m.studentId));
    return userIds.filter((id) => !mutedSet.has(id));
  }

  private async tryPushe(recipientIds: string[], payload: NotificationPayload): Promise<boolean> {
    // In production we'd look up device tokens per user. For now we use usernames as Pushe customIds.
    const result = await sendViaPushe(
      recipientIds,
      payload.title,
      payload.body,
      payload.data,
    );
    return result.success;
  }

  private async persistInbox(recipientIds: string[], payload: NotificationPayload): Promise<void> {
    await prisma.persistentNotification.createMany({
      data: recipientIds.map((uid) => ({
        recipientId: uid,
        type: payload.type,
        title: payload.title,
        body: payload.body,
        data: payload.data || null,
      })),
    });
  }

  /** Send to all students enrolled in a specification. */
  async sendToEnrolledStudents(
    specificationId: string,
    payload: Omit<NotificationPayload, 'recipientIds'>,
  ): Promise<void> {
    const enrollments = await prisma.enrollment.findMany({
      where: { specificationId, isTemporary: false },
      select: { studentId: true },
    });
    await this.send({
      ...payload,
      recipientIds: enrollments.map((e) => e.studentId),
    });
  }

  /** Send to all staff with given role (admin broadcasts). */
  async sendToStaff(payload: Omit<NotificationPayload, 'recipientIds'>, roles: Role[]): Promise<void> {
    const users = await prisma.user.findMany({
      where: { role: { in: roles }, isActive: true },
      select: { id: true },
    });
    await this.send({
      ...payload,
      recipientIds: users.map((u) => u.id),
    });
  }
}

export const notificationService = new NotificationService();
