/**
 * src/prisma/prisma.client.ts — Singleton Prisma client.
 */

import { PrismaClient } from '@prisma/client';
import { config } from '../config';

declare global {
  // eslint-disable-next-line no-var
  var __unify_prisma: PrismaClient | undefined;
}

export const prisma =
  global.__unify_prisma ??
  new PrismaClient({
    log: config.isDevelopment ? ['warn', 'error'] : ['error'],
  });

if (!config.isProduction) {
  global.__unify_prisma = prisma;
}

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
