import { Prisma, RecordType, VisitStatus, type PlatformSetting } from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../lib/prisma.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import { createLabOrder, createPrescriptionOrder } from "./hospital-order.service.js";
import { touchPatientData } from "./qr.service.js";

type DraftDiagnosis = {
  code: string;
  label: string;
};

type DraftPrescription = {
  id: string;
  medication: string;
  strength: string;
  instructions: string;
  frequency: string;
  duration: string;
  durationDays: number;
  quantity: number;
  pharmacyId?: string | null;
  pharmacyName?: string;
};

export type DoctorVisitDraftInput = {
  chief: string;
  symptoms: string;
  assessment: string;
  duration: string;
  severity: string;
  bp: string;
  hr: string;
  temp: string;
  spo2: string;
  height: string;
  weight: string;
  diagnoses: DraftDiagnosis[];
  labs: string[];
  prescriptions: DraftPrescription[];
  notes: string;
};

type StoredDoctorVisitDraft = {
  id: string;
  patient_id: string;
  doctor_id: string;
  hospital_id: string;
  visit_id: string | null;
  status: "active" | "completed";
  created_at: string;
  updated_at: string;
  draft: DoctorVisitDraftInput;
};

function draftKey(hospitalId: string, doctorId: string, patientId: string, draftId: string) {
  return `doctor_visit_draft:${hospitalId}:${doctorId}:${patientId}:${draftId}`;
}

function draftPrefix(hospitalId: string, doctorId: string, patientId?: string) {
  return patientId
    ? `doctor_visit_draft:${hospitalId}:${doctorId}:${patientId}:`
    : `doctor_visit_draft:${hospitalId}:${doctorId}:`;
}

function sanitizeText(value: unknown) {
  return typeof value === "string" ? value : "";
}

function sanitizeDiagnoses(value: unknown): DraftDiagnosis[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => ({
      code: typeof item === "object" && item && "code" in item ? String(item.code ?? "").trim() : "",
      label: typeof item === "object" && item && "label" in item ? String(item.label ?? "").trim() : "",
    }))
    .filter((item) => item.code || item.label);
}

function sanitizeLabs(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => String(item ?? "").trim())
    .filter(Boolean);
}

function sanitizePrescriptions(value: unknown): DraftPrescription[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      const row = (item ?? {}) as Record<string, unknown>;
      return {
        id: sanitizeText(row.id) || randomUUID(),
        medication: sanitizeText(row.medication).trim(),
        strength: sanitizeText(row.strength).trim(),
        instructions: sanitizeText(row.instructions).trim(),
        frequency: sanitizeText(row.frequency).trim(),
        duration: sanitizeText(row.duration).trim(),
        durationDays: Number(row.durationDays ?? 0) || 0,
        quantity: Number(row.quantity ?? 0) || 0,
        pharmacyId: sanitizeText(row.pharmacyId).trim() || null,
        pharmacyName: sanitizeText(row.pharmacyName).trim() || undefined,
      };
    })
    .filter((item) => item.medication && item.strength);
}

function sanitizeDraft(value: unknown): DoctorVisitDraftInput {
  const draft = (value ?? {}) as Record<string, unknown>;
  return {
    chief: sanitizeText(draft.chief),
    symptoms: sanitizeText(draft.symptoms),
    assessment: sanitizeText(draft.assessment),
    duration: sanitizeText(draft.duration),
    severity: sanitizeText(draft.severity),
    bp: sanitizeText(draft.bp),
    hr: sanitizeText(draft.hr),
    temp: sanitizeText(draft.temp),
    spo2: sanitizeText(draft.spo2),
    height: sanitizeText(draft.height),
    weight: sanitizeText(draft.weight),
    diagnoses: sanitizeDiagnoses(draft.diagnoses),
    labs: sanitizeLabs(draft.labs),
    prescriptions: sanitizePrescriptions(draft.prescriptions),
    notes: sanitizeText(draft.notes),
  };
}

