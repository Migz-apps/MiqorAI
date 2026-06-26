from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field


class AllergyRecord(BaseModel):
    substance: str | None = None
    reaction: str | None = None
    severity: str | None = None
    documented_date: str | None = None


class ChronicConditionRecord(BaseModel):
    condition: str | None = None
    diagnosed_date: str | None = None
    current_status: str | None = None


class MedicationRecord(BaseModel):
    name: str | None = None
    dose: str | None = None
    frequency: str | None = None
    route: str | None = None
    started_date: str | None = None


class PatientRecord(BaseModel):
    patient_id: str
    name: str
    sex: str
    date_of_birth: str
    blood_type: str | None = None
    allergies: list[AllergyRecord | dict[str, Any]] = Field(default_factory=list)
    chronic_conditions: list[ChronicConditionRecord | dict[str, Any]] = Field(default_factory=list)
    current_medications_as_of_2026_06: list[MedicationRecord | dict[str, Any]] = Field(default_factory=list)


class VisitRecord(BaseModel):
    date: str | None = None
    facility: str | None = None
    reason_for_visit: str | None = None
    chief_complaint_or_context: str | None = None
    tests_ordered: list[str] | str | None = None
    test_results: list[str] | str | None = None
    diagnoses_or_assessments: list[str] | str | None = None
    medications_started_or_given: list[str] | str | None = None
    procedures_or_interventions: list[str] | str | None = None
    outcome: str | None = None
    ai_relevant_notes: str | None = None


class DoctorAttemptedAction(BaseModel):
    type: Literal["test_order", "medication_prescription"]
    item: str


class ClinicalSafetyCheckRequest(BaseModel):
    patient_record: PatientRecord
    visit_history: list[VisitRecord | dict[str, Any]] = Field(default_factory=list)
    current_complaint: str
    doctor_attempted_action: DoctorAttemptedAction


class ClinicalSafetyAlertResponse(BaseModel):
    alert_title: str
    severity: str
    reasoning: str
    ai_search_result: str
    doctor_options: list[str]
    intervention_required: bool


class ClinicalSafetyCheckResponse(ClinicalSafetyAlertResponse):
    used_fallback: bool = False
    raw_model_output: str | None = None


class HealthResponse(BaseModel):
    status: Literal["ok"] = "ok"
    model_loaded: bool
