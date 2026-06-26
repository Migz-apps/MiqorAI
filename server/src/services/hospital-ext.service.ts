import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { saveExportFile } from "./file.service.js";
import { generatePdfReport, toCsv } from "./report.service.js";
import { notFound } from "../utils/errors.js";
import { recordActivity } from "./activity.service.js";

export async function getOrgSettings(scope: string, orgId: string) {
  const row = await prisma.platformSetting.findUnique({ where: { key: `${scope}:${orgId}` } });
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function setOrgSettings(scope: string, orgId: string, value: Record<string, unknown>) {
  const key = `${scope}:${orgId}`;
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  return value;
}

export async function listDepartments(hospitalId: string) {
  return prisma.department.findMany({
    where: { hospitalId },
    orderBy: { name: "asc" },
  });
}

export async function createDepartment(
  hospitalId: string,
  input: { name: string; code: string; head_staff_id?: string; sla_target_minutes?: number },
) {
  return prisma.department.create({
    data: {
      hospitalId,
      name: input.name,
      code: input.code,
      headStaffId: input.head_staff_id,
      slaTargetMinutes: input.sla_target_minutes ?? 30,
    },
  });
}

export async function updateDepartment(
  hospitalId: string,
  id: string,
  input: Partial<{ name: string; head_staff_id: string | null; sla_target_minutes: number; is_active: boolean }>,
) {
  const row = await prisma.department.findFirst({ where: { id, hospitalId } });
  if (!row) throw notFound("Department not found");
  return prisma.department.update({
    where: { id },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.head_staff_id !== undefined ? { headStaffId: input.head_staff_id } : {}),
      ...(input.sla_target_minutes !== undefined ? { slaTargetMinutes: input.sla_target_minutes } : {}),
      ...(input.is_active !== undefined ? { isActive: input.is_active } : {}),
    },
  });
}

export async function listHospitalNotifications(hospitalId: string, userId?: string) {
  return prisma.hospitalNotification.findMany({
    where: { hospitalId, ...(userId ? { OR: [{ userId }, { userId: null }] } : {}) },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function markNotificationRead(hospitalId: string, id: string) {
  await prisma.hospitalNotification.updateMany({
    where: { id, hospitalId },
    data: { read: true },
  });
}

export async function getHospitalBilling(hospitalId: string) {
  let sub = await prisma.hospitalSubscription.findUnique({ where: { hospitalId } });
  if (!sub) {
    const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
    sub = await prisma.hospitalSubscription.create({
      data: {
        hospitalId,
        plan: "enterprise",
        monthlyFee: 499,
        scriptsUsed: await prisma.prescription.count({ where: { hospitalId } }),
        scriptsLimit: 5000,
        pilotEndDate: hospital?.pilotEndDate,
      },
    });
  }
  const invoices = await prisma.platformInvoice.findMany({
    where: { customerType: "hospital", customerId: hospitalId },
    orderBy: { createdAt: "desc" },
    take: 12,
  });
  return {
    plan: sub.plan,
    monthly_fee: Number(sub.monthlyFee),
    scripts_used: sub.scriptsUsed,
    scripts_limit: sub.scriptsLimit,
    status: sub.status,
    pilot_end_date: sub.pilotEndDate,
    invoices,
  };
}

export async function generateHospitalReport(
  hospitalId: string,
  userId: string,
  type: string,
  format: "pdf" | "csv",
) {
  const visits = await prisma.visit.count({ where: { hospitalId } });
  const patients = await prisma.visit.groupBy({
    by: ["patientId"],
    where: { hospitalId },
  });
  const payload = { type, visits, unique_patients: patients.length, generated_at: new Date().toISOString() };
  const content =
    format === "pdf"
      ? await generatePdfReport(`Hospital ${type} report`, payload)
      : toCsv([
          { metric: "visits", value: visits },
          { metric: "unique_patients", value: patients.length },
        ]);
  const url = await saveExportFile(
    userId,
    `hospital-${type}.${format === "pdf" ? "pdf" : "csv"}`,
    content,
    format === "pdf" ? "application/pdf" : "text/csv",
  );
  await prisma.reportHistory.create({
    data: {
      ownerType: "hospital",
      ownerId: hospitalId,
      title: `${type} report`,
      format,
      downloadUrl: url,
      createdBy: userId,
    },
  });
  return { download_url: url };
}

export async function listHospitalReports(hospitalId: string) {
  return prisma.reportHistory.findMany({
    where: { ownerType: "hospital", ownerId: hospitalId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function getPatientAiSummary(hospitalId: string, patientId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      medicalRecords: { where: { isActive: true }, take: 10 },
      prescriptions: { where: { hospitalId }, take: 5, include: { items: true } },
      labOrders: { where: { hospitalId }, take: 5, orderBy: { orderedAt: "desc" } },
    },
  });
  if (!patient) throw notFound("Patient not found");

  const conditions = patient.medicalRecords
    .filter((r) => r.recordType === "diagnosis")
    .map((r) => (r.data as { name?: string }).name ?? "Condition")
    .join(", ");
  const meds = patient.prescriptions.flatMap((p) => p.items.map((i) => i.drugName)).join(", ");

  return {
    summary: `${patient.firstName} ${patient.lastName}: ${conditions || "No documented conditions"}.` +
      (meds ? ` Active medications include ${meds}.` : "") +
      (patient.labOrders.length ? ` Recent labs: ${patient.labOrders.map((l) => l.testName).join(", ")}.` : ""),
    generated_at: new Date().toISOString(),
  };
}

export async function listHospitalPrescriptions(hospitalId: string, limit = 100) {
  const rows = await prisma.prescription.findMany({
    where: { hospitalId },
    include: { patient: true, items: true },
    orderBy: { prescribedAt: "desc" },
    take: limit,
  });
  return rows.map((rx) => ({
    id: rx.id,
    patient_id: rx.patientId,
    patient_name: `${rx.patient.firstName} ${rx.patient.lastName}`,
    status: rx.status,
    prescribed_at: rx.prescribedAt,
    items: rx.items,
  }));
}

export async function listHospitalLabs(hospitalId: string, limit = 100) {
  const rows = await prisma.labOrder.findMany({
    where: { hospitalId },
    include: { patient: true },
    orderBy: { orderedAt: "desc" },
    take: limit,
  });
  return rows.map((l) => ({
    id: l.id,
    patient_id: l.patientId,
    patient_name: `${l.patient.firstName} ${l.patient.lastName}`,
    test_name: l.testName,
    status: l.status,
    ordered_at: l.orderedAt,
    results: l.results,
  }));
}

export async function assignVisitStaff(hospitalId: string, visitId: string, staffUserId: string) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, hospitalId } });
  if (!visit) throw notFound("Visit not found");
  return prisma.visit.update({
    where: { id: visitId },
    data: { assignedStaffId: staffUserId },
  });
}

