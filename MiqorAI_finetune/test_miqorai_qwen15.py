#!/usr/bin/env python3
"""
Load MiqorAI JSON QLoRA adapter and run 5 clinical safety inference tests.
Includes JSON extraction, repair, validation, and safe fallbacks.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from pathlib import Path
from typing import Any

import torch
from peft import PeftModel
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig

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

MODEL_ID = "Qwen/Qwen1.5-0.5B-Chat"
DEFAULT_OUTPUT_DIR = "./miqorai-qwen15-json-adapter"

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

TEST_CASES = [
    {
        "name": "duplicate_cbc",
        "user": """PATIENT DEMOGRAPHICS:
- Name: Jane Doe
- Sex: F
- Date of birth: 1981-04-02
- Blood type: A+

ALLERGIES:
- None documented

CHRONIC CONDITIONS:
- Iron deficiency anemia | diagnosed: 2024-11-01 | status: active

CURRENT MEDICATIONS:
- Ferrous sulfate 325mg daily oral | started: 2025-12-01

RECENT VISITS:
- Date: 2026-06-01
  Facility: City Clinic
  Reason for visit: Fatigue follow-up
  Chief complaint/context: Persistent fatigue
  Tests ordered: CBC
  Test results: Mild anemia
  Diagnoses/assessments: Iron deficiency
  Medications started/given: Ferrous sulfate
  Procedures/interventions: —
  Outcome: Continue iron

CURRENT COMPLAINT: Persistent fatigue
DOCTOR ATTEMPTED ACTION:
type: test_order
item: CBC""",
    },
    {
        "name": "penicillin_allergy",
        "user": """PATIENT DEMOGRAPHICS:
- Name: Michael Okonkwo
- Sex: M
- Date of birth: 1994-07-19
- Blood type: B+

ALLERGIES:
- Penicillin | reaction: urticaria | severity: severe | documented: 2015-03-10
- Amoxicillin | reaction: rash | severity: severe | documented: 2016-01-08

CHRONIC CONDITIONS:
- Streptococcal pharyngitis | diagnosed: 2026-06-20 | status: active

CURRENT MEDICATIONS:
- Paracetamol 500mg PRN oral

RECENT VISITS:
- Date: 2026-06-20
  Facility: Urgent Care
  Reason for visit: Sore throat
  Chief complaint/context: Fever and throat pain
  Tests ordered: Rapid strep
  Test results: Positive
  Diagnoses/assessments: Streptococcal pharyngitis
  Medications started/given: —
  Procedures/interventions: —
  Outcome: Awaiting antibiotics

CURRENT COMPLAINT: Bacterial pharyngitis
DOCTOR ATTEMPTED ACTION:
type: medication_order
item: amoxicillin 500mg TID for 7 days""",
    },
    {
        "name": "nsaid_risk_in_ckd",
        "user": """PATIENT DEMOGRAPHICS:
- Name: Esther Wanjiku
- Sex: F
- Date of birth: 1959-02-14
- Blood type: O-

ALLERGIES:
- None documented

CHRONIC CONDITIONS:
- Chronic kidney disease stage 4 | diagnosed: 2020-05-01 | status: eGFR 28
- Osteoarthritis | diagnosed: 2018-09-12 | status: bilateral knee pain

CURRENT MEDICATIONS:
- Amlodipine 5mg daily oral
- Calcium carbonate 500mg BID oral

RECENT VISITS:
- Date: 2026-06-15
  Facility: Nephrology Clinic
  Reason for visit: Knee pain
  Chief complaint/context: Bilateral knee pain
  Tests ordered: Creatinine
  Test results: eGFR 28
  Diagnoses/assessments: CKD stage 4
  Medications started/given: —
  Procedures/interventions: —
  Outcome: Pain management discussed

CURRENT COMPLAINT: Bilateral knee pain
DOCTOR ATTEMPTED ACTION:
type: medication_order
item: ibuprofen 400mg TID""",
    },
    {
        "name": "justified_repeat_ct_trauma",
        "user": """PATIENT DEMOGRAPHICS:
