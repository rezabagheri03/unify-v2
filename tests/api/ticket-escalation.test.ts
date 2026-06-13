/**
 * tests/api/ticket-escalation.test.ts — Ticket escalation & reply tests.
 */

import { ticketService } from '../../apps/api/src/services/ticket.service';
import { prisma } from '../../apps/api/src/prisma/prisma.client';
import { Role, TicketDepartment, TicketStatus } from '@unify/shared-types';

describe('Ticket Service', () => {
  let studentId: string;
  let expertId: string;
  let adminId: string;
  let ticketId: string;

  beforeAll(async () => {
    const student = await prisma.user.create({
      data: {
        username: 'test-student-' + Date.now(),
        passwordHash: 'test',
        role: Role.STUDENT,
        isActive: true,
        onboardingComplete: true,
      },
    });
    const expert = await prisma.user.create({
      data: {
        username: 'test-expert-' + Date.now(),
        passwordHash: 'test',
        role: Role.EXPERT,
        isActive: true,
        onboardingComplete: true,
      },
    });
    const admin = await prisma.user.create({
      data: {
        username: 'test-admin-' + Date.now(),
        passwordHash: 'test',
        role: Role.SYSTEM_ADMIN,
        isActive: true,
        onboardingComplete: true,
      },
    });
    studentId = student.id;
    expertId = expert.id;
    adminId = admin.id;

    // Manually create ticket (avoid calling job scheduler)
    const ticket = await prisma.ticket.create({
      data: {
        studentId,
        department: TicketDepartment.EDUCATION,
        content: 'Test ticket content',
        status: TicketStatus.OPEN,
      },
    });
    ticketId = ticket.id;
  });

  afterAll(async () => {
    await prisma.ticket.deleteMany({ where: { studentId } });
    await prisma.user.deleteMany({ where: { username: { startsWith: 'test-' } } });
    await prisma.$disconnect();
  });

  it('reply by expert changes status to ANSWERED', async () => {
    await ticketService.reply(ticketId, expertId, Role.EXPERT, 'پاسخ آزمایشی', null);
    const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(t?.status).toBe(TicketStatus.ANSWERED);
  });

  it('expert can close the ticket', async () => {
    await ticketService.closeTicket(expertId, Role.EXPERT, ticketId, 'resolved');
    const t = await prisma.ticket.findUnique({ where: { id: ticketId } });
    expect(t?.status).toBe(TicketStatus.CLOSED);
  });

  it('student cannot close ticket', async () => {
    await expect(
      ticketService.closeTicket(studentId, Role.STUDENT, ticketId, 'trying'),
    ).rejects.toThrow();
  });
});
