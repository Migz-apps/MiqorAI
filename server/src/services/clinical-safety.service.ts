import {
  ClinicalSafetyActionType,
  ClinicalSafetyDecision,
  Prisma,
  type AiPendingClinicalAction,
} from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { auditFromRequest, writeAuditLog } from "./audit.service.js";
import {
  checkClinicalSafety,
  isAiClinicalSafetyConfigured,
} from "./ai-clinical-safety.client.js";
import {
  createLabOrder,
  createPrescriptionOrder,
  normalizePrescriptionItems,
  type LabOrderBody,
  type PrescriptionOrderBody,
} from "./hospital-order.service.js";
import type {
  AiPatientRecordDto,
  AiVisitHistoryDto,
  ClinicalSafetyBlockedResponse,
  ClinicalSafetyRequest,
  ClinicalSafetyResponse,
  DoctorAttemptedActionDto,
} from "../types/clinical-safety.types.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

type OrderKind = "prescription" | "lab_order";

function toJsonValue(value: unknown): Prisma.InputJsonValue {
  return JSON.parse(JSON.stringify(value)) as Prisma.InputJsonValue;
}

interface GateContext {
  hospitalId: string;
  doctorId: string;
  patientId: string;
  visitId?: string;
  currentComplaint?: string;
  actionType: ClinicalSafetyActionType;
  actionItem: string;
  orderKind: OrderKind;
  requestBody: PrescriptionOrderBody | LabOrderBody;
}

function asStringList(value: unknown): string[] | string | null {
  if (value == null) return null;
  if (Array.isArray(value)) return value.map(String);
  return String(value);
}

function formatDate(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

async function buildPatientRecord(patientId: string, hospitalId: string): Promise<AiPatientRecordDto> {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId },
    include: {
      medicalRecords: {
        where: { isActive: true, recordType: { in: ["allergy", "diagnosis", "medication"] } },
        orderBy: { recordedAt: "desc" },
        take: 50,
      },
      prescriptions: {
        where: { hospitalId, status: { not: "rejected" } },
        include: { items: true },
        orderBy: { prescribedAt: "desc" },
        take: 20,
      },
    },
  });

  if (!patient) throw notFound("Patient not found");

  const allergies = patient.medicalRecords
    .filter((r) => r.recordType === "allergy")
    .map((r) => {
      const data = r.data as Record<string, unknown>;
      return {
        substance:
          (data.substance as string) ??
          (data.allergen as string) ??
          (data.name as string) ??
          null,
        reaction: (data.reaction as string) ?? null,
        severity: (data.severity as string) ?? null,
        documented_date: formatDate(r.recordedAt),
      };
    });

  const chronicConditions = patient.medicalRecords
    .filter((r) => r.recordType === "diagnosis")
    .map((r) => {
      const data = r.data as Record<string, unknown>;
      return {
        condition:
          (data.condition as string) ??
          (Array.isArray(data.codes) ? (data.codes as string[]).join(", ") : null),
        diagnosed_date: formatDate(r.recordedAt),
        current_status: (data.status as string) ?? "active",
      };
    });

  const medicationRecords = [
    ...patient.medicalRecords
      .filter((r) => r.recordType === "medication")
      .map((r) => {
        const data = r.data as Record<string, unknown>;
        return {
          name: (data.drug_name as string) ?? (data.name as string) ?? null,
          dose: (data.dose as string) ?? null,
          frequency: (data.frequency as string) ?? null,
          route: (data.route as string) ?? null,
          started_date: formatDate(r.recordedAt),
        };
      }),
    ...patient.prescriptions.flatMap((rx) =>
      rx.items.map((item) => ({
        name: item.drugName,
        dose: item.dose,
        frequency: item.frequency,
        route: null,
        started_date: formatDate(rx.prescribedAt),
      })),
    ),
  ];

  return {
    patient_id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    sex: patient.gender ?? "U",
    date_of_birth: formatDate(patient.dateOfBirth) ?? "",
    blood_type: patient.bloodType,
    allergies,
    chronic_conditions: chronicConditions,
    current_medications_as_of_2026_06: medicationRecords,
  };
}