- Name: David Kimani
- Sex: M
- Date of birth: 1997-11-30
- Blood type: AB+

ALLERGIES:
- None documented

CHRONIC CONDITIONS:
- None documented

CURRENT MEDICATIONS:
- None documented

RECENT VISITS:
- Date: 2026-06-10
  Facility: Trauma Center
  Reason for visit: MVC trauma
  Chief complaint/context: Head injury
  Tests ordered: —
  Test results: —
  Diagnoses/assessments: Small subdural hematoma
  Medications started/given: —
  Procedures/interventions: CT head
  Outcome: Discharged with precautions
- Date: 2026-06-19
  Facility: ED
  Reason for visit: Worsening headache
  Chief complaint/context: Vomiting after head injury
  Tests ordered: —
  Test results: —
  Diagnoses/assessments: Post-traumatic headache
  Medications started/given: —
  Procedures/interventions: —
  Outcome: Pending imaging

CURRENT COMPLAINT: Worsening headache and vomiting after head injury
DOCTOR ATTEMPTED ACTION:
type: test_order
item: CT head with contrast""",
    },
    {
        "name": "medication_interaction_warning",
        "user": """PATIENT DEMOGRAPHICS:
- Name: Robert Mensah
- Sex: M
- Date of birth: 1968-05-03
- Blood type: A-

ALLERGIES:
- None documented

CHRONIC CONDITIONS:
- Atrial fibrillation | diagnosed: 2019-04-01 | status: on warfarin
- Hypertension | diagnosed: 2015-08-20 | status: controlled

CURRENT MEDICATIONS:
- Warfarin 5mg daily oral | started: 2019-04-15
- Lisinopril 10mg daily oral | started: 2015-09-01

RECENT VISITS:
- Date: 2026-06-17
  Facility: Cardiology Clinic
  Reason for visit: Joint pain
  Chief complaint/context: Acute gout flare
  Tests ordered: INR
  Test results: INR 2.4
  Diagnoses/assessments: Gout flare
  Medications started/given: —
  Procedures/interventions: —
  Outcome: Pain management planned

