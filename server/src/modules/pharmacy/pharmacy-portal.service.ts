import { prisma } from "../../shared/lib/prisma.js";
import { notFound } from "../../shared/utils/errors.js";
import { saveExportFile } from "../../shared/services/file.service.js";
import { generatePdfReport, toCsv } from "../../shared/services/report.service.js";

export async function listPharmacyPatients(pharmacyId: string) {
  const dispensed = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed" },
    select: { patientId: true },
    distinct: ["patientId"],
    take: 200,
  });
  const ids = dispensed.map((d) => d.patientId);
  if (ids.length === 0) return [];

  const [patients, snapshots, records] = await Promise.all([
    prisma.patient.findMany({
      where: { id: { in: ids } },
      include: { user: { select: { phone: true, email: true } } },
    }),
    prisma.patientAdherenceSnapshot.findMany({
      where: { pharmacyId, patientId: { in: ids } },
      select: { patientId: true, overallRate: true },
    }),
    prisma.medicalRecord.findMany({
      where: {
        patientId: { in: ids },
        isActive: true,
        recordType: { in: ["allergy", "diagnosis"] },
      },
      select: { patientId: true, recordType: true, data: true },
      take: 1000,
    }),
  ]);

  const adherenceByPatient = new Map(
    snapshots.map((snapshot) => [snapshot.patientId, Number(snapshot.overallRate)]),
  );
  const recordsByPatient = new Map<string, { allergies: string[]; conditions: string[] }>();

  for (const record of records) {
    const entry = recordsByPatient.get(record.patientId) ?? { allergies: [], conditions: [] };
    const data = (record.data ?? {}) as { name?: string; severity?: string };
    if (record.recordType === "allergy") {
      const label = data.severity ? `${data.name ?? "Allergy"} (${data.severity})` : (data.name ?? "Allergy");
      entry.allergies.push(String(label));
    }
    if (record.recordType === "diagnosis") {
      entry.conditions.push(String(data.name ?? "Condition"));
    }
    recordsByPatient.set(record.patientId, entry);
  }

  return patients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    date_of_birth: p.dateOfBirth,
    phone: p.user.phone,
    email: p.user.email,
    allergies: recordsByPatient.get(p.id)?.allergies ?? [],
    conditions: recordsByPatient.get(p.id)?.conditions ?? [],
    adherence: adherenceByPatient.get(p.id) ?? 0,
  }));
}

export async function getPharmacyAdherenceAggregate(pharmacyId: string) {
  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed" },
    include: { items: true },
    take: 500,
  });
  const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const r of rx) {
    const days = r.items[0]?.durationDays ?? 30;
    const score = days >= 60 ? "excellent" : days >= 30 ? "good" : days >= 14 ? "fair" : "poor";
    buckets[score as keyof typeof buckets]++;
  }
  // Trend from real dispense history: average the duration-based score per month.
  const byMonth = new Map<string, { sum: number; n: number }>();
  for (const r of rx) {
    const month = r.dispensedAt?.toISOString().slice(0, 7);
    if (!month) continue;
    const days = r.items[0]?.durationDays ?? 30;
    const score = Math.min(100, 60 + days);
    const entry = byMonth.get(month) ?? { sum: 0, n: 0 };
    entry.sum += score;
    entry.n += 1;
    byMonth.set(month, entry);
  }
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    const month = d.toISOString().slice(0, 7);
    const entry = byMonth.get(month);
    return { month, adherence_rate: entry ? Math.round(entry.sum / entry.n) : null };
  });
  return { buckets, trend };
}

export async function getPatientAdherenceHistory(pharmacyId: string, patientId: string) {
  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, patientId, status: "dispensed" },
    include: { items: true },
    orderBy: { dispensedAt: "asc" },
    take: 24,
  });
  return rx.map((r) => ({
    month: r.dispensedAt?.toISOString().slice(0, 7) ?? "",
    adherence_pct: r.items.length > 0 ? Math.min(100, 60 + r.items[0]!.durationDays) : 75,
  }));
}

export async function listPharmacyReceipts(pharmacyId: string, date?: string) {
  const start = date ? new Date(date) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed", dispensedAt: { gte: start, lt: end } },
    include: { patient: true, items: true },
  });
  return rx.map((r) => ({
    id: r.id,
    patient_name: `${r.patient.firstName} ${r.patient.lastName}`,
    dispensed_at: r.dispensedAt,
    total: r.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
    payment_type: r.insuranceProvider ? "insurance" : "cash",
  }));
}

export async function getPharmacyReceipt(pharmacyId: string, prescriptionId: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, pharmacyId, status: "dispensed" },
    include: { patient: true, items: true, hospital: { select: { name: true } } },
  });
  if (!rx) throw notFound("Receipt not found");
  return {
    id: rx.id,
    patient: `${rx.patient.firstName} ${rx.patient.lastName}`,
    hospital: rx.hospital?.name,
    items: rx.items,
    dispensed_at: rx.dispensedAt,
    total: rx.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
  };
}

export async function exportPharmacyBilling(pharmacyId: string, userId: string, format: "csv" | "pdf") {
  const receipts = await listPharmacyReceipts(pharmacyId);
  const content =
    format === "csv"
      ? toCsv(
          receipts.map((r) => ({
            id: r.id,
            patient_name: r.patient_name,
            dispensed_at: r.dispensed_at?.toISOString() ?? "",
            total: r.total,
            payment_type: r.payment_type,
          })),
        )
      : await generatePdfReport("Day-end billing", { receipts });
  const url = await saveExportFile(userId, `pharmacy-billing.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function exportPharmacyReport(pharmacyId: string, userId: string, type: string, format: "csv" | "pdf") {
  const dashboard = await import("./pharmacy.service.js").then((m) => m.getPharmacyDashboard(pharmacyId));
  const content =
    format === "csv"
      ? toCsv([
          {
            type,
            pending: dashboard.pending_prescriptions,
            ready: dashboard.ready_for_pickup,
            completed_today: dashboard.completed_today,
          },
        ])
      : await generatePdfReport(`Pharmacy ${type} report`, dashboard);
  const url = await saveExportFile(userId, `pharmacy-${type}.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function notifyDoctorOnHold(pharmacyId: string, prescriptionId: string, reason: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, pharmacyId },
    include: { hospital: true },
  });
  if (!rx || !rx.hospitalId) throw notFound("Prescription or hospital not found");
  await prisma.hospitalNotification.create({
    data: {
      hospitalId: rx.hospitalId,
      type: "doctors",
      title: "Prescription on hold",
      body: `Rx ${prescriptionId.slice(0, 8)} on hold: ${reason}`,
    },
  });
  return { notified: true };
}

export async function lookupInventoryBarcode(pharmacyId: string, barcode: string) {
  const item = await prisma.pharmacyInventory.findFirst({
    where: { pharmacyId, barcode, isActive: true },
  });
  if (!item) throw notFound("SKU not found");
  return item;
}

export async function deactivateInventoryItem(pharmacyId: string, id: string) {
  await prisma.pharmacyInventory.updateMany({ where: { id, pharmacyId }, data: { isActive: false } });
  return { deactivated: true };
}