async function buildVisitHistory(
  patientId: string,
  hospitalId: string,
): Promise<AiVisitHistoryDto[]> {
  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });
  const visits = await prisma.visit.findMany({
    where: { patientId, hospitalId },
    orderBy: { checkedInAt: "desc" },
    take: 10,
    include: {
      labOrders: true,
      prescriptions: { include: { items: true } },
    },
  });

  return visits.map((visit) => ({
    date: formatDate(visit.checkedInAt),
    facility: hospital?.name ?? null,
    reason_for_visit: visit.chiefComplaint,
    chief_complaint_or_context: visit.chiefComplaint,
    tests_ordered: visit.labOrders.map((l) => l.testName),
    test_results: visit.labOrders
      .map((l) => {
        const results = l.results as Record<string, unknown> | null;
        return results?.summary ? String(results.summary) : l.status;
      })
      .filter(Boolean),
    diagnoses_or_assessments: visit.diagnosisCodes.length ? visit.diagnosisCodes : [],
    medications_started_or_given: visit.prescriptions.flatMap((rx) =>
      rx.items.map((item) => item.drugName),
    ),
    procedures_or_interventions: asStringList(visit.notes),
    outcome: visit.status,
    ai_relevant_notes: visit.notes,
  }));
}

async function resolveCurrentComplaint(patientId: string, hospitalId: string, visitId?: string) {
  if (visitId) {
    const visit = await prisma.visit.findFirst({
      where: { id: visitId, patientId, hospitalId },
    });
    if (visit?.chiefComplaint) return visit.chiefComplaint;
  }

  const latestVisit = await prisma.visit.findFirst({
    where: { patientId, hospitalId },
    orderBy: { checkedInAt: "desc" },
  });

  return latestVisit?.chiefComplaint ?? "No current complaint documented";
}

export async function buildClinicalSafetyRequest(
  patientId: string,
  hospitalId: string,
  visitId: string | undefined,
  doctorAttemptedAction: DoctorAttemptedActionDto,
  currentComplaint?: string,
): Promise<ClinicalSafetyRequest> {
  const [patientRecord, visitHistory, complaint] = await Promise.all([
    buildPatientRecord(patientId, hospitalId),
    buildVisitHistory(patientId, hospitalId),
    currentComplaint
      ? Promise.resolve(currentComplaint)
      : resolveCurrentComplaint(patientId, hospitalId, visitId),
  ]);

  return {
    patient_record: patientRecord,
    visit_history: visitHistory,
    current_complaint: complaint,
    doctor_attempted_action: doctorAttemptedAction,
  };
}

async function logClinicalSafetyDecision(opts: {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  attemptedAction: DoctorAttemptedActionDto;
  aiAlert: ClinicalSafetyResponse;
  finalDecision: ClinicalSafetyDecision;
  overrideReason?: string | null;
  pendingActionId?: string | null;
  req?: Request;
}) {
  await prisma.clinicalSafetyAuditLog.create({
    data: {
      patientId: opts.patientId,
      doctorId: opts.doctorId,
      hospitalId: opts.hospitalId,
      attemptedAction: toJsonValue(opts.attemptedAction),
      aiAlert: toJsonValue(opts.aiAlert),
      finalDecision: opts.finalDecision,
      overrideReason: opts.overrideReason ?? null,
      pendingActionId: opts.pendingActionId ?? null,
    },
  });

  if (opts.req) {
    await writeAuditLog({
      ...auditFromRequest(opts.req),
      action: `clinical_safety_${opts.finalDecision.toLowerCase()}`,
      resourceType: "clinical_safety",
      resourceId: opts.pendingActionId ?? opts.patientId,
      success: opts.finalDecision !== ClinicalSafetyDecision.BLOCKED,
      failureReason:
        opts.overrideReason ??
        (opts.finalDecision === ClinicalSafetyDecision.BLOCKED
          ? opts.aiAlert.alert_title
          : null),
    });
  }

  logger.info("Clinical safety decision recorded", {
    patientId: opts.patientId,
    doctorId: opts.doctorId,
    action: opts.attemptedAction,
    decision: opts.finalDecision,
    interventionRequired: opts.aiAlert.intervention_required,
  });
}

