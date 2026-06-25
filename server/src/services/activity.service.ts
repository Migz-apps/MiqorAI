import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export async function recordActivity(kind: string, text: string, actor?: string, metadata?: Record<string, unknown>) {
  await prisma.activityFeedEntry.create({
    data: { kind, text, actor, metadata: (metadata ?? {}) as Prisma.InputJsonValue },
  });
}