function parseDraftRow(row: PlatformSetting): StoredDoctorVisitDraft | null {
  const raw = row.value as Record<string, unknown>;
  if (!raw || typeof raw !== "object") return null;

  const id = sanitizeText(raw.id).trim();
  const patientId = sanitizeText(raw.patient_id).trim();
  const doctorId = sanitizeText(raw.doctor_id).trim();
  const hospitalId = sanitizeText(raw.hospital_id).trim();
  if (!id || !patientId || !doctorId || !hospitalId) return null;

  return {
    id,
    patient_id: patientId,
    doctor_id: doctorId,
    hospital_id: hospitalId,
    visit_id: sanitizeText(raw.visit_id).trim() || null,
    status: raw.status === "completed" ? "completed" : "active",
    created_at: sanitizeText(raw.created_at) || new Date().toISOString(),
    updated_at: sanitizeText(raw.updated_at) || new Date().toISOString(),
    draft: sanitizeDraft(raw.draft),
  };
}

function hasDraftContent(draft: DoctorVisitDraftInput) {
  return Boolean(
    draft.chief.trim() ||
      draft.symptoms.trim() ||
      draft.assessment.trim() ||
      draft.notes.trim() ||
      draft.bp.trim() ||
      draft.hr.trim() ||
      draft.temp.trim() ||
      draft.spo2.trim() ||
      draft.height.trim() ||
      draft.weight.trim() ||
      draft.diagnoses.length ||
      draft.labs.length ||
      draft.prescriptions.length,
  );
}

function toVisitStatusLabel(status: VisitStatus) {
  switch (status) {
    case VisitStatus.with_nurse:
      return "with_nurse";
    case VisitStatus.with_doctor:
      return "with_doctor";
    case VisitStatus.completed:
      return "completed";
    case VisitStatus.no_show:
      return "no_show";
    default:
      return "waiting";
  }
}

async function findOpenVisitForDoctor(hospitalId: string, doctorId: string, patientId: string) {
  return prisma.visit.findFirst({
    where: {
      hospitalId,
      patientId,
      status: { in: [VisitStatus.waiting, VisitStatus.with_nurse, VisitStatus.with_doctor] },
      OR: [
        { assignedStaffId: doctorId },
        { recordedBy: doctorId },
      ],
    },
    orderBy: { checkedInAt: "desc" },
  });
}

async function getStoredDraft(
  hospitalId: string,
  doctorId: string,
  patientId: string,
  draftId: string,
) {
  const row = await prisma.platformSetting.findUnique({
    where: { key: draftKey(hospitalId, doctorId, patientId, draftId) },
  });
  const draft = row ? parseDraftRow(row) : null;
  if (!draft) throw notFound("Draft visit not found");
  return draft;
}

function parseNumber(value: string) {
  const num = Number.parseFloat(value);
  return Number.isFinite(num) ? num : undefined;
}

function estimateQuantity(frequency: string, durationDays: number) {
  const days = Math.max(durationDays, 1);
  switch (frequency) {
    case "2x daily":
      return days * 2;
    case "3x daily":
      return days * 3;
    case "4x daily":
      return days * 4;
    case "Every 6 hours":
      return days * 4;
    case "Every 8 hours":
      return days * 3;
    case "Weekly":
      return Math.max(1, Math.ceil(days / 7));
    default:
      return days;
  }
}

function buildVisitVitals(draft: DoctorVisitDraftInput) {
  const bp = draft.bp.trim();
  const [systolicRaw, diastolicRaw] = bp.split("/");

  const vitals: Record<string, unknown> = {
    recorded_at: new Date().toISOString(),
  };

  if (bp) vitals.bp = bp;
  if (systolicRaw && diastolicRaw) {
    const systolic = parseNumber(systolicRaw);
    const diastolic = parseNumber(diastolicRaw);
    if (systolic != null) vitals.bp_systolic = systolic;
    if (diastolic != null) vitals.bp_diastolic = diastolic;
  }

  const hr = parseNumber(draft.hr);
  const temp = parseNumber(draft.temp);
  const spo2 = parseNumber(draft.spo2);
  const height = parseNumber(draft.height);
  const weight = parseNumber(draft.weight);

  if (hr != null) vitals.heart_rate = hr;
  if (temp != null) vitals.temperature = temp;
  if (spo2 != null) vitals.spo2 = spo2;
  if (height != null) vitals.height = height;
  if (weight != null) vitals.weight = weight;

  return Object.keys(vitals).length > 1 ? vitals : undefined;
}

function buildVisitNotes(draft: DoctorVisitDraftInput) {
  const sections = [
    draft.symptoms.trim() ? `Symptoms: ${draft.symptoms.trim()}` : "",
    draft.assessment.trim() ? `Assessment: ${draft.assessment.trim()}` : "",
    draft.notes.trim() ? `Notes: ${draft.notes.trim()}` : "",
  ].filter(Boolean);

  return sections.join("\n");
}

