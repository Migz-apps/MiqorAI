import { Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "./lib/prisma.js";

type DbClient = Prisma.TransactionClient | PrismaClient;

/** Transactional-outbox domain events (ADR-001 §3). Producers append inside the same
 * transaction as the state change; the worker (src/worker.ts) consumes asynchronously.
 * Consumers must be idempotent: delivery is at-least-once. */
export type DomainEventType =
  | "PrescriptionCreated"
  | "PrescriptionDispensed"
  | "DiagnosisRecorded"
  | "ClaimFlagged"
  | "SafetyOverridden"
  | "ReferralCreated";

export async function publishEvent(
  type: DomainEventType,
  payload: Record<string, unknown>,
  db: DbClient = prisma,
) {
  await db.domainEvent.create({ data: { type, payload: payload as Prisma.InputJsonValue } });
}
