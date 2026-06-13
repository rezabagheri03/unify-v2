/**
 * tests/api/auth.test.ts — Auth integration tests.
 * Runs against a real DB; use a test DB or mocks.
 */

import { prisma } from '../../apps/api/src/prisma/prisma.client';
import { authService } from '../../apps/api/src/services/auth.service';
import { hashPassword } from '../../apps/api/src/utils/bcrypt';
import { Role } from '@unify/shared-types';

describe('AuthService', () => {
  const testUsername = 'test-user-' + Date.now();
  let testUserId: string;

  beforeAll(async () => {
    const hash = await hashPassword('Test1234!@');
    const user = await prisma.user.create({
      data: {
        username: testUsername,
        passwordHash: hash,
        role: Role.STUDENT,
        onboardingComplete: true,
        isActive: true,
      },
    });
    testUserId = user.id;
  });

  afterAll(async () => {
    await prisma.user.delete({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('login', () => {
    it('returns tokens on valid credentials', async () => {
      const result = await authService.login(testUsername, 'Test1234!@');
      expect(result.accessToken).toBeDefined();
      expect(result.refreshToken).toBeDefined();
      expect(result.role).toBe(Role.STUDENT);
    });

    it('throws on wrong password', async () => {
      await expect(authService.login(testUsername, 'wrong')).rejects.toThrow();
    });

    it('throws on non-existent user', async () => {
      await expect(authService.login('nonexistent', 'Test1234!@')).rejects.toThrow();
    });
  });

  describe('changePassword', () => {
    it('rejects passwords not meeting complexity requirements', async () => {
      await expect(
        authService.changePassword(testUserId, 'Test1234!@', 'weak'),
      ).rejects.toThrow();
    });
  });
});
