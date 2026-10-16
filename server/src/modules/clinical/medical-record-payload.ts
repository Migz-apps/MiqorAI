/**
 * Typed views over MedicalRecord.data. The column stays Json, but every reader
 * goes through these helpers so legacy payload shapes are handled in one place.
 *
 * Write paths (hospital.routes.ts diagnosis route, doctor-workspace draft
 * completion) produce the current shapes below; older rows may use `condition`
 * instead of `name` on diagnoses and `drug_name` instead of `name` on
 * medications.
 */

export interface DiagnosisPayload {
  name?: string;
  /** Legacy alias for `name`. */
  condition?: string;
  codes?: string[];
  chief_complaint?: string;
  symptoms?: string;
  assessment?: string;
  notes?: string;
  visit_id?: string;
  since?: string;
  status?: string;
}

export interface AllergyPayload {
  name?: string;
  severity?: string;
  reaction?: string;
}

export interface MedicationPayload {
  name?: string;
  /** Legacy alias for `name`. */
  drug_name?: string;
  generic_name?: string;
  dose?: string;
  freq?: string;
  frequency?: string;
  since?: string;
  status?: string;
}

function asRecord(data: unknown): Record<string, unknown> {
  return data && typeof data === "object" && !Array.isArray(data)
    ? (data as Record<string, unknown>)
    : {};
}

function asString(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() ? value : undefined;
}

export function diagnosisName(data: unknown, fallback = "Condition"): string {
  const d = asRecord(data) as DiagnosisPayload;
  return asString(d.name) ?? asString(d.condition) ?? fallback;
}

export function diagnosisCodes(data: unknown): string[] {
  const d = asRecord(data);
  if (!Array.isArray(d.codes)) return [];
  return d.codes.filter((code): code is string => typeof code === "string" && code.length > 0);
}

export function allergyLabel(data: unknown, fallback = "Allergy"): string {
  const d = asRecord(data) as AllergyPayload;
  const name = asString(d.name) ?? fallback;
  return d.severity ? `${name} (${d.severity})` : name;
}

export function medicationName(data: unknown): string | undefined {
  const d = asRecord(data) as MedicationPayload;
  return asString(d.name) ?? asString(d.drug_name);
}
