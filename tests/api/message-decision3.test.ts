/**
 * tests/api/message-decision3.test.ts — Message deletion with replies
 * (Agent Guide DECISION 3: replace with placeholder, keep replies).
 */

import { messageService } from '../../apps/api/src/services/message.service';
import { prisma } from '../../apps/api/src/prisma/prisma.client';
import { Role, MessageSource } from '@unify/shared-types';

describe('Message Service — Delete with replies (DECISION 3)', () => {
  let profId: string;
  let studentId: string;
  let rootMsgId: string;
  let replyId: string;

  beforeAll(async () => {
    const prof = await prisma.user.create({
      data: {
        username: 'test-prof-msg-' + Date.now(),
        passwordHash: 'test',
        role: Role.PROFESSOR,
        isActive: true,
        onboardingComplete: true,
      },
    });
    const student = await prisma.user.create({
      data: {
        username: 'test-stu-msg-' + Date.now(),
        passwordHash: 'test',
        role: Role.STUDENT,
        isActive: true,
        onboardingComplete: true,
      },
    });
    profId = prof.id;
    studentId = student.id;

    const root = await prisma.message.create({
      data: {
        senderId: profId,
        content: 'پیام اصلی',
        source: MessageSource.PROFESSOR_BROADCAST,
      },
    });
    rootMsgId = root.id;

    const reply = await prisma.message.create({
      data: {
        senderId: studentId,
        content: 'پاسخ دانشجو',
        parentMessageId: rootMsgId,
        source: MessageSource.STUDENT_REPLY,
      },
    });
    replyId = reply.id;
  });

  afterAll(async () => {
    await prisma.message.deleteMany({
      where: { OR: [{ id: rootMsgId }, { id: replyId }, { parentMessageId: rootMsgId }] },
    });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'test-' } } });
    await prisma.$disconnect();
  });

  it('replaces message content with placeholder when replies exist', async () => {
    await messageService.deleteMessage(profId, Role.PROFESSOR, rootMsgId);
    const updated = await prisma.message.findUnique({ where: { id: rootMsgId } });
    expect(updated?.content).toContain('[پیام اصلی توسط استاد حذف شده است]');
    expect(updated?.isEdited).toBe(true);
  });

  it('keeps the replies intact', async () => {
    const replies = await prisma.message.findMany({ where: { parentMessageId: rootMsgId } });
    expect(replies.length).toBeGreaterThan(0);
    expect(replies[0].content).toBe('پاسخ دانشجو');
  });

  it('hard-deletes a message with no replies', async () => {
    const orphan = await prisma.message.create({
      data: {
        senderId: profId,
        content: 'بدون پاسخ',
        source: MessageSource.PROFESSOR_DIRECT,
      },
    });
    await messageService.deleteMessage(profId, Role.PROFESSOR, orphan.id);
    const after = await prisma.message.findUnique({ where: { id: orphan.id } });
    expect(after).toBeNull();
  });
});