async function createPendingAction(
  ctx: GateContext,
  aiResponse: ClinicalSafetyResponse,
  safetyRequest: ClinicalSafetyRequest,
) {
  return prisma.aiPendingClinicalAction.create({
    data: {
      patientId: ctx.patientId,
      doctorId: ctx.doctorId,
      hospitalId: ctx.hospitalId,
      actionType: ctx.actionType,
      actionItem: ctx.actionItem,
      currentComplaint: ctx.currentComplaint ?? safetyRequest.current_complaint,
      requestPayloadJson: toJsonValue({
        order_kind: ctx.orderKind,
        body: ctx.requestBody,
      }),
      aiResponseJson: toJsonValue(aiResponse),
      status: "PENDING",
    },
  });
}

function blockedResponse(
  pendingActionId: string,
  aiAlert: ClinicalSafetyResponse,
): ClinicalSafetyBlockedResponse {
  return {
    success: false,
    blocked: true,
    message: "MiqorAI clinical safety review requires doctor attention.",
    ai_alert: aiAlert,
    pending_action_id: pendingActionId,
  };
}

export async function gateClinicalSafetyOrder(
  ctx: GateContext,
  req?: Request,
): Promise<
  | { allowed: true; aiResponse: ClinicalSafetyResponse | null }
  | { allowed: false; response: ClinicalSafetyBlockedResponse }
> {
  if (!isAiClinicalSafetyConfigured()) {
    return { allowed: true, aiResponse: null };
  }

  const safetyRequest = await buildClinicalSafetyRequest(
    ctx.patientId,
    ctx.hospitalId,
    ctx.visitId,
    {
      type:
        ctx.actionType === ClinicalSafetyActionType.test_order
          ? "test_order"
          : "medication_prescription",
      item: ctx.actionItem,
    },
    ctx.currentComplaint,
  );

  const aiResponse = await checkClinicalSafety(safetyRequest);

  if (!aiResponse.intervention_required) {
    await logClinicalSafetyDecision({
      patientId: ctx.patientId,
      doctorId: ctx.doctorId,
      hospitalId: ctx.hospitalId,
      attemptedAction: safetyRequest.doctor_attempted_action,
      aiAlert: aiResponse,
      finalDecision: ClinicalSafetyDecision.ALLOWED,
      req,
    });
    return { allowed: true, aiResponse };
  }

  const pending = await createPendingAction(ctx, aiResponse, safetyRequest);
  await logClinicalSafetyDecision({
    patientId: ctx.patientId,
    doctorId: ctx.doctorId,
    hospitalId: ctx.hospitalId,
    attemptedAction: safetyRequest.doctor_attempted_action,
    aiAlert: aiResponse,
    finalDecision: ClinicalSafetyDecision.BLOCKED,
    pendingActionId: pending.id,
    req,
  });

  return {
    allowed: false,
    response: blockedResponse(pending.id, aiResponse),
  };
}

async function getPendingActionForDoctor(pendingActionId: string, doctorId: string) {
  const pending = await prisma.aiPendingClinicalAction.findUnique({
    where: { id: pendingActionId },
  });
  if (!pending) throw notFound("Pending clinical action not found");
  if (pending.doctorId !== doctorId) throw forbidden("Not authorized for this pending action");
  if (pending.status !== "PENDING") {
    throw badRequest(`Pending action is already ${pending.status.toLowerCase()}`);
  }
  return pending;
}