async function loadDoctorDepartment(hospitalId: string, doctorId: string) {
  const staff = await prisma.hospitalStaff.findFirst({
    where: { hospitalId, userId: doctorId, isActive: true },
    select: { department: true },
  });
  return staff?.department || "General Medicine";
}

function mapWorkspacePrescription(row: {
  id: string;
  prescribedAt: Date;
  status: string;
  items: Array<{ id: string; drugName: string; strength: string; dose: string; frequency: string | null; durationDays: number }>;
}) {
  return {
    id: row.id,
    prescribed_at: row.prescribedAt,
    status: row.status,
    items: row.items.map((item) => ({
      id: item.id,
      medication: item.drugName,
      strength: item.strength,
      instructions: item.dose,
      frequency: item.frequency,
      duration_days: item.durationDays,
    })),
  };
}

function mapOpenVisitSummary(visit: {
  id: string;
  status: VisitStatus;
  checkedInAt: Date;
  department: string;
  reason: string | null;
} | null) {
  if (!visit) return null;
  return {
    id: visit.id,
    status: toVisitStatusLabel(visit.status),
    checked_in_at: visit.checkedInAt,
    department: visit.department,
    reason: visit.reason,
  };
}

async function enrichDrafts(drafts: StoredDoctorVisitDraft[]) {
  const visitIds = [...new Set(drafts.map((draft) => draft.visit_id).filter(Boolean))] as string[];
  const visits = visitIds.length
    ? await prisma.visit.findMany({
        where: { id: { in: visitIds } },
        select: {
          id: true,
          status: true,
          checkedInAt: true,
          department: true,
          reason: true,
        },
      })
    : [];

  const visitById = new Map(visits.map((visit) => [visit.id, visit]));

  return drafts.map((draft) => ({
    draft_id: draft.id,
    patient_id: draft.patient_id,
    visit_id: draft.visit_id,
    created_at: draft.created_at,
    updated_at: draft.updated_at,
    draft: draft.draft,
    open_visit: mapOpenVisitSummary(draft.visit_id ? (visitById.get(draft.visit_id) ?? null) : null),
  }));
}

export async function getDoctorPatientWorkspace(
  hospitalId: string,
  doctorId: string,
  patientId: string,
) {
  const [draftRows, prescriptions, openVisit] = await Promise.all([
    prisma.platformSetting.findMany({
      where: { key: { startsWith: draftPrefix(hospitalId, doctorId, patientId) } },
      orderBy: { key: "asc" },
    }),
    prisma.prescription.findMany({
      where: { hospitalId, patientId, prescribedBy: doctorId },
      include: { items: true },
      orderBy: { prescribedAt: "desc" },
      take: 20,
    }),
    findOpenVisitForDoctor(hospitalId, doctorId, patientId),
  ]);

  const activeDrafts = draftRows
    .map(parseDraftRow)
    .filter((draft): draft is StoredDoctorVisitDraft => Boolean(draft && draft.status === "active"))
    .sort((a, b) => b.updated_at.localeCompare(a.updated_at));

  return {
    open_visit: mapOpenVisitSummary(openVisit),
    active_drafts: await enrichDrafts(activeDrafts),
    doctor_prescriptions: prescriptions.map(mapWorkspacePrescription),
  };
}

