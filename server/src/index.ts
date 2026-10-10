import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./shared/lib/logger.js";
import { connectDb, disconnectDb } from "./shared/lib/prisma.js";
import { connectRedis, disconnectRedis } from "./shared/lib/redis.js";
import { archiveOldAuditLogs } from "./modules/platform/sync.service.js";
import { ensureUploadDir } from "./shared/services/file.service.js";
import { seedReferenceDataIfEmpty } from "./shared/services/reference.service.js";
import { assertEmailDeliveryReady } from "./shared/services/notification.service.js";

async function main() {
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

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
      await disconnectRedis();
      await disconnectDb();
      process.exit(0);
    });
  };

  process.on("SIGINT", () => void shutdown("SIGINT"));
  process.on("SIGTERM", () => void shutdown("SIGTERM"));
}

main().catch((err) => {
  logger.error("Failed to start server", { err: (err as Error).message });
  process.exit(1);
});
