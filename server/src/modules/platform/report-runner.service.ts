/**
 * Executes ReportSchedule rows (created from the hospital and insurer portals):
 * finds due schedules, generates the report through the same path as the
 * on-demand routes (persisting a FileAsset via saveExportFile), advances
 * lastRunAt/nextRunAt and emails the schedule's recipient. Driven by the
 * worker's schedule loop.
 */
import type { ReportSchedule } from "@prisma/client";
import { UserRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { logger } from "../../shared/lib/logger.js";
import { sendScheduledReportEmail } from "../../shared/services/notification.service.js";
import { generateHospitalReport } from "../clinical/hospital-insights.service.js";
import { generateInsurerReport } from "../financing/insurer.service.js";

const DAY_MS = 86_400_000;

export function computeNextRunAt(from: Date, frequency: string): Date {
  const normalized = frequency.trim().toLowerCase();
  if (normalized === "daily") return new Date(from.getTime() + DAY_MS);
  if (normalized === "weekly") return new Date(from.getTime() + 7 * DAY_MS);
  if (normalized === "monthly") {
    const next = new Date(from);
    next.setMonth(next.getMonth() + 1);
    return next;
  }
  throw new Error(`Unsupported report schedule frequency: ${frequency}`);
}

function periodStart(now: Date, frequency: string): Date {
  const normalized = frequency.trim().toLowerCase();
  if (normalized === "daily") return new Date(now.getTime() - DAY_MS);
  if (normalized === "weekly") return new Date(now.getTime() - 7 * DAY_MS);
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  return start;
}

const OWNER_ADMIN_ROLE: Record<string, UserRole> = {
  hospital: UserRole.hospital_admin,
  insurer: UserRole.insurer_admin,
};

/** The schedule stores no creator, so the report is owned by (and announced to)
 * the organization's admin user, falling back to any active member. */
async function resolveOwnerUser(ownerType: string, ownerId: string) {
  const adminRole = OWNER_ADMIN_ROLE[ownerType];
  const admin = adminRole
    ? await prisma.user.findFirst({
        where: { organizationId: ownerId, role: adminRole, isActive: true },
        orderBy: { createdAt: "asc" },
      })
    : null;
  const user =
    admin ??
    (await prisma.user.findFirst({
      where: { organizationId: ownerId, isActive: true },
      orderBy: { createdAt: "asc" },
    }));
  if (!user) throw new Error(`No active user found for ${ownerType} ${ownerId}`);
  return user;
}

async function runSchedule(schedule: ReportSchedule, now: Date): Promise<void> {
  const user = await resolveOwnerUser(schedule.ownerType, schedule.ownerId);

  let downloadUrl: string;
  if (schedule.ownerType === "hospital") {
    const result = await generateHospitalReport(schedule.ownerId, user.id, schedule.reportType, "pdf");
    downloadUrl = result.download_url;
  } else if (schedule.ownerType === "insurer") {
    const result = await generateInsurerReport(schedule.ownerId, user.id, {
      date_range: { start: periodStart(now, schedule.frequency).toISOString(), end: now.toISOString() },
      metrics: [schedule.reportType],
      format: "pdf",
    });
    downloadUrl = result.report_url;
  } else {
    throw new Error(`Unsupported report schedule owner type: ${schedule.ownerType}`);
  }

  const recipient = schedule.email ?? user.email;
  await sendScheduledReportEmail(recipient, `${schedule.reportType} (${schedule.frequency})`, downloadUrl);
}

/** Runs every due schedule once. A failing schedule is logged and pushed
 * forward so it can neither block other schedules nor hot-loop the worker. */
export async function processDueReportSchedules(now = new Date()): Promise<{ executed: number; failed: number }> {
  const due = await prisma.reportSchedule.findMany({
    where: { isActive: true, OR: [{ nextRunAt: null }, { nextRunAt: { lte: now } }] },
    orderBy: { createdAt: "asc" },
  });

  let executed = 0;
  let failed = 0;
  for (const schedule of due) {
    try {
      if (!schedule.nextRunAt) {
        // First sighting of the schedule: anchor its cadence, run it next cycle.
        await prisma.reportSchedule.update({
          where: { id: schedule.id },
          data: { nextRunAt: computeNextRunAt(now, schedule.frequency) },
        });
        continue;
      }
      await runSchedule(schedule, now);
      await prisma.reportSchedule.update({
        where: { id: schedule.id },
        data: { lastRunAt: now, nextRunAt: computeNextRunAt(now, schedule.frequency) },
      });
      executed += 1;
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      logger.error(`report schedule failed: ${schedule.id} (${schedule.ownerType}/${schedule.reportType}): ${message}`);
      let nextRunAt: Date;
      try {
        nextRunAt = computeNextRunAt(now, schedule.frequency);
      } catch {
        nextRunAt = new Date(now.getTime() + DAY_MS);
      }
      await prisma.reportSchedule
        .update({ where: { id: schedule.id }, data: { nextRunAt } })
        .catch(() => undefined);
    }
  }

  return { executed, failed };
}