CURRENT COMPLAINT: Acute gout flare right first MTP
DOCTOR ATTEMPTED ACTION:
type: medication_order
item: ibuprofen 600mg TID for 5 days""",
    },
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Test MiqorAI JSON Qwen1.5 adapter")
    parser.add_argument(
        "--output_dir",
        "--adapter_dir",
        dest="output_dir",
        type=str,
        default=DEFAULT_OUTPUT_DIR,
        help="Path to saved JSON LoRA adapter + tokenizer",
    )
    parser.add_argument("--model_id", type=str, default=None)
    parser.add_argument("--max_new_tokens", type=int, default=160)
    parser.add_argument("--use_4bit", action=argparse.BooleanOptionalAction, default=True)
    return parser.parse_args()


def resolve_model_id(output_dir: Path, cli_model_id: str | None) -> str:
    if cli_model_id:
        return cli_model_id
    meta_path = output_dir / "training_meta.json"
    if meta_path.exists():
        try:
            meta = json.loads(meta_path.read_text(encoding="utf-8"))
            if meta.get("model_id"):
                return meta["model_id"]
        except json.JSONDecodeError:
            pass
    return MODEL_ID


def load_model_and_tokenizer(model_id: str, output_dir: Path, use_4bit: bool):
    adapter_config = output_dir / "adapter_config.json"
    if not adapter_config.exists():
        raise FileNotFoundError(
            f"LoRA adapter not found in {output_dir}. Run train_miqorai_qwen15.py first."
        )

    tokenizer_source = output_dir if (output_dir / "tokenizer_config.json").exists() else model_id
    tokenizer = AutoTokenizer.from_pretrained(tokenizer_source, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    bnb_config = None
    if use_4bit and torch.cuda.is_available():
        bnb_config = BitsAndBytesConfig(
            load_in_4bit=True,
            bnb_4bit_quant_type="nf4",
            bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
            bnb_4bit_use_double_quant=True,
        )

    base = AutoModelForCausalLM.from_pretrained(
        model_id,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model = PeftModel.from_pretrained(base, str(output_dir))
    model.eval()
    return model, tokenizer


def build_user_prompt(clinical_context: str) -> str:
    return f"{clinical_context.strip()}\n\n{OUTPUT_JSON_SCHEMA}"


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
    filled["doctor_options"] = options[:2] if len(options) >= 2 else DEFAULT_DOCTOR_OPTIONS.copy()

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


def passes_json_validation(payload: dict[str, Any]) -> tuple[bool, list[str]]:
    problems: list[str] = []
    for key in REQUIRED_JSON_KEYS:
        if key not in payload:
            problems.append(f"missing {key}")
            continue
        value = payload[key]
        if key == "doctor_options":
            if not isinstance(value, list) or len(value) < 2 or not all(str(v).strip() for v in value):
                problems.append("doctor_options must be a non-empty list")
        elif key == "intervention_required":
            if not isinstance(value, bool):
                problems.append("intervention_required must be boolean")
        elif not str(value).strip():
            problems.append(f"empty {key}")
    return len(problems) == 0, problems


@torch.inference_mode()
def generate_response(model, tokenizer, user_content: str, max_new_tokens: int) -> str:
    messages = [
        {"role": "system", "content": SYSTEM_MESSAGE},
        {"role": "user", "content": build_user_prompt(user_content)},
    ]
    prompt = tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
    inputs = tokenizer(prompt, return_tensors="pt").to(model.device)

    outputs = model.generate(
        **inputs,
        max_new_tokens=max_new_tokens,
        do_sample=False,
        repetition_penalty=1.2,
        no_repeat_ngram_size=4,
        pad_token_id=tokenizer.pad_token_id,
        eos_token_id=tokenizer.eos_token_id,
    )
    generated = outputs[0][inputs["input_ids"].shape[1] :]
    return tokenizer.decode(generated, skip_special_tokens=True).strip()


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)

    if not output_dir.exists():
        print(f"ERROR: output_dir not found: {output_dir}", file=sys.stderr)
        print("Run train_miqorai_qwen15.py first or pass --output_dir", file=sys.stderr)
        sys.exit(1)

    if not torch.cuda.is_available():
        print("WARNING: CUDA not detected. Inference will be slow.", file=sys.stderr)

    model_id = resolve_model_id(output_dir, args.model_id)
    print(f"Loading base model: {model_id}")
    print(f"Loading adapter + tokenizer from: {output_dir.resolve()}")
    model, tokenizer = load_model_and_tokenizer(model_id, output_dir, args.use_4bit)

    passed = 0
    for i, case in enumerate(TEST_CASES, start=1):
        print(f"\n{'#' * 70}")
        print(f"TEST {i}/5: {case['name']}")
        print(f"{'#' * 70}")

        raw_output = generate_response(model, tokenizer, case["user"], max_new_tokens=args.max_new_tokens)
        print("RAW MODEL OUTPUT:")
        print(raw_output)

        repaired_payload, used_fallback = parse_and_repair_json(raw_output)
        print("\nREPAIRED JSON:")
        print(json.dumps(repaired_payload, indent=2, ensure_ascii=False))

        ok, problems = passes_json_validation(repaired_payload)
        if ok:
            passed += 1
            status = "PASS"
            if used_fallback:
                status += " (fallback used)"
        else:
            status = f"FAIL - {', '.join(problems)}"

        print(f"\nVALIDATION STATUS: {status}")

    print(f"\n{'=' * 70}")
    print(f"Tests completed: {len(TEST_CASES)} | Valid JSON responses: {passed}/{len(TEST_CASES)}")
    print(f"{'=' * 70}")


if __name__ == "__main__":
    main()