async function executePendingOrder(pending: AiPendingClinicalAction) {
  const payload = pending.requestPayloadJson as unknown as {
    order_kind: OrderKind;
    body: PrescriptionOrderBody | LabOrderBody;
  };

  if (payload.order_kind === "prescription") {
    return createPrescriptionOrder(
      pending.hospitalId,
      pending.doctorId,
      payload.body as PrescriptionOrderBody,
    );
  }

  return createLabOrder(
    pending.hospitalId,
    pending.doctorId,
    payload.body as LabOrderBody,
  );
}

export async function overridePendingClinicalAction(
  pendingActionId: string,
  doctorId: string,
  overrideReason: string,
  req: Request,
) {
  const reason = overrideReason.trim();
  if (!reason) throw badRequest("override_reason is required");

  const pending = await getPendingActionForDoctor(pendingActionId, doctorId);
  const aiAlert = pending.aiResponseJson as unknown as ClinicalSafetyResponse;
  const attemptedAction = {
    type:
      pending.actionType === ClinicalSafetyActionType.test_order
        ? ("test_order" as const)
        : ("medication_prescription" as const),
    item: pending.actionItem,
  };

  const result = await executePendingOrder(pending);

  const updated = await prisma.aiPendingClinicalAction.update({
    where: { id: pending.id },
    data: {
      status: "OVERRIDDEN",
      overrideReason: reason,
    },
  });

  await logClinicalSafetyDecision({
    patientId: pending.patientId,
    doctorId: pending.doctorId,
    hospitalId: pending.hospitalId,
    attemptedAction,
    aiAlert,
    finalDecision: ClinicalSafetyDecision.OVERRIDDEN,
    overrideReason: reason,
    pendingActionId: pending.id,
    req,
  });

  return { pending_action: updated, order_result: result };
}

export async function cancelPendingClinicalAction(
  pendingActionId: string,
  doctorId: string,
  req: Request,
) {
  const pending = await getPendingActionForDoctor(pendingActionId, doctorId);
  const aiAlert = pending.aiResponseJson as unknown as ClinicalSafetyResponse;
  const attemptedAction = {
    type:
      pending.actionType === ClinicalSafetyActionType.test_order
        ? ("test_order" as const)
        : ("medication_prescription" as const),
    item: pending.actionItem,
  };

  const updated = await prisma.aiPendingClinicalAction.update({
    where: { id: pending.id },
    data: { status: "CANCELLED" },
  });

  await logClinicalSafetyDecision({
    patientId: pending.patientId,
    doctorId: pending.doctorId,
    hospitalId: pending.hospitalId,
    attemptedAction,
    aiAlert,
    finalDecision: ClinicalSafetyDecision.CANCELLED,
    pendingActionId: pending.id,
    req,
  });

  return { pending_action: updated };
}

export function buildPrescriptionGateContext(
  hospitalId: string,
  doctorId: string,
  body: PrescriptionOrderBody,
  visitComplaint?: string,
): GateContext {
  const items = normalizePrescriptionItems(body);
  return {
    hospitalId,
    doctorId,
    patientId: body.patient_id,
    visitId: body.visit_id,
    currentComplaint: visitComplaint ?? body.diagnosis,
    actionType: ClinicalSafetyActionType.medication_prescription,
    actionItem: items.map((item) => item.drug_name).join(", "),
    orderKind: "prescription",
    requestBody: body,
  };
}

export function buildLabOrderGateContext(
  hospitalId: string,
  doctorId: string,
  body: LabOrderBody,
  visitComplaint?: string,
): GateContext {
  return {
    hospitalId,
    doctorId,
    patientId: body.patient_id,
    visitId: body.visit_id,
    currentComplaint: visitComplaint,
    actionType: ClinicalSafetyActionType.test_order,
    actionItem: body.test_name,
    orderKind: "lab_order",
    requestBody: body,
  };
}

export async function markPendingActionCompleted(pendingActionId: string) {
  await prisma.aiPendingClinicalAction.updateMany({
    where: { id: pendingActionId, status: "PENDING" },
    data: { status: "COMPLETED" },
  });
}
