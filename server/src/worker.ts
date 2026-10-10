/**
 * MiqorAI background worker (ADR-001 §4): consumes the DomainEvent outbox and performs
 * slow or failure-prone side effects (SMS/email) off the HTTP request path.
 * Run alongside the API: `npm run start:worker` (prod) / `npm run dev:worker` (dev).
 * Delivery is at-least-once; every handler must be idempotent.
 */
import type { DomainEvent } from "@prisma/client";
import { connectDb, disconnectDb, prisma } from "./shared/lib/prisma.js";
import { logger } from "./shared/lib/logger.js";
import { sendSms } from "./shared/services/sms.service.js";

const POLL_MS = 5000;
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

let running = true;

async function loop() {
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
        await new Promise((resolve) => setTimeout(resolve, POLL_MS));
      }
    } catch (err) {
      logger.error(`worker loop error: ${err instanceof Error ? err.message : String(err)}`);
      await new Promise((resolve) => setTimeout(resolve, POLL_MS));
    }
  }
}

async function main() {
  await connectDb();
  logger.info("worker started: consuming domain events");
  const shutdown = async () => {
    running = false;
    setTimeout(async () => {
      await disconnectDb();
      process.exit(0);
    }, 1000);
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
  await loop();
}

main().catch((err) => {
  logger.error(`worker crashed: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
