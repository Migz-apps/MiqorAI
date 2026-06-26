export type AiVisitContext = {
  chiefComplaint?: string;
  symptoms?: string;
  assessment?: string;
  diagnosis?: string;
};

export type AiPatientProfileDto = {
  age: number;
  sex: string;
  bloodGroup: string;
  allergies: string[];
  chronicConditions: string[];
  currentMedications: string[];
};

export type AiHistoryEntry = {
  date: string;
  facility: string;
  complaint: string;
  diagnosis: string;
  tests: string[];
  imaging: string[];
  medications: string[];
  outcome: string;
};

export type RelevantHistoryRequest = {
  patientId: string;
  doctorId: string;
  visitContext: AiVisitContext;
  patientProfile: AiPatientProfileDto;
  availableHistory: AiHistoryEntry[];
  keywords?: string[];
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
  aiUnavailable?: boolean;
  message?: string;
};

export type AiActionType = "LAB_ORDER" | "IMAGING_ORDER" | "PRESCRIPTION" | "REFERRAL";

export type CheckActionRequest = {
  patientId: string;
  doctorId: string;
  visitId?: string;
  action: {
    type: AiActionType;
    name: string;
    dose?: string;
    frequency?: string;
    duration?: string;
    reason?: string;
  };
  visitContext: AiVisitContext;
  patientProfile: AiPatientProfileDto;
  availableHistory: AiHistoryEntry[];
};

export type CheckActionEvidence = {
  date: string;
  facility: string;
  detail: string;
};

export type CheckActionResponse = {
  hasAlert: boolean;
  severity?: "LOW" | "MEDIUM" | "HIGH" | "CRITICAL";
  alertType?:
    | "DUPLICATE_TEST"
    | "ALLERGY"
    | "DRUG_INTERACTION"
    | "MEDICATION_RISK"
    | "DUPLICATE_IMAGING"
    | "EXISTING_REFERRAL"
    | "NONE";
  title?: string;
  message?: string;
  evidence?: CheckActionEvidence[];
  recommendedAction?: "CANCEL" | "REVIEW" | "PROCEED_WITH_CAUTION" | "SAFE_TO_PROCEED";
  alternatives?: string[];
  requiresOverrideReason?: boolean;
  aiUnavailable?: boolean;
};

export type AiOverridePayload = {
  patientId: string;
  visitId?: string;
  doctorId: string;
  actionType: AiActionType;
  actionName: string;
  aiAlertType?: string;
  aiSeverity?: string;
  aiMessage?: string;
  overrideReason: string;
};
