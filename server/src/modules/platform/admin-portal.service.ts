import { OnboardingType } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { notFound } from "../../shared/utils/errors.js";
import { saveExportFile } from "../../shared/services/file.service.js";
import { generatePdfReport } from "../../shared/services/report.service.js";
import { getOrgSettings, setOrgSettings } from "./org-settings.service.js";

export async function getAdminActivityFeed() {
  return prisma.activityFeedEntry.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export async function getComplianceSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [eventsToday, failedLogins, dataExports] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.loginAttempt.count({ where: { lockedUntil: { gte: todayStart } } }),
    prisma.auditLog.count({ where: { action: { contains: "export" }, createdAt: { gte: todayStart } } }),
  ]);
  return { events_today: eventsToday, failed_logins: failedLogins, data_exports: dataExports };
}

export async function getInsurerStats() {
  const [insurers, memberCounts, rev] = await Promise.all([
    prisma.insurer.findMany({ where: { isActive: true } }),
    prisma.insurerMember.groupBy({ by: ["insurerId"], _count: { id: true } }),
    prisma.revenueSnapshot.findFirst({ orderBy: { month: "desc" } }),
  ]);
  const membersByInsurer = new Map(memberCounts.map((c) => [c.insurerId, c._count.id]));
  const totalMembers = [...membersByInsurer.values()].reduce((s, n) => s + n, 0);
  return insurers.map((ins) => {
    const members = membersByInsurer.get(ins.id) ?? 0;
    // Apportion insurer revenue by member share: an estimate, but a data-driven one.
    const share = totalMembers > 0 ? members / totalMembers : 0;
    return { id: ins.id, name: ins.name, members, mrr: rev ? Number(rev.insurersRevenue) * share : 0 };
  });
}

export async function getPharmacyDetail(id: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { email: true } } } } },
  });
  if (!pharmacy) throw notFound("Pharmacy not found");
  const dispensed = await prisma.prescription.count({ where: { pharmacyId: id, status: "dispensed" } });
  return { ...pharmacy, dispensed_count: dispensed };
}

export async function rejectPharmacy(id: string, reason: string, reviewedBy: string) {
  await prisma.pharmacy.update({ where: { id }, data: { isActive: false } });
  await prisma.onboardingRequest.updateMany({
    where: { organizationId: id, type: "pharmacy" },
    data: { status: "rejected", rejectReason: reason, reviewedBy, reviewedAt: new Date() },
  });
  return { status: "rejected" };
}

export async function getHospitalsStatsFiltered(pilotEndingSoon?: boolean) {
  const hospitals = await prisma.hospital.findMany({ where: { isActive: true } });
  const counts = await prisma.visit.groupBy({ by: ["hospitalId"], _count: { id: true } });
  const countByHospital = new Map(counts.map((c) => [c.hospitalId, c._count.id]));
  const now = Date.now();
  const items = hospitals.map((h) => {
    const days = h.pilotEndDate ? Math.ceil((h.pilotEndDate.getTime() - now) / 86400000) : null;
    return {
      id: h.id,
      name: h.name,
      code: h.code,
      verified: h.verified,
      pilot_days_remaining: days,
      visit_count: countByHospital.get(h.id) ?? 0,
    };
  });
  if (pilotEndingSoon) {
    return items.filter((h) => h.pilot_days_remaining !== null && h.pilot_days_remaining <= 30 && h.pilot_days_remaining >= 0);
  }
  return items;
}

export async function getAdminPatientDetail(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true } }, insurerMembers: { include: { insurer: true } } },
  });
  if (!patient) throw notFound("Patient not found");
  const visits = await prisma.visit.count({ where: { patientId: id } });
  const flag = (await getOrgSettings("admin_patient_flag", id)) as { flagged?: boolean };
  return {
    ...patient,
    visit_count: visits,
    insurer: patient.insurerMembers[0]?.insurer.name,
    flagged: flag.flagged ?? false,
  };
}

