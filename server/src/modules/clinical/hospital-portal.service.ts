import { Prisma, VisitStatus } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { publishEvent } from "../../shared/events.js";
import { notFound } from "../../shared/utils/errors.js";
import { getPatientQrImage, touchPatientData } from "../patient/qr.service.js";
import { saveExportFile } from "../../shared/services/file.service.js";
import { generatePdfReport, toCsv } from "../../shared/services/report.service.js";
import { sendSms } from "../../shared/services/sms.service.js";
import { getDoctorPatientCensusMeta } from "./doctor-workspace.service.js";

export async function getHospitalDashboardKpis(hospitalId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [waiting, inTreatment, completedToday, visitsThisWeek, qrScansToday] = await Promise.all([
    prisma.visit.count({ where: { hospitalId, status: VisitStatus.waiting, checkedInAt: { gte: todayStart } } }),
    prisma.visit.count({ where: { hospitalId, status: { in: [VisitStatus.with_nurse, VisitStatus.with_doctor] } } }),
    prisma.visit.count({ where: { hospitalId, status: VisitStatus.completed, checkedOutAt: { gte: todayStart } } }),
    prisma.visit.count({ where: { hospitalId, checkedInAt: { gte: weekAgo } } }),
    prisma.accessLog.count({
      where: { action: "scan_qr", createdAt: { gte: todayStart }, accessor: { organizationId: hospitalId } },
    }),
  ]);

  return { waiting, in_treatment: inTreatment, completed_today: completedToday, visits_this_week: visitsThisWeek, qr_scans_today: qrScansToday };
}

export async function getPatientCensus(
  hospitalId: string,
  doctorId: string | undefined,
  filters: { diagnosis?: string; medication?: string; age_min?: number; age_max?: number; search?: string },
) {
  const visits = await prisma.visit.findMany({
    where: { hospitalId },
    include: { patient: true },
    orderBy: { checkedInAt: "desc" },
    take: 500,
  });
  const seen = new Set<string>();
  const patients = [];
  for (const v of visits) {
    if (seen.has(v.patientId)) continue;
    seen.add(v.patientId);
    const p = v.patient;
    const age = Math.floor((Date.now() - p.dateOfBirth.getTime()) / (365.25 * 86400000));
    if (filters.age_min !== undefined && age < filters.age_min) continue;
    if (filters.age_max !== undefined && age > filters.age_max) continue;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      if (!name.includes(q) && !p.nationalId?.toLowerCase().includes(q)) continue;
    }
    if (filters.diagnosis) {
      const has = v.diagnosisCodes.some((c) => c.toLowerCase().includes(filters.diagnosis!.toLowerCase()));
      if (!has) continue;
    }
    if (filters.medication) {
      const rx = await prisma.prescriptionItem.findFirst({
        where: {
          prescription: { patientId: p.id, hospitalId },
          drugName: { contains: filters.medication, mode: "insensitive" },
        },
      });
      if (!rx) continue;
    }
    patients.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      age,
      blood_type: p.bloodType,
      last_visit: v.checkedInAt,
      status: v.status,
    });
  }

  const meta = doctorId
    ? await getDoctorPatientCensusMeta(hospitalId, doctorId, patients.map((patient) => patient.id))
    : null;

  return patients.map((patient) => {
    const prescriptionMeta = meta?.prescriptionByPatientId.get(patient.id);
    const draftMeta = meta?.draftByPatientId.get(patient.id);
    const openVisitMeta = meta?.visitByPatientId.get(patient.id);

    return {
      ...patient,
      my_prescriptions_count: prescriptionMeta?.count ?? 0,
      my_prescription_medications: prescriptionMeta?.medications ?? [],
      my_last_prescribed_at: prescriptionMeta?.prescribedAt ?? null,
      has_active_draft: Boolean(draftMeta),
      active_draft_id: draftMeta?.draft_id ?? null,
      active_draft_updated_at: draftMeta?.updated_at ?? null,
      open_visit_id: openVisitMeta?.id ?? null,
      open_visit_status: openVisitMeta?.status ?? null,
    };
  });
}

export async function getHospitalPatientQr(_hospitalId: string, patientId: string) {
  // Access control happens at the route (active patient grant for this hospital).
  // A prior visit is NOT required: the QR is fetched during first check-in too.
  return getPatientQrImage(patientId);
}

export async function completeVisitCheckout(
  hospitalId: string,
  visitId: string,
  input: { vitals?: Record<string, unknown>; diagnosis_codes?: string[]; chief_complaint?: string; notes?: string },
) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, hospitalId } });
  if (!visit) throw notFound("Visit not found");

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      ...(input.vitals ? { vitals: input.vitals as Prisma.InputJsonValue } : {}),
      ...(input.diagnosis_codes ? { diagnosisCodes: input.diagnosis_codes } : {}),
      ...(input.chief_complaint ? { chiefComplaint: input.chief_complaint } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      status: VisitStatus.completed,
      checkedOutAt: new Date(),
    },
  });
  await touchPatientData(visit.patientId);
  return { status: "completed", visit_id: visitId };
}

