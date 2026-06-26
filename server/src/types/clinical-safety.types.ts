export interface AiAllergyRecord {
  substance?: string | null;
  reaction?: string | null;
  severity?: string | null;
  documented_date?: string | null;
}

export interface AiChronicConditionRecord {
  condition?: string | null;
  diagnosed_date?: string | null;
  current_status?: string | null;
}

export interface AiMedicationRecord {
  name?: string | null;
  dose?: string | null;
  frequency?: string | null;
  route?: string | null;
  started_date?: string | null;
}

export interface AiPatientRecordDto {
  patient_id: string;
  name: string;
  sex: string;
  date_of_birth: string;
  blood_type?: string | null;
  allergies: AiAllergyRecord[];
  chronic_conditions: AiChronicConditionRecord[];
  current_medications_as_of_2026_06: AiMedicationRecord[];
}

export interface AiVisitHistoryDto {
  date?: string | null;
  facility?: string | null;
  reason_for_visit?: string | null;
  chief_complaint_or_context?: string | null;
  tests_ordered?: string[] | string | null;
  test_results?: string[] | string | null;
  diagnoses_or_assessments?: string[] | string | null;
  medications_started_or_given?: string[] | string | null;
  procedures_or_interventions?: string[] | string | null;
  outcome?: string | null;
  ai_relevant_notes?: string | null;
}

export interface DoctorAttemptedActionDto {
  type: "test_order" | "medication_prescription";
  item: string;
}

export interface ClinicalSafetyRequest {
  patient_record: AiPatientRecordDto;
  visit_history: AiVisitHistoryDto[];
  current_complaint: string;
  doctor_attempted_action: DoctorAttemptedActionDto;
}

export interface ClinicalSafetyResponse {
  alert_title: string;
  severity: string;
  reasoning: string;
  ai_search_result: string;
  doctor_options: string[];
  intervention_required: boolean;
}

export interface AiOverrideRequestDto {
  override_reason: string;
}

export interface ClinicalSafetyBlockedResponse {
  success: false;
  blocked: true;
  message: string;
  ai_alert: ClinicalSafetyResponse;
  pending_action_id: string;
}

export interface AiHealthResponse {
  status: string;
  model_loaded?: boolean;
}
