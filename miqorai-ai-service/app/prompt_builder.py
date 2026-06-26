from __future__ import annotations

import json
from typing import Any

from app.schemas import ClinicalSafetyCheckRequest

SYSTEM_MESSAGE = (
    "You are MiqorAI. You must output ONLY valid JSON matching the required schema. "
    "Do not output prose, markdown, explanations, repeated fields, or malformed JSON."
)

OUTPUT_JSON_SCHEMA = """REQUIRED JSON SCHEMA (output JSON only, no markdown):
{
  "alert_title": "string",
  "severity": "string",
  "reasoning": "string",
  "ai_search_result": "string",
  "doctor_options": ["string", "string"],
  "intervention_required": true
}"""


def _as_list(value: Any) -> list[Any]:
    if value is None:
        return []
    if isinstance(value, list):
        return value
    return [value]


def _txt(value: Any) -> str:
    if value is None:
        return ""
    if isinstance(value, (dict, list)):
        return json.dumps(value, ensure_ascii=False)
    return str(value).strip()


def _format_list_field(value: Any) -> str:
    if value is None or value == "":
        return "—"
    if isinstance(value, list):
        parts = [_txt(v) for v in value if _txt(v)]
        return "; ".join(parts) if parts else "—"
    return _txt(value) or "—"


def format_doctor_attempted_action(action_type: str, item: str) -> str:
    lines = []
    if action_type:
        lines.append(f"type: {action_type}")
    if item:
        lines.append(f"item: {item}")
    return "\n".join(lines) if lines else "—"


def format_allergies(patient_record: dict[str, Any]) -> list[str]:
    allergies = _as_list(patient_record.get("allergies"))
    if not allergies:
        return ["- None documented"]
    lines: list[str] = []
    for allergy in allergies:
        if not isinstance(allergy, dict):
            text = _txt(allergy)
            if text:
                lines.append(f"- {text}")
            continue
        substance = _txt(allergy.get("substance"))
        reaction = _txt(allergy.get("reaction"))
        severity = _txt(allergy.get("severity"))
        documented_date = _txt(allergy.get("documented_date"))
        lines.append(
            f"- {substance or 'Unknown substance'} | reaction: {reaction or '—'} | "
            f"severity: {severity or '—'} | documented: {documented_date or '—'}"
        )
    return lines or ["- None documented"]


def format_chronic_conditions(patient_record: dict[str, Any]) -> list[str]:
    conditions = _as_list(patient_record.get("chronic_conditions"))
    if not conditions:
        return ["- None documented"]
    lines: list[str] = []
    for condition in conditions:
        if not isinstance(condition, dict):
            text = _txt(condition)
            if text:
                lines.append(f"- {text}")
            continue
        name = _txt(condition.get("condition") or condition.get("name"))
        diagnosed_date = _txt(condition.get("diagnosed_date"))
        current_status = _txt(condition.get("current_status"))
        lines.append(
            f"- {name or 'Unknown condition'} | diagnosed: {diagnosed_date or '—'} | "
            f"status: {current_status or '—'}"
        )
    return lines or ["- None documented"]


def format_current_medications(patient_record: dict[str, Any]) -> list[str]:
    medications = _as_list(patient_record.get("current_medications_as_of_2026_06"))
    if not medications:
        return ["- None documented"]
    lines: list[str] = []
    for med in medications:
        if not isinstance(med, dict):
            text = _txt(med)
            if text:
                lines.append(f"- {text}")
            continue
        name = _txt(med.get("name") or med.get("drug") or med.get("medication"))
        dose = _txt(med.get("dose") or med.get("dosage"))
        frequency = _txt(med.get("frequency"))
        route = _txt(med.get("route"))
        started = _txt(med.get("started_date") or med.get("start_date"))
        parts = [p for p in [dose, frequency, route] if p]
        detail = " ".join(parts).strip()
        suffix = f" | started: {started}" if started else ""
        lines.append(f"- {name or 'Unknown medication'}{(' ' + detail) if detail else ''}{suffix}")
    return lines or ["- None documented"]


def sort_visits_desc(visit_history: list[dict[str, Any]]) -> list[dict[str, Any]]:
    visits = [v for v in visit_history if isinstance(v, dict)]

    def sort_key(visit: dict[str, Any]) -> str:
        return _txt(visit.get("date"))

    return sorted(visits, key=sort_key, reverse=True)[:5]


def format_visit_block(visit: dict[str, Any]) -> str:
    return "\n".join(
        [
            f"- Date: {_txt(visit.get('date')) or '—'}",
            f"  Facility: {_txt(visit.get('facility')) or '—'}",
            f"  Reason for visit: {_txt(visit.get('reason_for_visit')) or '—'}",
            f"  Chief complaint/context: {_txt(visit.get('chief_complaint_or_context')) or '—'}",
            f"  Tests ordered: {_format_list_field(visit.get('tests_ordered'))}",
            f"  Test results: {_format_list_field(visit.get('test_results'))}",
            f"  Diagnoses/assessments: {_format_list_field(visit.get('diagnoses_or_assessments'))}",
            f"  Medications started/given: {_format_list_field(visit.get('medications_started_or_given'))}",
            f"  Procedures/interventions: {_format_list_field(visit.get('procedures_or_interventions'))}",
            f"  Outcome: {_txt(visit.get('outcome')) or '—'}",
        ]
    )


def build_user_prompt(request: ClinicalSafetyCheckRequest) -> str:
    patient_record = request.patient_record.model_dump()
    visit_history = [v.model_dump() if hasattr(v, "model_dump") else v for v in request.visit_history]
    action = request.doctor_attempted_action

    lines = [
        "PATIENT DEMOGRAPHICS:",
        f"- Patient ID: {_txt(patient_record.get('patient_id')) or '—'}",
        f"- Name: {_txt(patient_record.get('name')) or '—'}",
        f"- Sex: {_txt(patient_record.get('sex')) or '—'}",
        f"- Date of birth: {_txt(patient_record.get('date_of_birth')) or '—'}",
        f"- Blood type: {_txt(patient_record.get('blood_type')) or '—'}",
        "",
        "ALLERGIES:",
        *format_allergies(patient_record),
        "",
        "CHRONIC CONDITIONS:",
        *format_chronic_conditions(patient_record),
        "",
        "CURRENT MEDICATIONS:",
        *format_current_medications(patient_record),
        "",
        "RECENT VISITS:",
    ]

    recent_visits = sort_visits_desc(visit_history)
    if recent_visits:
        for visit in recent_visits:
            lines.append(format_visit_block(visit))
            lines.append("")
        if lines[-1] == "":
            lines.pop()
    else:
        lines.append("- No recent visits documented")

    lines.extend(
        [
            "",
            f"CURRENT COMPLAINT: {_txt(request.current_complaint) or '—'}",
            "DOCTOR ATTEMPTED ACTION:",
            format_doctor_attempted_action(action.type, action.item),
            "",
            OUTPUT_JSON_SCHEMA,
        ]
    )
    return "\n".join(lines)


def build_chat_messages(request: ClinicalSafetyCheckRequest) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_MESSAGE},
        {"role": "user", "content": build_user_prompt(request)},
    ]
