/**
 * src/server.ts — HTTP server bootstrap with Socket.io.
 */

import http from 'http';
import { createApp } from './app';
import { config } from './config';
import { logger } from './utils/logger';
import { initSocketServer } from './socket/socket.server';
import { disconnectPrisma } from './prisma/prisma.client';
import { startJobWorkers, stopJobWorkers } from './jobs/job-runner';

async function main() {
  const app = createApp();
  const httpServer = http.createServer(app);

  initSocketServer(httpServer);

  // Start BullMQ workers UNLESS running with SKIP_JOB_WORKERS=true
  // (e.g. when jobs run in a separate process for scaling — Agent Guide §F.6)
  if (process.env.SKIP_JOB_WORKERS !== 'true') {
    try {
      await startJobWorkers();
    } catch (err) {
      logger.warn({ err }, 'Job workers failed to start; running without background jobs');
    }
  } else {
    logger.info('SKIP_JOB_WORKERS=true — job workers disabled in this process');
  }

  httpServer.listen(config.apiPort, () => {
    logger.info(`🚀 Unify API listening on port ${config.apiPort} (${config.env})`);
    logger.info(`📅 Timezone: ${config.timezone}`);
    logger.info(`📁 Storage: ${config.storage.basePath}`);
    logger.info(`🔔 Pushe enabled: ${config.pushe.enabled}`);
  });

  // ── Graceful shutdown ────────────────────────────────────────────────────
  const shutdown = async (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully...`);
    httpServer.close(() => {
      logger.info('HTTP server closed');
    });
    await stopJobWorkers();
    await disconnectPrisma();
    process.exit(0);
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('uncaughtException', (err) => {
    logger.error({ err }, 'Uncaught exception');
  });
  process.on('unhandledRejection', (reason) => {
    logger.error({ reason }, 'Unhandled rejection');
  });
}

main().catch((err) => {
  logger.error({ err }, 'Failed to start server');
  process.exit(1);
});