export async function getDoctorPatientCensusMeta(
  hospitalId: string,
  doctorId: string,
  patientIds: string[],
) {
  if (!patientIds.length) {
    return {
      prescriptionByPatientId: new Map<string, { count: number; medications: string[]; prescribedAt: Date | null }>(),
      draftByPatientId: new Map<string, { updated_at: string; draft_id: string }>(),
      visitByPatientId: new Map<string, { id: string; status: string }>(),
    };
  }

  const [prescriptions, draftRows, openVisits] = await Promise.all([
    prisma.prescription.findMany({
      where: {
        hospitalId,
        prescribedBy: doctorId,
        patientId: { in: patientIds },
      },
      include: { items: true },
      orderBy: { prescribedAt: "desc" },
    }),
    prisma.platformSetting.findMany({
      where: {
        key: { startsWith: draftPrefix(hospitalId, doctorId) },
      },
    }),
    prisma.visit.findMany({
      where: {
        hospitalId,
        patientId: { in: patientIds },
        status: { in: [VisitStatus.waiting, VisitStatus.with_nurse, VisitStatus.with_doctor] },
        OR: [
          { assignedStaffId: doctorId },
          { recordedBy: doctorId },
        ],
      },
      orderBy: { checkedInAt: "desc" },
    }),
  ]);

  const prescriptionByPatientId = new Map<
    string,
    { count: number; medications: string[]; prescribedAt: Date | null }
  >();
  for (const row of prescriptions) {
    const existing = prescriptionByPatientId.get(row.patientId);
    const medications = row.items.map((item) => item.drugName);
    if (!existing) {
      prescriptionByPatientId.set(row.patientId, {
        count: 1,
        medications,
        prescribedAt: row.prescribedAt,
      });
      continue;
    }

    prescriptionByPatientId.set(row.patientId, {
      count: existing.count + 1,
      medications: existing.medications.length ? existing.medications : medications,
      prescribedAt: existing.prescribedAt ?? row.prescribedAt,
    });
  }

  const draftByPatientId = new Map<string, { updated_at: string; draft_id: string }>();
  for (const row of draftRows) {
    const draft = parseDraftRow(row);
    if (!draft || draft.status !== "active" || !patientIds.includes(draft.patient_id)) continue;
    const current = draftByPatientId.get(draft.patient_id);
    if (!current || draft.updated_at > current.updated_at) {
      draftByPatientId.set(draft.patient_id, {
        updated_at: draft.updated_at,
        draft_id: draft.id,
      });
    }
  }

  const visitByPatientId = new Map<string, { id: string; status: string }>();
  for (const visit of openVisits) {
    if (!visitByPatientId.has(visit.patientId)) {
      visitByPatientId.set(visit.patientId, {
        id: visit.id,
        status: toVisitStatusLabel(visit.status),
      });
    }
  }

  return { prescriptionByPatientId, draftByPatientId, visitByPatientId };
}

export async function saveDoctorVisitDraft(opts: {
  hospitalId: string;
  doctorId: string;
  patientId: string;
  draftId?: string;
  visitId?: string;
  draft: DoctorVisitDraftInput;
}) {
  const sanitized = sanitizeDraft(opts.draft);
  if (!hasDraftContent(sanitized)) {
    throw badRequest("Draft visit is empty");
  }

  const draftId = opts.draftId || randomUUID();
  const existing = opts.draftId
    ? await prisma.platformSetting.findUnique({
        where: { key: draftKey(opts.hospitalId, opts.doctorId, opts.patientId, opts.draftId) },
      })
    : null;
  const existingDraft = existing ? parseDraftRow(existing) : null;
  const linkedVisit = opts.visitId
    ? await prisma.visit.findFirst({
        where: {
          id: opts.visitId,
          patientId: opts.patientId,
          hospitalId: opts.hospitalId,
        },
      })
    : await findOpenVisitForDoctor(opts.hospitalId, opts.doctorId, opts.patientId);

  const stored: StoredDoctorVisitDraft = {
    id: draftId,
    patient_id: opts.patientId,
    doctor_id: opts.doctorId,
    hospital_id: opts.hospitalId,
    visit_id: linkedVisit?.id ?? existingDraft?.visit_id ?? null,
    status: "active",
    created_at: existingDraft?.created_at ?? new Date().toISOString(),
    updated_at: new Date().toISOString(),
    draft: sanitized,
  };

  await prisma.platformSetting.upsert({
    where: { key: draftKey(opts.hospitalId, opts.doctorId, opts.patientId, draftId) },
    create: {
      key: draftKey(opts.hospitalId, opts.doctorId, opts.patientId, draftId),
      value: stored as Prisma.InputJsonValue,
    },
    update: {
      value: stored as Prisma.InputJsonValue,
    },
  });

  const [enriched] = await enrichDrafts([stored]);
  return enriched;
}

export async function deleteDoctorVisitDraft(opts: {
  hospitalId: string;
  doctorId: string;
  patientId: string;
  draftId: string;
}) {
  await getStoredDraft(opts.hospitalId, opts.doctorId, opts.patientId, opts.draftId);

  await prisma.platformSetting.delete({
    where: { key: draftKey(opts.hospitalId, opts.doctorId, opts.patientId, opts.draftId) },
  });

  return { deleted: true };
}

