import { ClinicalSafetyDecision } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../lib/prisma.js";
import { logger } from "../lib/logger.js";
import { auditFromRequest, writeAuditLog } from "./audit.service.js";
import { fetchCheckAction, fetchRelevantHistory } from "./ai-visit.client.js";
import type {
  AiHistoryEntry,
  AiOverridePayload,
  AiVisitContext,
  CheckActionResponse,
  RelevantHistoryResponse,
} from "../types/ai-visit.types.js";
import { notFound } from "../utils/errors.js";

const STOP_WORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "have", "has", "been", "was", "are",
  "patient", "reports", "mild", "moderate", "severe", "days", "day", "week", "today",
]);

const MEDICAL_HINTS = [
  "pain", "fever", "cough", "headache", "diabetes", "hypertension", "asthma", "allergy",
  "chest", "breath", "nausea", "vomit", "rash", "swelling", "heart", "kidney", "liver",
  "pregnan", "anemia", "infection", "fracture", "wound", "bleed", "seizure", "migraine",
];

export function extractMedicalKeywords(...texts: Array<string | undefined>): string[] {
  const found = new Set<string>();
  for (const text of texts) {
    if (!text?.trim()) continue;
    const tokens = text.toLowerCase().split(/[^a-z0-9+/.-]+/).filter((t) => t.length > 2);
    for (const token of tokens) {
      if (STOP_WORDS.has(token)) continue;
      if (MEDICAL_HINTS.some((h) => token.includes(h)) || token.length >= 4) {
        found.add(token);
      }
    }
  }
  return [...found].slice(0, 25);
}

