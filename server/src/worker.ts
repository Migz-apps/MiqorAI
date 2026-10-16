/**
 * MiqorAI background worker (ADR-001 §4): consumes the DomainEvent outbox and
 * executes due ReportSchedule rows, keeping slow or failure-prone side effects
 * (SMS/email/report generation) off the HTTP request path.
 *
 * Runs two ways:
 * - standalone: `npm run start:worker` (prod) / `npm run dev:worker` (dev)
 * - inline inside the API process (src/index.ts), which is the default so a
 *   single-process deployment still executes outbox events and schedules; set
 *   WORKER_INLINE=false there when a dedicated worker process is running.
 *
 * Delivery is at-least-once; every handler must be idempotent.
 */
import { pathToFileURL } from "url";
import type { DomainEvent } from "@prisma/client";
import { connectDb, disconnectDb, prisma } from "./shared/lib/prisma.js";
import { logger } from "./shared/lib/logger.js";
import { sendSms } from "./shared/services/sms.service.js";
import { processDueReportSchedules } from "./modules/platform/report-runner.service.js";

const POLL_MS = 5000;
const SCHEDULE_POLL_MS = 60_000;
const BATCH = 20;
const MAX_ATTEMPTS = 5;

type Handler = (payload: Record<string, unknown>) => Promise<void>;

const handlers: Record<string, Handler> = {
  async ReferralCreated(p) {
    const phone = p.notify_phone as string | null;
    if (!phone) return;
    await sendSms(phone, `Referral created: ${String(p.reason)}. Urgency: ${String(p.urgency)}.`);
  },
  // Observability no-ops today; surveillance/notification consumers attach here later.
  async PrescriptionCreated() {},
  async PrescriptionDispensed() {},
  async DiagnosisRecorded() {},
  async ClaimFlagged() {},
  async SafetyOverridden() {},
};

async function processEvent(event: DomainEvent) {
  const handler = handlers[event.type];
  try {
    if (handler) await handler(event.payload as Record<string, unknown>);
    else logger.warn(`no handler for domain event ${event.type}`);
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), attempts: { increment: 1 }, lastError: null },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const attempts = event.attempts + 1;
    await prisma.domainEvent.update({
      where: { id: event.id },
      data: {
        attempts,
        lastError: message.slice(0, 500),
        // park permanently failed events so they stop blocking the queue
        ...(attempts >= MAX_ATTEMPTS ? { processedAt: new Date() } : {}),
      },
    });
    logger.error(`domain event failed: ${event.type} ${event.id} attempt ${attempts}: ${message}`);
  }
}

let running = false;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function outboxLoop() {
  while (running) {
    try {
      const batch = await prisma.domainEvent.findMany({
        where: { processedAt: null, attempts: { lt: MAX_ATTEMPTS } },
        orderBy: { createdAt: "asc" },
        take: BATCH,
      });
      for (const event of batch) {
        if (!running) break;
        await processEvent(event);
      }
      if (batch.length < BATCH) {
        await sleep(POLL_MS);
      }
    } catch (err) {
      logger.error(`worker loop error: ${err instanceof Error ? err.message : String(err)}`);
      await sleep(POLL_MS);
    }
  }
}

/** Report schedules run on their own cadence so a slow report generation never
 * delays outbox consumption (and vice versa). Failures are logged per schedule
 * inside processDueReportSchedules; a crash here only skips one cycle. */
async function scheduleLoop() {
  while (running) {
    try {
      await processDueReportSchedules();
    } catch (err) {
      logger.error(`report schedule loop error: ${err instanceof Error ? err.message : String(err)}`);
    }
    await sleep(SCHEDULE_POLL_MS);
  }
}

/** Starts the outbox and report-schedule loops; returns a stop function. */
export function startWorkerLoops(): () => void {
  if (running) return () => undefined;
  running = true;
  void outboxLoop();
  void scheduleLoop();
  logger.info("worker started: consuming domain events and report schedules");
  return () => {
    running = false;
  };
}

async function main() {
  await connectDb();
  const stop = startWorkerLoops();
  const shutdown = () => {
    stop();
    setTimeout(async () => {
      await disconnectDb();
      process.exit(0);
    }, 1000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

// Only run standalone when executed directly (node dist/worker.js / tsx src/worker.ts);
// importing startWorkerLoops (API inline mode) must not boot a second runtime.
const isMain = process.argv[1] ? import.meta.url === pathToFileURL(process.argv[1]).href : false;
if (isMain) {
  main().catch((err) => {
    logger.error(`worker crashed: ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  });
}
