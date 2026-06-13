/**
 * src/services/message.service.ts — Unified messaging.
 * Includes Agent Guide DECISION 3: deleting a message with replies
 * keeps replies with a placeholder.
 */

import { prisma } from '../prisma/prisma.client';
import { toShamsi } from '../utils/shamsi';
import { MessageSource, Role, NotificationType, AuthForbidden, NotFound, BadRequest } from '@unify/shared-types';
import { auditService } from './audit.service';
import { AuditActionType } from '@unify/shared-types';
import { notificationService } from './notification.service';

const PLACEHOLDER_CONTENT = '[پیام اصلی توسط استاد حذف شده است]';

export const messageService = {
  async sendBroadcast(professorId: string, specificationId: string, content: string) {
    const enrollments = await prisma.enrollment.findMany({
      where: { specificationId, isTemporary: false },
      select: { studentId: true },
    });
    if (enrollments.length === 0) return { messageId: null };

    const message = await prisma.message.create({
      data: {
        senderId: professorId,
        content,
        specificationId,
        source: MessageSource.PROFESSOR_BROADCAST,
      },
    });

    await prisma.messageRecipient.createMany({
      data: enrollments.map((e) => ({
        messageId: message.id,
        recipientId: e.studentId,
      })),
    });

    await notificationService.send({
      type: NotificationType.MESSAGE,
      title: 'پیام جدید از استاد',
      body: content.substring(0, 100),
      recipientIds: enrollments.map((e) => e.studentId),
      data: { messageId: message.id, specificationId },
    });

    return { messageId: message.id };
  },

  async sendDirect(senderId: string, senderRole: Role, recipientIds: string[], content: string) {
    // Validate all recipient IDs
    const validUsers = await prisma.user.findMany({
      where: { id: { in: recipientIds } },
      select: { id: true },
    });
    const validIds = new Set(validUsers.map((u) => u.id));
    const invalid = recipientIds.filter((id) => !validIds.has(id));
    if (invalid.length > 0) {
      throw BadRequest(`کاربر یافت نشد: ${invalid.join(', ')}`);
    }

    const sourceMap: Record<Role, MessageSource> = {
      [Role.PROFESSOR]: MessageSource.PROFESSOR_DIRECT,
      [Role.EXPERT]: MessageSource.EXPERT_TARGETED,
      [Role.HEAD_OF_DEPARTMENT]: MessageSource.EXPERT_TARGETED,
      [Role.SYSTEM_ADMIN]: MessageSource.ADMIN_TARGETED,
      [Role.SYSTEM_OWNER]: MessageSource.ADMIN_TARGETED,
      [Role.STUDENT]: MessageSource.STUDENT_REPLY,
    };

    const message = await prisma.message.create({
      data: {
        senderId,
        content,
        source: sourceMap[senderRole] || MessageSource.SYSTEM,
      },
    });

    await prisma.messageRecipient.createMany({
      data: recipientIds.map((id) => ({
        messageId: message.id,
        recipientId: id,
      })),
    });

    await notificationService.send({
      type: NotificationType.MESSAGE,
      title: 'پیام جدید',
      body: content.substring(0, 100),
      recipientIds: recipientIds,
      data: { messageId: message.id },
    });

    return { messageId: message.id, invalid };
  },

  async reply(studentId: string, parentMessageId: string, content: string) {
    const parent = await prisma.message.findUnique({ where: { id: parentMessageId } });
    if (!parent) throw NotFound('پیام والد');
    if (parent.source === MessageSource.SYSTEM) {
      throw BadRequest('به پیام‌های سیستمی نمی‌توان پاسخ داد');
    }

    return prisma.message.create({
      data: {
        senderId: studentId,
        content,
        parentMessageId,
        source: MessageSource.STUDENT_REPLY,
      },
    });
  },

  async editMessage(actorId: string, role: Role, messageId: string, content: string) {
    const msg = await prisma.message.findUnique({ where: { id: messageId } });
    if (!msg) throw NotFound('پیام');
    if (msg.senderId !== actorId) throw AuthForbidden('فقط ارسال‌کننده می‌تواند ویرایش کند');
    if (![Role.PROFESSOR, Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(role)) {
      throw AuthForbidden();
    }

    return prisma.message.update({
      where: { id: messageId },
      data: {
        content,
        isEdited: true,
        editedAt: new Date(),
      },
    });
  },

  /**
   * Agent Guide DECISION 3: Delete message with replies.
   * Cascade soft-removal: original message is replaced with placeholder,
   * replies remain visible to students.
   */
  async deleteMessage(actorId: string, role: Role, messageId: string) {
    const msg = await prisma.message.findUnique({
      where: { id: messageId },
      include: { replies: true },
    });
    if (!msg) throw NotFound('پیام');
    if (msg.senderId !== actorId) throw AuthForbidden('فقط ارسال‌کننده می‌تواند حذف کند');
    if (![Role.PROFESSOR, Role.EXPERT, Role.HEAD_OF_DEPARTMENT, Role.SYSTEM_ADMIN].includes(role)) {
      throw AuthForbidden();
    }

    if (msg.replies.length === 0) {
      // No replies: hard delete
      await prisma.messageRecipient.deleteMany({ where: { messageId } });
      await prisma.message.delete({ where: { id: messageId } });
    } else {
      // Has replies: replace content with placeholder
      await prisma.message.update({
        where: { id: messageId },
        data: {
          content: PLACEHOLDER_CONTENT,
          isEdited: true,
          editedAt: new Date(),
        },
      });
    }

    await auditService.log({
      actorId,
      actorRole: role,
      actionType: AuditActionType.SPECIFICATION_EDITED,
      targetEntityType: 'Message',
      targetEntityId: messageId,
      context: { action: 'DELETE', hadReplies: msg.replies.length > 0 },
    });
  },

  async getInbox(userId: string) {
    // Get all messages where the user is a recipient, plus threads they started
    const recipientMessages = await prisma.messageRecipient.findMany({
      where: { recipientId: userId },
      include: {
        message: {
          include: {
            sender: { select: { id: true, firstName: true, lastName: true, role: true } },
            replies: {
              include: {
                sender: { select: { id: true, firstName: true, lastName: true, role: true } },
              },
              orderBy: { createdAt: 'asc' },
            },
          },
        },
      },
      orderBy: { message: { createdAt: 'desc' } },
    });

    return recipientMessages.map((r) => ({
      rootMessageId: r.message.id,
      latestActivityAt: { dateUtc: r.message.createdAt.toISOString(), dateShamsi: toShamsi(r.message.createdAt) },
      unreadCount: r.isRead ? 0 : 1,
      rootMessage: {
        id: r.message.id,
        senderId: r.message.sender.id,
        senderName: [r.message.sender.firstName, r.message.sender.lastName].filter(Boolean).join(' ') || 'نامشخص',
        senderRole: r.message.sender.role,
        source: r.message.source,
        content: r.message.content,
        isEdited: r.message.isEdited,
        editedAt: r.message.editedAt ? { dateUtc: r.message.editedAt.toISOString(), dateShamsi: toShamsi(r.message.editedAt) } : null,
        specificationId: r.message.specificationId,
        parentMessageId: r.message.parentMessageId,
        isRead: r.isRead,
        createdAt: { dateUtc: r.message.createdAt.toISOString(), dateShamsi: toShamsi(r.message.createdAt) },
      },
      replies: r.message.replies.map((reply) => ({
        id: reply.id,
        senderId: reply.sender.id,
        senderName: [reply.sender.firstName, reply.sender.lastName].filter(Boolean).join(' ') || 'نامشخص',
        senderRole: reply.sender.role,
        source: reply.source,
        content: reply.content,
        isEdited: reply.isEdited,
        editedAt: reply.editedAt ? { dateUtc: reply.editedAt.toISOString(), dateShamsi: toShamsi(reply.editedAt) } : null,
        specificationId: reply.specificationId,
        parentMessageId: reply.parentMessageId,
        isRead: true,
        createdAt: { dateUtc: reply.createdAt.toISOString(), dateShamsi: toShamsi(reply.createdAt) },
      })),
    }));
  },

  async markAsRead(recipientId: string, messageId: string) {
    await prisma.messageRecipient.updateMany({
      where: { messageId, recipientId },
      data: { isRead: true, readAt: new Date() },
    });
  },

  async getPersistentNotifications(userId: string) {
    return prisma.persistentNotification.findMany({
      where: { recipientId: userId },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
  },
};