export async function completeDoctorVisitDraft(opts: {
  hospitalId: string;
  doctorId: string;
  patientId: string;
  draftId: string;
}) {
  const stored = await getStoredDraft(opts.hospitalId, opts.doctorId, opts.patientId, opts.draftId);
  const draft = stored.draft;

  if (!hasDraftContent(draft)) {
    throw badRequest("Draft visit is empty");
  }

  let visit = stored.visit_id
    ? await prisma.visit.findFirst({
        where: {
          id: stored.visit_id,
          hospitalId: opts.hospitalId,
          patientId: opts.patientId,
        },
      })
    : await findOpenVisitForDoctor(opts.hospitalId, opts.doctorId, opts.patientId);

  if (visit?.assignedStaffId && visit.assignedStaffId !== opts.doctorId) {
    throw forbidden("This visit is assigned to another doctor");
  }

  const visitNotes = buildVisitNotes(draft);
  const vitals = buildVisitVitals(draft);
  const diagnosisCodes = draft.diagnoses.map((item) => item.code).filter(Boolean);

  if (!visit) {
    visit = await prisma.visit.create({
      data: {
        patientId: opts.patientId,
        hospitalId: opts.hospitalId,
        department: await loadDoctorDepartment(opts.hospitalId, opts.doctorId),
        visitType: "consultation",
        reason: draft.chief.trim() || undefined,
        chiefComplaint: draft.chief.trim() || undefined,
        priority: "normal",
        vitals: vitals as Prisma.InputJsonValue | undefined,
        diagnosisCodes,
        notes: visitNotes || undefined,
        recordedBy: opts.doctorId,
        assignedStaffId: opts.doctorId,
        status: VisitStatus.completed,
        checkedOutAt: new Date(),
      },
    });
  } else {
    visit = await prisma.visit.update({
      where: { id: visit.id },
      data: {
        assignedStaffId: opts.doctorId,
        chiefComplaint: draft.chief.trim() || visit.chiefComplaint,
        vitals: vitals as Prisma.InputJsonValue | undefined,
        diagnosisCodes,
        notes: visitNotes || visit.notes,
        status: VisitStatus.completed,
        checkedOutAt: new Date(),
      },
    });
  }

  if (diagnosisCodes.length || draft.assessment.trim() || draft.notes.trim() || draft.chief.trim()) {
    await prisma.medicalRecord.create({
      data: {
        patientId: opts.patientId,
        hospitalId: opts.hospitalId,
        recordType: RecordType.diagnosis,
        data: {
          name: draft.assessment.trim() || draft.chief.trim() || "Clinical assessment",
          codes: diagnosisCodes,
          symptoms: draft.symptoms.trim(),
          chief_complaint: draft.chief.trim(),
          assessment: draft.assessment.trim(),
          notes: draft.notes.trim(),
          visit_id: visit.id,
        } as Prisma.InputJsonValue,
        recordedBy: opts.doctorId,
      },
    });
  }

  const createdPrescriptions = [];
  for (const item of draft.prescriptions) {
    const durationDays = item.durationDays > 0 ? item.durationDays : 1;
    const quantity = item.quantity > 0 ? item.quantity : estimateQuantity(item.frequency, durationDays);
    createdPrescriptions.push(
      await createPrescriptionOrder(opts.hospitalId, opts.doctorId, {
        patient_id: opts.patientId,
        visit_id: visit.id,
        pharmacy_id: item.pharmacyId ?? undefined,
        diagnosis: diagnosisCodes.join(", ") || draft.assessment.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        drug_name: item.medication,
        strength: item.strength,
        dosage: item.instructions || "Take as directed",
        quantity,
        frequency: item.frequency || undefined,
        duration_days: durationDays,
      }),
    );
  }

  const createdLabs = [];
  for (const labName of draft.labs) {
    createdLabs.push(
      await createLabOrder(opts.hospitalId, opts.doctorId, {
        patient_id: opts.patientId,
        visit_id: visit.id,
        test_name: labName,
      }),
    );
  }

  await prisma.platformSetting.delete({
    where: { key: draftKey(opts.hospitalId, opts.doctorId, opts.patientId, opts.draftId) },
  });

  await touchPatientData(opts.patientId);

  return {
    completed: true,
    visit_id: visit.id,
    prescriptions_created: createdPrescriptions.length,
    labs_created: createdLabs.length,
  };
}