function formatDate(d: Date | null | undefined): string {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

function calcAge(dob: Date): number {
  return Math.floor((Date.now() - dob.getTime()) / (365.25 * 86400 * 1000));
}

export async function buildAiPatientContext(patientId: string, hospitalId: string) {
  const patient = await prisma.patient.findUnique({
    where: { id: patientId, isActive: true },
    include: {
      medicalRecords: { where: { isActive: true }, orderBy: { recordedAt: "desc" }, take: 50 },
      visits: { where: { hospitalId }, orderBy: { checkedInAt: "desc" }, take: 15, include: { labOrders: true, prescriptions: { include: { items: true } } } },
      prescriptions: { where: { hospitalId }, include: { items: true }, orderBy: { prescribedAt: "desc" }, take: 10 },
      labOrders: { orderBy: { orderedAt: "desc" }, take: 20 },
    },
  });
  if (!patient) throw notFound("Patient not found");

  const hospital = await prisma.hospital.findUnique({ where: { id: hospitalId } });

  const allergies = patient.medicalRecords
    .filter((r) => r.recordType === "allergy")
    .map((r) => {
      const d = r.data as { name?: string; severity?: string };
      return d.severity ? `${d.name} (${d.severity})` : String(d.name ?? "Allergy");
    });

  const chronicConditions = patient.medicalRecords
    .filter((r) => r.recordType === "diagnosis")
    .map((r) => String((r.data as { name?: string }).name ?? "Condition"));

  const medicationRecords = [
    ...patient.medicalRecords
      .filter((r) => r.recordType === "medication")
      .map((r) => String((r.data as { name?: string }).name ?? "")),
    ...patient.prescriptions.flatMap((rx) => rx.items.map((i) => i.drugName)),
  ].filter(Boolean);

  const profile = {
    age: calcAge(patient.dateOfBirth),
    sex: patient.gender ?? "U",
    bloodGroup: patient.bloodType ?? "—",
    allergies,
    chronicConditions,
    currentMedications: [...new Set(medicationRecords)],
  };

  const visitHistory: AiHistoryEntry[] = patient.visits.map((visit) => ({
    date: formatDate(visit.checkedInAt),
    facility: hospital?.name ?? "Hospital",
    complaint: visit.chiefComplaint ?? visit.reason ?? "",
    diagnosis: visit.diagnosisCodes.join(", "),
    tests: visit.labOrders.map((l) => l.testName),
    imaging: [],
    medications: visit.prescriptions.flatMap((rx) => rx.items.map((i) => i.drugName)),
    outcome: visit.status,
  }));

  for (const lab of patient.labOrders) {
    if (visitHistory.some((v) => v.tests.includes(lab.testName) && v.date === formatDate(lab.orderedAt))) {
      continue;
    }
    visitHistory.push({
      date: formatDate(lab.orderedAt),
      facility: hospital?.name ?? "Hospital",
      complaint: "",
      diagnosis: "",
      tests: [lab.testName],
      imaging: [],
      medications: [],
      outcome: lab.status,
    });
  }

  visitHistory.sort((a, b) => b.date.localeCompare(a.date));

  return { patient, profile, availableHistory: visitHistory.slice(0, 30) };
}

export async function getRelevantHistoryForVisit(opts: {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  visitContext: AiVisitContext;
}): Promise<RelevantHistoryResponse & { keywords: string[] }> {
  const { profile, availableHistory } = await buildAiPatientContext(opts.patientId, opts.hospitalId);

  const diagnosisText = opts.visitContext.diagnosis ?? "";
  const keywords = extractMedicalKeywords(
    opts.visitContext.chiefComplaint,
    opts.visitContext.symptoms,
    opts.visitContext.assessment,
    diagnosisText,
  );

  const filteredHistory =
    keywords.length > 0
      ? availableHistory.filter((entry) => scoreHistoryMatch(entry, keywords) > 0)
      : availableHistory.slice(0, 10);

  const response = await fetchRelevantHistory({
    patientId: opts.patientId,
    doctorId: opts.doctorId,
    visitContext: opts.visitContext,
    patientProfile: profile,
    availableHistory: filteredHistory.length ? filteredHistory : availableHistory.slice(0, 10),
    keywords,
  });

  return { ...response, keywords };
}

function scoreHistoryMatch(entry: AiHistoryEntry, keywords: string[]): number {
  const blob = [entry.complaint, entry.diagnosis, entry.outcome, ...entry.tests, ...entry.medications]
    .join(" ")
    .toLowerCase();
  return keywords.reduce((score, kw) => (blob.includes(kw) ? score + 1 : score), 0);
}

export async function checkDoctorAction(opts: {
  patientId: string;
  doctorId: string;
  hospitalId: string;
  visitId?: string;
  action: {
    type: "LAB_ORDER" | "IMAGING_ORDER" | "PRESCRIPTION" | "REFERRAL";
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    reason?: string;
  };
  visitContext: AiVisitContext;
}): Promise<CheckActionResponse> {
  const { profile, availableHistory } = await buildAiPatientContext(opts.patientId, opts.hospitalId);

  return fetchCheckAction({
    patientId: opts.patientId,
    doctorId: opts.doctorId,
    visitId: opts.visitId,
    action: opts.action,
    visitContext: opts.visitContext,
    patientProfile: profile,
    availableHistory,
  });
}

export async function saveAiOverride(
  hospitalId: string,
  payload: AiOverridePayload,
  req?: Request,
) {
  await prisma.clinicalSafetyAuditLog.create({
    data: {
      patientId: payload.patientId,
      doctorId: payload.doctorId,
      hospitalId,
      attemptedAction: {
        type: payload.actionType,
        name: payload.actionName,
        visit_id: payload.visitId ?? null,
      },
      aiAlert: {
        alertType: payload.aiAlertType ?? "NONE",
        severity: payload.aiSeverity ?? "LOW",
        message: payload.aiMessage ?? "",
      },
      finalDecision: ClinicalSafetyDecision.OVERRIDDEN,
      overrideReason: payload.overrideReason,
    },
  });

  if (req) {
    await writeAuditLog({
      ...auditFromRequest(req),
      action: "ai_override",
      resourceType: "ai_visit",
      resourceId: payload.patientId,
      success: true,
      failureReason: payload.overrideReason,
    });
  }

  logger.info("Doctor AI override saved", {
    patientId: payload.patientId,
    doctorId: payload.doctorId,
    actionType: payload.actionType,
    actionName: payload.actionName,
  });

  return { success: true };
}
