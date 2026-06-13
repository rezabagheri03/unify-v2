/**
 * src/jobs/standalone.ts — Standalone job runner process.
 * Run separately from the API for proper scaling (Agent Guide §F.6).
 *
 * Usage: node dist/jobs/standalone.js
 * Or via PM2: ecosystem.config.js → unify-jobs
 */

import { startJobWorkers, stopJobWorkers } from './job-runner';
import { logger } from '../utils/logger';
import { disconnectPrisma } from '../prisma/prisma.client';

async function main() {
  logger.info('🔧 Starting background job workers (standalone)...');
  await startJobWorkers();
  logger.info('✅ All job workers running. Press Ctrl+C to stop.');

  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, stopping job workers...`);
    await stopJobWorkers();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((err) => {
  logger.error({ err }, 'Job workers failed to start');
  process.exit(1);
});
