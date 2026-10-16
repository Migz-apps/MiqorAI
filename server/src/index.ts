import { createApp } from "./app.js";
import { config, configWarnings } from "./config.js";
import { logger } from "./shared/lib/logger.js";
import { connectDb, disconnectDb } from "./shared/lib/prisma.js";
import { connectRedis, disconnectRedis } from "./shared/lib/redis.js";
import { archiveOldAuditLogs } from "./modules/platform/sync.service.js";
import { ensureUploadDir } from "./shared/services/file.service.js";
import { seedReferenceDataIfEmpty } from "./shared/services/reference.service.js";
import { assertEmailDeliveryReady } from "./shared/services/notification.service.js";
import { startWorkerLoops } from "./worker.js";

async function main() {
  for (const warning of configWarnings) logger.warn(warning);
  await connectDb();
  await connectRedis();
  await ensureUploadDir();
  await seedReferenceDataIfEmpty();
  await assertEmailDeliveryReady();

  const archived = await archiveOldAuditLogs(config.auditArchiveDays);
  if (archived > 0) logger.info(`Archived ${archived} audit log entries older than ${config.auditArchiveDays} days`);

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`MiqorAI API listening on port ${config.port}`);
  });

  // Combined-process default: the API also runs the worker loops (domain event
  // outbox + report schedules). Set WORKER_INLINE=false when a dedicated
  // worker process (npm run start:worker) is deployed alongside the API.
  const stopWorker = process.env.WORKER_INLINE === "false" ? null : startWorkerLoops();

  let shuttingDown = false;
  const shutdown = async (signal: string) => {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info(`${signal} received — shutting down`);

    // Keep-alive sockets would otherwise hold server.close() open until the
    // platform's SIGKILL; past the grace period, exit regardless.
    const forceExit = setTimeout(() => {
      logger.error(`shutdown exceeded ${config.shutdownTimeoutMs}ms — forcing exit`);
      server.closeAllConnections();
      process.exit(1);
    }, config.shutdownTimeoutMs);
    forceExit.unref();

    const serverClosed = new Promise<void>((resolve) => server.close(() => resolve()));
    server.closeIdleConnections();
    try {
      await Promise.all([serverClosed, stopWorker?.()]);
      await disconnectRedis();
      await disconnectDb();
      clearTimeout(forceExit);
      process.exit(0);
    } catch (err) {
      logger.error("shutdown failed", { err: err instanceof Error ? err.message : String(err) });
      process.exit(1);
    }
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Failed to start server", { err: (err as Error).message });
  process.exit(1);
});
