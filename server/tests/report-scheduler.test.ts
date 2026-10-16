import { afterAll, describe, expect, it } from "vitest";
import { getContext } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { processDueReportSchedules } from "../src/modules/platform/report-runner.service.js";

const suffix = Date.now().toString().slice(-8);
const createdScheduleIds: string[] = [];

async function createSchedule(data: {
  ownerType: string;
  ownerId: string;
  reportType: string;
  frequency: string;
  nextRunAt: Date | null;
}) {
  const row = await prisma.reportSchedule.create({
    data: {
      ownerType: data.ownerType,
      ownerId: data.ownerId,
      reportType: data.reportType,
      frequency: data.frequency,
      email: `schedule.${suffix}@example.com`,
      nextRunAt: data.nextRunAt,
    },
  });
  createdScheduleIds.push(row.id);
  return row;
}

describe("Report schedule runner", () => {
  afterAll(async () => {
    await prisma.reportSchedule.deleteMany({ where: { id: { in: createdScheduleIds } } });
  });

  it("executes a due hospital schedule once and stores the report as a FileAsset", async () => {
    const c = getContext();
    const schedule = await createSchedule({
      ownerType: "hospital",
      ownerId: c.hospitalId,
      reportType: "census",
      frequency: "weekly",
      nextRunAt: new Date(Date.now() - 1000),
    });
    const assetsBefore = await prisma.fileAsset.count({ where: { resourceType: "export" } });

    const result = await processDueReportSchedules();
    expect(result.executed).toBeGreaterThanOrEqual(1);

    const updated = await prisma.reportSchedule.findUnique({ where: { id: schedule.id } });
    expect(updated?.lastRunAt).toBeTruthy();
    expect(updated?.nextRunAt?.getTime()).toBeGreaterThan(Date.now());

    const assetsAfter = await prisma.fileAsset.count({ where: { resourceType: "export" } });
    expect(assetsAfter).toBeGreaterThan(assetsBefore);

    // Not due anymore: a second pass must not run it again.
    const second = await processDueReportSchedules();
    const unchanged = await prisma.reportSchedule.findUnique({ where: { id: schedule.id } });
    expect(unchanged?.lastRunAt?.getTime()).toBe(updated?.lastRunAt?.getTime());
    expect(second.failed).toBe(0);
  });

  it("executes a due insurer schedule through the insurer report path", async () => {
    const c = getContext();
    const schedule = await createSchedule({
      ownerType: "insurer",
      ownerId: c.insurerId,
      reportType: "fraud",
      frequency: "monthly",
      nextRunAt: new Date(Date.now() - 1000),
    });

    await processDueReportSchedules();

    const updated = await prisma.reportSchedule.findUnique({ where: { id: schedule.id } });
    expect(updated?.lastRunAt).toBeTruthy();

    const history = await prisma.reportHistory.findFirst({
      where: { ownerType: "insurer", ownerId: c.insurerId },
      orderBy: { createdAt: "desc" },
    });
    expect(history).toBeTruthy();
  });

  it("anchors a schedule without nextRunAt instead of running it immediately", async () => {
    const c = getContext();
    const schedule = await createSchedule({
      ownerType: "hospital",
      ownerId: c.hospitalId,
      reportType: "census",
      frequency: "daily",
      nextRunAt: null,
    });

    await processDueReportSchedules();

    const updated = await prisma.reportSchedule.findUnique({ where: { id: schedule.id } });
    expect(updated?.lastRunAt).toBeNull();
    expect(updated?.nextRunAt).toBeTruthy();
  });

  it("a failing schedule is logged and advanced without blocking others", async () => {
    const c = getContext();
    const broken = await createSchedule({
      ownerType: "bogus",
      ownerId: c.hospitalId,
      reportType: "census",
      frequency: "weekly",
      nextRunAt: new Date(Date.now() - 1000),
    });
    const healthy = await createSchedule({
      ownerType: "hospital",
      ownerId: c.hospitalId,
      reportType: "census",
      frequency: "weekly",
      nextRunAt: new Date(Date.now() - 1000),
    });

    const result = await processDueReportSchedules();
    expect(result.failed).toBeGreaterThanOrEqual(1);
    expect(result.executed).toBeGreaterThanOrEqual(1);

    const brokenRow = await prisma.reportSchedule.findUnique({ where: { id: broken.id } });
    expect(brokenRow?.lastRunAt).toBeNull();
    expect(brokenRow?.nextRunAt?.getTime()).toBeGreaterThan(Date.now());

    const healthyRow = await prisma.reportSchedule.findUnique({ where: { id: healthy.id } });
    expect(healthyRow?.lastRunAt).toBeTruthy();
  });
});