export async function updateVisitPriority(hospitalId: string, visitId: string, priority: string) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, hospitalId } });
  if (!visit) throw notFound("Visit not found");
  return prisma.visit.update({ where: { id: visitId }, data: { priority } });
}

export async function getExtendedHospitalAnalytics(hospitalId: string, startDate: Date, endDate: Date) {
  const visits = await prisma.visit.findMany({
    where: { hospitalId, checkedInAt: { gte: startDate, lte: endDate } },
  });
  const scans = await prisma.accessLog.count({
    where: { action: "scan_qr", createdAt: { gte: startDate, lte: endDate } },
  });
  const topConditions: Record<string, number> = {};
  for (const v of visits) {
    for (const code of v.diagnosisCodes) {
      topConditions[code] = (topConditions[code] ?? 0) + 1;
    }
  }
  const weekAgo = new Date(Date.now() - 7 * 86400000);
  const visitsThisWeek = await prisma.visit.count({
    where: { hospitalId, checkedInAt: { gte: weekAgo } },
  });
  return {
    visits_this_week: visitsThisWeek,
    qr_scans_today: scans,
    top_conditions: Object.entries(topConditions)
      .map(([code, count]) => ({ code, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10),
    department_volume: visits.reduce<Record<string, number>>((acc, v) => {
      acc[v.department] = (acc[v.department] ?? 0) + 1;
      return acc;
    }, {}),
  };
}

const LAB_TEST_ALIASES: Record<string, string[]> = {
  cbc: ["cbc", "complete blood count"],
  "lipid panel": ["lipid panel", "lipid", "cholesterol panel"],
  hba1c: ["hba1c", "glycated hemoglobin", "a1c"],
  "serum creatinine": ["serum creatinine", "creatinine"],
  tsh: ["tsh", "thyroid stimulating hormone"],
  urinalysis: ["urinalysis", "urine analysis"],
  "pregnancy hcg": ["pregnancy hcg", "hcg", "beta hcg"],
  "peak flow": ["peak flow", "peak expiratory flow"],
  "vitamin d": ["vitamin d", "25-hydroxyvitamin d"],
  troponin: ["troponin", "troponin i"],
};

function normalizeTestName(name: string): string {
  return name.trim().toLowerCase().replace(/\s+/g, " ");
}

function testNamesMatch(a: string, b: string): boolean {
  const na = normalizeTestName(a);
  const nb = normalizeTestName(b);
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  for (const aliases of Object.values(LAB_TEST_ALIASES)) {
    const inA = aliases.some((alias) => na.includes(alias) || alias.includes(na));
    const inB = aliases.some((alias) => nb.includes(alias) || alias.includes(nb));
    if (inA && inB) return true;
  }
  return false;
}

function formatLabResults(results: unknown): string {
  if (results == null) return "No result details available.";
  if (typeof results === "string") return results;
  if (typeof results === "object") {
    const obj = results as Record<string, unknown>;
    if (obj.summary) return String(obj.summary);
    return Object.entries(obj)
      .filter(([, v]) => v != null && v !== "")
      .map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`)
      .join(" · ");
  }
  return String(results);
}

function formatDisplayDate(d: Date): string {
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = String(d.getFullYear()).slice(-2);
  return `${day}/${month}/${year}`;
}

export async function findPriorLabTest(patientId: string, testName: string) {
  const orders = await prisma.labOrder.findMany({
    where: { patientId, status: "completed" },
    orderBy: { orderedAt: "desc" },
    take: 50,
  });

  const match = orders.find((o) => testNamesMatch(o.testName, testName));
  if (!match) return null;

  return {
    test_name: match.testName,
    taken_on: formatDisplayDate(match.orderedAt),
    taken_on_iso: match.orderedAt.toISOString().slice(0, 10),
    results: formatLabResults(match.results),
    results_raw: match.results,
    lab_order_id: match.id,
  };
}

export interface VisitRecordDraft {
  chief_complaint?: string;
  duration?: string;
  severity?: string;
  vitals?: {
    bp?: string;
    hr?: string;
    temp?: string;
    spo2?: string;
    height?: string;
    weight?: string;
  };
  diagnoses?: Array<{ code: string; label: string }>;
  labs?: string[];
  notes?: string;
}

function buildVitalsNarrative(vitals?: VisitRecordDraft["vitals"]): string | null {
  if (!vitals) return null;
  const parts: string[] = [];
  if (vitals.bp) parts.push(`blood pressure ${vitals.bp} mmHg`);
  if (vitals.hr) parts.push(`heart rate ${vitals.hr} bpm`);
  if (vitals.temp) parts.push(`temperature ${vitals.temp}°C`);
  if (vitals.spo2) parts.push(`SpO₂ ${vitals.spo2}%`);
  if (vitals.height) parts.push(`height ${vitals.height} cm`);
  if (vitals.weight) parts.push(`weight ${vitals.weight} kg`);
  if (!parts.length) return null;
  return `Vital signs recorded: ${parts.join(", ")}.`;
}

export function generateVisitRecordFromDraft(draft: VisitRecordDraft) {
  const sections: Array<{ title: string; content: string }> = [];

  if (draft.chief_complaint?.trim()) {
    const duration = draft.duration ? ` Duration: ${draft.duration}.` : "";
    const severity = draft.severity ? ` Severity: ${draft.severity}.` : "";
    sections.push({
      title: "Presenting concern",
      content: `Patient reports ${draft.chief_complaint.trim()}.${duration}${severity}`,
    });
  }

  const vitalsText = buildVitalsNarrative(draft.vitals);
  if (vitalsText) {
    sections.push({ title: "Vital signs", content: vitalsText });
  }

  if (draft.diagnoses?.length) {
    const dxList = draft.diagnoses.map((d) => `${d.code} — ${d.label}`).join("; ");
    sections.push({
      title: "Assessment",
      content: `Working diagnoses documented: ${dxList}.`,
    });
  }

  if (draft.labs?.length) {
    sections.push({
      title: "Investigations ordered",
      content: `Laboratory tests ordered during this encounter: ${draft.labs.join(", ")}.`,
    });
  }

  if (draft.notes?.trim()) {
    sections.push({
      title: "Clinical notes",
      content: draft.notes.trim(),
    });
  }

  if (!sections.length) {
    return { sections: [], narrative: "" };
  }

  const narrative = sections.map((s) => `${s.title}\n${s.content}`).join("\n\n");
  return { sections, narrative };
}

export async function recordPlatformTransaction(kind: string, text: string, actor?: string, metadata?: Record<string, unknown>) {
  await recordActivity(kind, text, actor, metadata);
}
