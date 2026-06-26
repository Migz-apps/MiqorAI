from __future__ import annotations

import json
import re
from typing import Any

REQUIRED_JSON_KEYS = (
    "alert_title",
    "severity",
    "reasoning",
    "ai_search_result",
    "doctor_options",
    "intervention_required",
)

DEFAULT_DOCTOR_OPTIONS = ["Review manually", "Continue only with documented reason"]

MALFORMED_KEY_REPAIRS = {
    '"reasoning:"': '"reasoning"',
    '"alert_title:"': '"alert_title"',
    '"severity:"': '"severity"',
    '"ai_search_result:"': '"ai_search_result"',
    '"doctor_options:"': '"doctor_options"',
    '"intervention_required:"': '"intervention_required"',
    "'reasoning:'": "'reasoning'",
    "'alert_title:'": "'alert_title'",
    "'severity:'": "'severity'",
    "'ai_search_result:'": "'ai_search_result'",
    "'doctor_options:'": "'doctor_options'",
    "'intervention_required:'": "'intervention_required'",
}


def remove_markdown_fences(text: str) -> str:
    cleaned = text.strip()
    if cleaned.startswith("```"):
        cleaned = re.sub(r"^```[a-zA-Z]*\s*", "", cleaned)
        cleaned = re.sub(r"\s*```$", "", cleaned)
    return cleaned.strip()


def normalize_smart_quotes(text: str) -> str:
    return (
        text.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )


def extract_json_candidate(text: str) -> str:
    cleaned = remove_markdown_fences(normalize_smart_quotes(text.strip()))
    start = cleaned.find("{")
    end = cleaned.rfind("}")
    if start == -1 or end <= start:
        return cleaned
    return cleaned[start : end + 1]


def repair_json_text(text: str) -> str:
    repaired = extract_json_candidate(text)
    for bad, good in MALFORMED_KEY_REPAIRS.items():
        repaired = repaired.replace(bad, good)
    repaired = re.sub(r",\s*}", "}", repaired)
    repaired = re.sub(r",\s*]", "]", repaired)
    repaired = repaired.replace("},", "}")
    return repaired.strip()


def create_fallback_payload(raw_output: str) -> dict[str, Any]:
    return {
        "alert_title": "Clinical Safety Alert",
        "severity": "Review",
        "reasoning": raw_output.strip() or "Clinical review required.",
        "ai_search_result": "Output required repair but could not be fully parsed.",
        "doctor_options": DEFAULT_DOCTOR_OPTIONS.copy(),
        "intervention_required": True,
    }


def _coerce_bool(value: Any) -> bool:
    if isinstance(value, bool):
        return value
    if isinstance(value, str):
        lowered = value.strip().lower()
        if lowered in {"true", "1", "yes"}:
            return True
        if lowered in {"false", "0", "no"}:
            return False
    return bool(value)


def fill_missing_fields(payload: dict[str, Any]) -> dict[str, Any]:
    filled = dict(payload)

    if not str(filled.get("alert_title", "")).strip():
        filled["alert_title"] = "Clinical Safety Alert"
    if not str(filled.get("severity", "")).strip():
        filled["severity"] = "Review"
    if not str(filled.get("reasoning", "")).strip():
        filled["reasoning"] = "Clinical review required."
    if not str(filled.get("ai_search_result", "")).strip():
        filled["ai_search_result"] = "No structured search result available."

    options = filled.get("doctor_options")
    if not isinstance(options, list):
        options = [str(options)] if options else []
    options = [str(option).strip() for option in options if str(option).strip()]
    if len(options) < 2:
        options = DEFAULT_DOCTOR_OPTIONS.copy()
    filled["doctor_options"] = options

    filled["intervention_required"] = _coerce_bool(filled.get("intervention_required", True))
    return filled


def parse_and_repair_json(raw_output: str) -> tuple[dict[str, Any], bool]:
    repaired_text = repair_json_text(raw_output)
    try:
        parsed = json.loads(repaired_text)
        if isinstance(parsed, dict):
            return fill_missing_fields(parsed), False
    except json.JSONDecodeError:
        pass
    return create_fallback_payload(raw_output), True


def validate_alert_payload(payload: dict[str, Any]) -> tuple[bool, list[str]]:
    problems: list[str] = []
    for key in REQUIRED_JSON_KEYS:
        if key not in payload:
            problems.append(f"missing {key}")
            continue
        value = payload[key]
        if key == "doctor_options":
            if not isinstance(value, list) or not value or not all(str(v).strip() for v in value):
                problems.append("doctor_options must be a non-empty list")
        elif key == "intervention_required":
            if not isinstance(value, bool):
                problems.append("intervention_required must be boolean")
        elif not str(value).strip():
            problems.append(f"empty {key}")
    return len(problems) == 0, problems


def to_alert_response(payload: dict[str, Any]) -> dict[str, Any]:
    ok, problems = validate_alert_payload(payload)
    if not ok:
        payload = fill_missing_fields(create_fallback_payload(json.dumps(payload, ensure_ascii=False)))
    return {
        "alert_title": str(payload["alert_title"]),
        "severity": str(payload["severity"]),
        "reasoning": str(payload["reasoning"]),
        "ai_search_result": str(payload["ai_search_result"]),
        "doctor_options": [str(option) for option in payload["doctor_options"]],
        "intervention_required": bool(payload["intervention_required"]),
    }