export async function setAdminPatientStatus(id: string, flagged: boolean) {
  await setOrgSettings("admin_patient_flag", id, { flagged });
  return { flagged };
}

export async function getDisputeDetail(id: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) throw notFound("Dispute not found");
  const logs = await prisma.auditLog.findMany({ where: { resourceId: id }, take: 30, orderBy: { createdAt: "desc" } });
  return { dispute, investigation_log: logs };
}

export async function createAdminInvoice(input: {
  customer_type: string;
  customer_id: string;
  amount: number;
  due_date: string;
}) {
  const period = new Date().toISOString().slice(0, 7);
  return prisma.platformInvoice.create({
    data: {
      customerType: input.customer_type,
      customerId: input.customer_id,
      customerName: input.customer_type,
      period,
      amount: input.amount,
      dueDate: new Date(input.due_date),
      status: "pending",
    },
  });
}

export async function getExtendedSystemHealth() {
  const base = await import("./admin.service.js").then((m) => m.getSystemHealth());
  const { checkAiServiceHealth } = await import("../clinical/ai-clinical-safety.client.js");
  const aiStart = Date.now();
  const ai = await checkAiServiceHealth().catch(() => null);
  return {
    ...base,
    ml_inference: ai
      ? { status: "up", latency_ms: Date.now() - aiStart }
      : { status: "down", latency_ms: null },
  };
}

export async function getSystemLatencySeries() {
  // Measure one real round-trip instead of fabricating a series.
  const t0 = Date.now();
  await prisma.$queryRaw`SELECT 1`;
  const dbMs = Date.now() - t0;
  return [{ hour: new Date().getUTCHours(), api_ms: null, db_ms: dbMs, redis_ms: null }];
}

export async function exportAdminDashboardSnapshot(userId: string) {
  const dashboard = await import("./admin.service.js").then((m) => m.getAdminDashboard());
  const pdf = await generatePdfReport("Platform snapshot", dashboard);
  const url = await saveExportFile(userId, "admin-snapshot.pdf", pdf, "application/pdf");
  return { download_url: url };
}

export async function generateAdminInsurerReport(userId: string) {
  const insurers = await prisma.insurer.findMany();
  const pdf = await generatePdfReport("Insurer network report", { insurers: insurers.map((i) => ({ name: i.name, code: i.code })) });
  const url = await saveExportFile(userId, "insurer-report.pdf", pdf, "application/pdf");
  return { download_url: url };
}

export async function getEnrichedAdminPatients(limit = 50) {
  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    take: limit,
    include: { user: { select: { email: true } }, insurerMembers: { include: { insurer: true } } },
    orderBy: { createdAt: "desc" },
  });
  const result = [];
  for (const p of patients) {
    const visits = await prisma.visit.count({ where: { patientId: p.id } });
    const flag = (await getOrgSettings("admin_patient_flag", p.id)) as { flagged?: boolean };
    result.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.user.email,
      insurer: p.insurerMembers[0]?.insurer?.name,
      visit_count: visits,
      flagged: flag.flagged ?? false,
    });
  }
  return result;
}

export async function getTransactionsLedger(limit = 100) {
  const entries = await prisma.activityFeedEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    description: e.text,
    amount: (e.metadata as { amount?: number })?.amount ?? 0,
    at: e.createdAt,
  }));
}

export async function submitOnboardingExtended(input: {
  type: OnboardingType;
  name: string;
  registration_ref: string;
  location?: string;
  submitted_by_email: string;
  phone?: string;
  password?: string;
  manager_name?: string;
}) {
  const { createOnboardingRequest } = await import("./admin.service.js");
  const row = await createOnboardingRequest({
    type: input.type,
    name: input.name,
    registration_ref: input.registration_ref,
    location: input.location,
    submitted_by_email: input.submitted_by_email,
  });
  if (input.phone && input.password && input.type === "pharmacy") {
    await setOrgSettings("onboarding_credentials", row.id, {
      phone: input.phone,
      manager_name: input.manager_name,
    });
  }
  return row;
}
