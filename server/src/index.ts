import { createApp } from "./app.js";
import { config } from "./config.js";
import { logger } from "./lib/logger.js";
import { connectDb, disconnectDb } from "./lib/prisma.js";
import { connectRedis } from "./lib/redis.js";
import { archiveOldAuditLogs } from "./services/sync.service.js";
import { ensureUploadDir } from "./services/file.service.js";
import { seedReferenceDataIfEmpty } from "./services/reference.service.js";

async function main() {
  await connectDb();
  await connectRedis();
  await ensureUploadDir();
  await seedReferenceDataIfEmpty();

  const archived = await archiveOldAuditLogs(config.auditArchiveDays);
  if (archived > 0) logger.info(`Archived ${archived} audit log entries older than ${config.auditArchiveDays} days`);

  const app = createApp();
  const server = app.listen(config.port, () => {
    logger.info(`MiqorAI API listening on port ${config.port}`);
  });

  const shutdown = async (signal: string) => {
    logger.info(`${signal} received — shutting down`);
    server.close(async () => {
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