export async function checkPrescriptionAllergies(patientId: string, drugNames: string[]) {
  const allergies = await prisma.medicalRecord.findMany({
    where: { patientId, recordType: "allergy", isActive: true },
  });
  const allergyDetails = allergies
    .map((record) => {
      const data = (record.data as { name?: string; severity?: string; reaction?: string }) ?? {};
      return {
        name: (data.name ?? "").trim(),
        severity: (data.severity ?? "moderate").trim().toLowerCase(),
        reaction: (data.reaction ?? "").trim(),
      };
    })
    .filter((allergy) => allergy.name && allergy.name.toLowerCase() !== "none known");

  const conflicts = drugNames.flatMap((drugName) => {
    const normalizedDrug = drugName.toLowerCase();
    return allergyDetails
      .filter((allergy) => {
        const normalizedAllergy = allergy.name.toLowerCase();
        return normalizedAllergy && (
          normalizedDrug.includes(normalizedAllergy) || normalizedAllergy.includes(normalizedDrug)
        );
      })
      .map((allergy) => ({
        drug_name: drugName,
        allergy_name: allergy.name,
        severity: allergy.severity,
        reaction: allergy.reaction,
      }));
  });

  return { safe: conflicts.length === 0, conflicts };
}

export async function getLabTrends(hospitalId: string, patientId?: string) {
  const where: Prisma.LabOrderWhereInput = { hospitalId, status: "completed" };
  if (patientId) where.patientId = patientId;
  const labs = await prisma.labOrder.findMany({
    where,
    orderBy: { orderedAt: "asc" },
    take: 200,
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  const byTest: Record<string, Array<{ date: Date; value: unknown; patient?: string }>> = {};
  for (const lab of labs) {
    const key = lab.testName;
    if (!byTest[key]) byTest[key] = [];
    byTest[key].push({
      date: lab.orderedAt,
      value: lab.results,
      patient: patientId ? undefined : `${lab.patient.firstName} ${lab.patient.lastName}`,
    });
  }
  return Object.entries(byTest).map(([test, points]) => ({ test, points }));
}

export async function createReferralWithIcd(
  hospitalId: string,
  input: {
    patient_id: string;
    visit_id?: string;
    to_hospital_id?: string;
    from_department?: string;
    to_department?: string;
    urgency: string;
    reason: string;
    notes?: string;
    icd_codes?: string[];
    notify_patient?: boolean;
  },
) {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patient_id },
    include: { user: { select: { phone: true } } },
  });
  if (!patient) throw notFound("Patient not found");

  const referral = await prisma.referral.create({
    data: {
      patientId: input.patient_id,
      visitId: input.visit_id,
      fromHospitalId: hospitalId,
      toHospitalId: input.to_hospital_id ?? hospitalId,
      fromDepartment: input.from_department,
      toDepartment: input.to_department,
      urgency: input.urgency,
      reason: input.reason,
      notes: input.notes,
      icdCodes: input.icd_codes ?? [],
      referralType: input.to_hospital_id ? "inter_hospital" : "intra_department",
    },
  });

  // Patient SMS is delivered asynchronously by the worker (ReferralCreated consumer),
  // so an SMS-provider failure can no longer fail a referral that is already saved.
  await publishEvent("ReferralCreated", {
    referral_id: referral.id,
    patient_id: input.patient_id,
    from_hospital_id: hospitalId,
    to_hospital_id: input.to_hospital_id ?? hospitalId,
    urgency: input.urgency,
    reason: input.reason,
    notify_phone: input.notify_patient !== false ? patient.user.phone : null,
  });
  return referral;
}

export async function deleteDepartment(hospitalId: string, id: string) {
  const row = await prisma.department.findFirst({ where: { id, hospitalId } });
  if (!row) throw notFound("Department not found");
  await prisma.department.update({ where: { id }, data: { isActive: false } });
  return { deleted: true };
}

export async function createHospitalNotification(
  hospitalId: string,
  input: { title: string; message: string; audience?: string; user_id?: string },
) {
  return prisma.hospitalNotification.create({
    data: {
      hospitalId,
      type: input.audience ?? "all",
      title: input.title,
      body: input.message,
      userId: input.user_id,
    },
  });
}

export async function markAllNotificationsRead(hospitalId: string, userId?: string) {
  await prisma.hospitalNotification.updateMany({
    where: { hospitalId, read: false, ...(userId ? { OR: [{ userId }, { userId: null }] } : {}) },
    data: { read: true },
  });
  return { read: true };
}

export async function exportHospitalAuditCsv(hospitalId: string, userId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: hospitalId },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const csv = toCsv(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      user_email: l.userEmail ?? "",
      resource_type: l.resourceType,
      resource_id: l.resourceId ?? "",
      success: l.success ? 1 : 0,
      created_at: l.createdAt.toISOString(),
    })),
  );
  const url = await saveExportFile(userId, `hospital-audit-${hospitalId}.csv`, csv, "text/csv");
  return { download_url: url };
}

export async function getHospitalInvoicePdf(hospitalId: string, invoiceId: string, userId: string) {
  const invoice = await prisma.platformInvoice.findFirst({
    where: { id: invoiceId, customerId: hospitalId, customerType: "hospital" },
  });
  if (!invoice) throw notFound("Invoice not found");
  const pdf = await generatePdfReport(`Invoice ${invoice.period}`, {
    amount: Number(invoice.amount),
    status: invoice.status,
    due_date: invoice.dueDate,
    created_at: invoice.createdAt,
  });
  const url = await saveExportFile(userId, `invoice-${invoice.id}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}
export async function listHospitalStaffEnriched(hospitalId: string) {
  const staff = await prisma.hospitalStaff.findMany({
    where: { hospitalId },
    include: { user: { select: { id: true, email: true, displayName: true, lastLoginAt: true, isActive: true } } },
  });
  return staff.map((s) => ({
    id: s.id,
    user_id: s.userId,
    email: s.user.email,
    name: s.user.displayName ?? s.user.email.split("@")[0],
    role: s.role,
    department: s.department,
    active: s.isActive && s.user.isActive,
    last_login: s.user.lastLoginAt,
  }));
}
