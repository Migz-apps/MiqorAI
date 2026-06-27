import { api } from "./client";

export type AiVisitContext = {
  chiefComplaint?: string;
  symptoms?: string;
  assessment?: string;
  diagnosis?: string;
};

export type RelevantHistoryItem = {
  date: string;
  facility: string;
  reason: string;
  summary: string;
  tests: string[];
  medications: string[];
  imaging: string[];
};

export type RelevantHistoryResponse = {
  relevantHistory: RelevantHistoryItem[];
  confidence: number;
  keywords?: string[];
  aiUnavailable?: boolean;
  message?: string;
};

export type CheckActionResponse = {
  hasAlert: boolean;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  alertType?: string;
  title?: string;
  message?: string;
  evidence?: Array<{ date: string; facility: string; detail: string }>;
  recommendedAction?: string;
  alternatives?: string[];
  requiresOverrideReason?: boolean;
  aiUnavailable?: boolean;
};

export const aiApi = {
  health: () => api<{ enabled: boolean; configured: boolean }>("/api/ai/health"),
  relevantHistory: (body: { patientId: string; visitContext: AiVisitContext }) =>
    api<RelevantHistoryResponse>("/api/ai/relevant-history", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  checkAction: (body: {
    patientId: string;
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
  }) =>
    api<CheckActionResponse>("/api/ai/check-action", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  override: (body: {
    patientId: string;
    visitId?: string;
    actionType: string;
    actionName: string;
    aiAlertType?: string;
    aiSeverity?: string;
    aiMessage?: string;
    overrideReason: string;
  }) =>
    api("/api/ai/override", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export function toVisitContext(draft: {
  chief: string;
  symptoms: string;
  assessment: string;
  diagnoses: Array<{ code: string; label: string }>;
}): AiVisitContext {
  return {
    chiefComplaint: draft.chief || undefined,
    symptoms: draft.symptoms || undefined,
    assessment: draft.assessment || undefined,
    diagnosis: draft.diagnoses.length
      ? draft.diagnoses.map((d) => `${d.code} — ${d.label}`).join("; ")
      : undefined,
  };
}
