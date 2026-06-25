#!/usr/bin/env python3
"""
MiqorAI clinical safety fine-tuning on Qwen/Qwen1.5-0.5B-Chat (QLoRA).
Compatible with Google Colab Free and recent TRL versions.

Loads all .jsonl files from --data_dir, expands ai_training_action_cases into SFT examples.
"""

from __future__ import annotations

import argparse
import inspect
import json
import random
import sys
from pathlib import Path
from typing import Any

import torch
from datasets import Dataset
from peft import LoraConfig, prepare_model_for_kbit_training
from transformers import AutoModelForCausalLM, AutoTokenizer, BitsAndBytesConfig
from trl import SFTConfig, SFTTrainer

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

LORA_CONFIG = LoraConfig(
    r=16,
    lora_alpha=32,
    lora_dropout=0.05,
    target_modules=["q_proj", "k_proj", "v_proj", "o_proj", "gate_proj", "up_proj", "down_proj"],
    task_type="CAUSAL_LM",
    bias="none",
)


def load_jsonl_patients(data_dir: Path) -> list[dict[str, Any]]:
    patients: list[dict[str, Any]] = []
    files = sorted(data_dir.glob("*.jsonl"))
    if not files:
        raise FileNotFoundError(f"No .jsonl files found in {data_dir}")

    for path in files:
        with path.open(encoding="utf-8") as f:
            for line_no, line in enumerate(f, start=1):
                line = line.strip()
                if not line:
                    continue
                try:
                    obj = json.loads(line)
                except json.JSONDecodeError as exc:
                    raise ValueError(f"{path.name}:{line_no} invalid JSON: {exc}") from exc
                patients.append(obj)
    return patients


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


def format_doctor_attempted_action(action: Any) -> str:
    if isinstance(action, dict):
        action_type = _txt(action.get("type"))
        item = _txt(action.get("item"))
        lines = []
        if action_type:
            lines.append(f"type: {action_type}")
        if item:
            lines.append(f"item: {item}")
        if lines:
            return "\n".join(lines)
    text = _txt(action)
    return text if text else "—"


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


def format_user_message(
    patient_record: dict[str, Any],
    visit_history: list[dict[str, Any]],
    case: dict[str, Any],
) -> str:
    lines = [
        "PATIENT DEMOGRAPHICS:",
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
            f"CURRENT COMPLAINT: {_txt(case.get('current_complaint')) or '—'}",
            "DOCTOR ATTEMPTED ACTION:",
            format_doctor_attempted_action(case.get("doctor_attempted_action")),
            "",
            OUTPUT_JSON_SCHEMA,
        ]
    )
    return "\n".join(lines)


def build_json_assistant(
    alert_title: str,
    severity: str,
    reasoning: str,
    ai_search_result: str | dict[str, Any],
    doctor_options: list[str],
    intervention_required: bool,
) -> str:
    if isinstance(ai_search_result, dict):
        ai_search_result = json.dumps(ai_search_result, ensure_ascii=False, separators=(",", ":"))
    payload = {
        "alert_title": alert_title,
        "severity": severity,
        "reasoning": reasoning,
        "ai_search_result": ai_search_result,
        "doctor_options": [_txt(option) for option in doctor_options if _txt(option)],
        "intervention_required": intervention_required,
    }
    return json.dumps(payload, ensure_ascii=False, separators=(",", ":"))


def format_assistant_message(case: dict[str, Any]) -> str:
    notification = case.get("ai_notification") if isinstance(case.get("ai_notification"), dict) else {}
    decision = case.get("ai_decision") if isinstance(case.get("ai_decision"), dict) else {}

    alert_title = _txt(notification.get("title"))
    severity = _txt(decision.get("severity"))
    reasoning = _txt(notification.get("message"))
    ai_search_result = _txt(case.get("ai_search_result"))
    doctor_options = [_txt(option) for option in _as_list(notification.get("available_doctor_actions")) if _txt(option)]

    intervention_required = decision.get("intervention_required")
    if not isinstance(intervention_required, bool):
        intervention_required = bool(intervention_required)

    if not all([alert_title, severity, reasoning, ai_search_result, doctor_options]):
        return ""

    return build_json_assistant(
        alert_title,
        severity,
        reasoning,
        ai_search_result,
        doctor_options,
        intervention_required,
    )


def _synthetic_user(context: str) -> str:
    return f"{context.strip()}\n\n{OUTPUT_JSON_SCHEMA}"


def _synthetic_example(user: str, assistant: str) -> list[dict[str, str]]:
    return [
        {"role": "system", "content": SYSTEM_MESSAGE},
        {"role": "user", "content": _synthetic_user(user)},
        {"role": "assistant", "content": assistant},
    ]


def _synthetic_context(complaint: str, action_type: str, item: str) -> str:
    return (
        f"CURRENT COMPLAINT: {complaint}\n"
        f"DOCTOR ATTEMPTED ACTION:\n"
        f"type: {action_type}\n"
        f"item: {item}"
    )


def build_synthetic_format_examples() -> list[list[dict[str, str]]]:
    """Ten perfect JSON examples per alert type (50 total)."""
    examples: list[list[dict[str, str]]] = []

    duplicate_rows = [
        ("Fatigue", "CBC", "high", 19),
        ("Cough", "chest X-ray", "medium", 23),
        ("Follow-up", "BMP", "medium", 10),
        ("Hyperlipidemia review", "lipid panel", "low", 97),
        ("Dysuria", "urinalysis", "medium", 15),
        ("Diabetes review", "HbA1c", "low", 31),
        ("Anemia workup", "reticulocyte count", "medium", 12),
        ("Thyroid symptoms", "TSH", "low", 45),
        ("Chest pain", "ECG", "medium", 8),
        ("Abdominal pain", "abdominal ultrasound", "medium", 14),
    ]
    allergy_rows = [
        ("Sore throat", "amoxicillin 500mg TID", "penicillin", "critical"),
        ("UTI", "trimethoprim-sulfamethoxazole", "sulfa", "critical"),
        ("Pain", "ibuprofen 400mg TID", "NSAID", "high"),
        ("CT needed", "CT with iodinated contrast", "iodinated contrast", "high"),
        ("Post-op pain", "codeine 30mg PRN", "codeine", "high"),
        ("Chest pain", "aspirin 325mg", "aspirin", "critical"),
        ("Rash", "cephalexin 500mg QID", "cephalosporin cross-reactivity", "high"),
        ("Anesthesia plan", "latex-containing catheter", "latex", "high"),
        ("Contrast study", "gadolinium MRI contrast", "gadolinium", "medium"),
        ("Antibiotic order", "vancomycin IV", "vancomycin infusion reaction", "medium"),
    ]
    interaction_rows = [
        ("Gout flare", "ibuprofen 600mg TID", "warfarin", "ibuprofen", "increased bleeding"),
        ("Depression", "fluoxetine 20mg daily", "MAOI", "fluoxetine", "serotonin syndrome"),
        ("Hypertension", "lisinopril 10mg daily", "potassium supplement", "lisinopril", "hyperkalemia"),
        ("Infection", "clarithromycin 500mg BID", "simvastatin", "clarithromycin", "myopathy"),
        ("Anxiety", "alprazolam 0.5mg TID", "opioid", "alprazolam", "respiratory depression"),
        ("Seizure control", "phenytoin 300mg daily", "warfarin", "phenytoin", "reduced anticoagulation"),
        ("Fungal infection", "ketoconazole 200mg daily", "atorvastatin", "ketoconazole", "statin toxicity"),
        ("Arrhythmia", "amiodarone 200mg daily", "digoxin", "amiodarone", "digoxin toxicity"),
        ("HIV therapy", "ritonavir 100mg BID", "sildenafil", "ritonavir", "hypotension risk"),
        ("TB treatment", "rifampin 600mg daily", "oral contraceptive", "rifampin", "reduced contraceptive efficacy"),
    ]
    risk_rows = [
        ("Knee pain", "ibuprofen 400mg TID", "ibuprofen", "CKD stage 4", "renal injury"),
        ("Diabetes", "metformin 1000mg BID", "metformin", "eGFR 28", "lactic acidosis"),
        ("AF rate control", "diltiazem 120mg daily", "diltiazem", "on beta-blocker", "bradycardia"),
        ("Agitation", "haloperidol 5mg IM", "haloperidol", "prolonged QT", "torsades"),
        ("Fluid overload", "pioglitazone 30mg daily", "pioglitazone", "heart failure", "fluid retention"),
        ("Abdominal pain", "naproxen 500mg BID", "naproxen", "recent GI bleed", "rebleeding"),
        ("Asthma flare", "propranolol 40mg BID", "propranolol", "asthma", "bronchospasm"),
        ("Pregnancy", "lisinopril 10mg daily", "lisinopril", "pregnancy", "fetal renal toxicity"),
        ("Elderly fall risk", "zolpidem 10mg nightly", "zolpidem", "age over 80", "falls and confusion"),
        ("Hepatic disease", "acetaminophen 1g QID", "acetaminophen", "cirrhosis", "hepatotoxicity"),
    ]
    override_rows = [
        ("Worsening headache after trauma", "CT head with contrast", "CT head", "symptom progression after trauma"),
        ("Chest pain with new ECG changes", "repeat troponin", "troponin", "new ECG changes"),
        ("Severe infection", "penicillin G IV", "penicillin G", "severe infection with desensitization plan"),
        ("Postoperative pain", "morphine 2mg IV PRN", "morphine", "severe postoperative pain inpatient"),
        ("Suspected relapse", "repeat MRI brain", "MRI brain", "new focal neurological deficits"),
        ("New murmur", "repeat echocardiogram", "echocardiogram", "new murmur on exam"),
        ("Worsening dyspnea", "repeat chest CT", "chest CT", "acute respiratory worsening"),
        ("Rising creatinine", "repeat renal ultrasound", "renal ultrasound", "rapid creatinine rise"),
        ("Seizure recurrence", "repeat EEG", "EEG", "new seizure activity"),
        ("Suspected DVT progression", "repeat lower extremity ultrasound", "venous ultrasound", "worsening leg swelling"),
    ]

    for complaint, test, severity, days_since in duplicate_rows:
        user = _synthetic_context(complaint, "test_order", test)
        assistant = build_json_assistant(
            "Recent Similar Test Found",
            severity,
            f"A {test} was ordered recently; repeating it now may be unnecessary without clinical change.",
            {"match_type": "duplicate_test", "test": test, "days_since": days_since},
            ["Cancel duplicate order and review prior result", "Proceed with override and document clinical change"],
            True,
        )
        examples.append(_synthetic_example(user, assistant))

    for complaint, drug, allergen, severity in allergy_rows:
        user = _synthetic_context(complaint, "medication_order", drug)
        assistant = build_json_assistant(
            "Medication Allergy Alert",
            severity,
            f"The patient has a documented {allergen} allergy and should not receive the ordered therapy.",
            {"match_type": "allergy", "allergen": allergen, "ordered_drug": drug, "severity": severity},
            ["Choose a safe alternative", "Cancel prescription and reassess"],
            True,
        )
        examples.append(_synthetic_example(user, assistant))

    for complaint, drug, drug_a, drug_b, risk in interaction_rows:
        user = _synthetic_context(complaint, "medication_order", drug)
        assistant = build_json_assistant(
            "Medication Interaction Alert",
            "high",
            f"{drug_b} combined with {drug_a} increases the risk of {risk}.",
            {"match_type": "interaction", "drug_a": drug_a, "drug_b": drug_b, "risk": risk},
            ["Use a non-interacting alternative", "Avoid combination and monitor closely if override needed"],
            True,
        )
        examples.append(_synthetic_example(user, assistant))

    for complaint, drug, medication, condition, risk in risk_rows:
        user = _synthetic_context(complaint, "medication_order", drug)
        assistant = build_json_assistant(
            "Medication Safety Alert",
            "high",
            f"{medication} is high risk in a patient with {condition} and may cause {risk}.",
            {"match_type": "medication_risk", "drug": medication, "condition": condition, "risk": risk},
            ["Choose a safer alternative", "Cancel order and reassess treatment plan"],
            True,
        )
        examples.append(_synthetic_example(user, assistant))

    for complaint, item, test_or_drug, reason in override_rows:
        action_type = "test_order" if "IV" not in item and "mg" not in item else "medication_order"
        user = _synthetic_context(complaint, action_type, item)
        key = "test" if action_type == "test_order" else "drug"
        assistant = build_json_assistant(
            "No Blocking Alert",
            "low",
            f"Repeat or continued therapy is clinically justified because of {reason}.",
            {"match_type": "justified_override", key: test_or_drug, "reason": reason},
            ["Proceed and document clinical indication", "Defer if symptoms improve rapidly"],
            False,
        )
        examples.append(_synthetic_example(user, assistant))

    return examples


def patient_to_messages(patient_obj: dict[str, Any]) -> list[list[dict[str, str]]]:
    patient_record = patient_obj.get("patient_record")
    if not isinstance(patient_record, dict):
        patient_record = {}

    visit_history = _as_list(patient_obj.get("visit_history"))
    cases = _as_list(patient_obj.get("ai_training_action_cases"))

    message_sets: list[list[dict[str, str]]] = []
    for case in cases:
        if not isinstance(case, dict):
            continue
        assistant = format_assistant_message(case)
        if not assistant.strip():
            continue
        message_sets.append(
            [
                {"role": "system", "content": SYSTEM_MESSAGE},
                {
                    "role": "user",
                    "content": format_user_message(patient_record, visit_history, case),
                },
                {"role": "assistant", "content": assistant},
            ]
        )
    return message_sets


def build_message_examples(patients: list[dict[str, Any]]) -> tuple[list[list[dict[str, str]]], int, int]:
    synthetic_examples = build_synthetic_format_examples()
    patient_examples: list[list[dict[str, str]]] = []
    for patient in patients:
        patient_examples.extend(patient_to_messages(patient))

    all_examples = synthetic_examples + patient_examples
    if not all_examples:
        raise ValueError("No training examples created. Check ai_training_action_cases in your JSONL.")
    return all_examples, len(synthetic_examples), len(patient_examples)


def messages_to_text(tokenizer: AutoTokenizer, messages: list[dict[str, str]]) -> str:
    return tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=False)


def build_text_dataset(tokenizer: AutoTokenizer, message_examples: list[list[dict[str, str]]]) -> Dataset:
    rows = [{"text": messages_to_text(tokenizer, messages)} for messages in message_examples]
    return Dataset.from_list(rows)


def print_formatted_example(tokenizer: AutoTokenizer, messages: list[dict[str, str]], index: int) -> None:
    text = messages_to_text(tokenizer, messages)
    print(f"\n{'=' * 60}\nFORMATTED EXAMPLE {index}\n{'=' * 60}")
    print(text)
    print(f"{'=' * 60}\n")


def split_train_eval(
    examples: list[Any], train_ratio: float = 0.8, seed: int = 42
) -> tuple[list[Any], list[Any]]:
    rng = random.Random(seed)
    shuffled = examples.copy()
    rng.shuffle(shuffled)
    split_at = max(1, int(len(shuffled) * train_ratio)) if len(shuffled) > 1 else 1
    if split_at >= len(shuffled):
        split_at = len(shuffled) - 1
    return shuffled[:split_at], shuffled[split_at:]


def filter_kwargs(target: type, kwargs: dict[str, Any]) -> dict[str, Any]:
    params = inspect.signature(target.__init__).parameters
    return {key: value for key, value in kwargs.items() if key in params}


def tokenize_text_dataset(tokenizer: AutoTokenizer, dataset: Dataset, max_seq_length: int) -> Dataset:
    def tokenize_batch(batch: dict[str, list[str]]) -> dict[str, Any]:
        tokenized = tokenizer(
            batch["text"],
            truncation=True,
            max_length=max_seq_length,
        )
        tokenized["labels"] = [row[:] for row in tokenized["input_ids"]]
        return tokenized

    return dataset.map(tokenize_batch, batched=True, remove_columns=dataset.column_names)


def build_sft_trainer(
    model,
    tokenizer: AutoTokenizer,
    train_ds: Dataset,
    eval_ds: Dataset | None,
    output_dir: Path,
    args: argparse.Namespace,
) -> SFTTrainer:
    has_eval = eval_ds is not None and len(eval_ds) > 0
    sft_config_params = inspect.signature(SFTConfig.__init__).parameters
    trainer_params = inspect.signature(SFTTrainer.__init__).parameters

    config_supports_text_field = "dataset_text_field" in sft_config_params
    config_supports_max_seq_length = "max_seq_length" in sft_config_params
    config_supports_max_length = "max_length" in sft_config_params
    trainer_supports_max_seq_length = "max_seq_length" in trainer_params
    trainer_supports_max_length = "max_length" in trainer_params

    training_kwargs: dict[str, Any] = {
        "output_dir": str(output_dir),
        "num_train_epochs": args.num_train_epochs,
        "per_device_train_batch_size": args.per_device_train_batch_size,
        "per_device_eval_batch_size": 1,
        "gradient_accumulation_steps": args.gradient_accumulation_steps,
        "learning_rate": args.learning_rate,
        "logging_steps": 10,
        "save_strategy": "epoch",
        "bf16": torch.cuda.is_available() and torch.cuda.is_bf16_supported(),
        "fp16": torch.cuda.is_available() and not torch.cuda.is_bf16_supported(),
        "optim": "paged_adamw_8bit",
        "warmup_ratio": 0.03,
        "lr_scheduler_type": "cosine",
        "report_to": "none",
        "seed": args.seed,
        "packing": False,
    }

    if "eval_strategy" in sft_config_params:
        training_kwargs["eval_strategy"] = "epoch" if has_eval else "no"
    elif "evaluation_strategy" in sft_config_params:
        training_kwargs["evaluation_strategy"] = "epoch" if has_eval else "no"

    if config_supports_text_field:
        training_kwargs["dataset_text_field"] = "text"

    max_length_handled = False
    if config_supports_max_seq_length:
        training_kwargs["max_seq_length"] = args.max_seq_length
        max_length_handled = True
    elif config_supports_max_length:
        training_kwargs["max_length"] = args.max_seq_length
        max_length_handled = True

    training_args = SFTConfig(**filter_kwargs(SFTConfig, training_kwargs))

    need_manual_tokenize = not config_supports_text_field and "text" in train_ds.column_names
    if need_manual_tokenize:
        print("TRL SFTConfig has no dataset_text_field; tokenizing datasets manually.")
        train_ds = tokenize_text_dataset(tokenizer, train_ds, args.max_seq_length)
        if has_eval and eval_ds is not None:
            eval_ds = tokenize_text_dataset(tokenizer, eval_ds, args.max_seq_length)
        max_length_handled = True

    trainer_kwargs: dict[str, Any] = {
        "model": model,
        "args": training_args,
        "train_dataset": train_ds,
        "peft_config": LORA_CONFIG,
    }

    if "processing_class" in trainer_params:
        trainer_kwargs["processing_class"] = tokenizer
    elif "tokenizer" in trainer_params:
        trainer_kwargs["tokenizer"] = tokenizer

    if has_eval and eval_ds is not None:
        trainer_kwargs["eval_dataset"] = eval_ds

    if not max_length_handled:
        if trainer_supports_max_seq_length:
            trainer_kwargs["max_seq_length"] = args.max_seq_length
        elif trainer_supports_max_length:
            trainer_kwargs["max_length"] = args.max_seq_length

    trainer_kwargs = filter_kwargs(SFTTrainer, trainer_kwargs)
    return SFTTrainer(**trainer_kwargs)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Fine-tune MiqorAI on Qwen1.5-0.5B-Chat with QLoRA")
    parser.add_argument("--data_dir", type=str, default="./dataset")
    parser.add_argument("--output_dir", type=str, default=DEFAULT_OUTPUT_DIR)
    parser.add_argument("--model_id", type=str, default=MODEL_ID)
    parser.add_argument("--max_seq_length", type=int, default=1024)
    parser.add_argument("--num_train_epochs", type=int, default=2)
    parser.add_argument("--per_device_train_batch_size", type=int, default=1)
    parser.add_argument("--gradient_accumulation_steps", type=int, default=8)
    parser.add_argument("--learning_rate", type=float, default=2e-4)
    parser.add_argument("--train_ratio", type=float, default=0.8)
    parser.add_argument("--seed", type=int, default=42)
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    data_dir = Path(args.data_dir)
    output_dir = Path(args.output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    if not torch.cuda.is_available():
        print("WARNING: CUDA not detected. Training will be very slow on CPU.", file=sys.stderr)

    patients = load_jsonl_patients(data_dir)
    print(f"Patients loaded: {len(patients)}")

    message_examples, synthetic_count, patient_example_count = build_message_examples(patients)
    print(f"Synthetic format examples: {synthetic_count}")
    print(f"Patient-derived examples: {patient_example_count}")
    print(f"Training examples created: {len(message_examples)}")

    train_messages, eval_messages = split_train_eval(message_examples, train_ratio=args.train_ratio, seed=args.seed)
    print(f"Train examples: {len(train_messages)} | Eval examples: {len(eval_messages)}")

    bnb_config = BitsAndBytesConfig(
        load_in_4bit=True,
        bnb_4bit_quant_type="nf4",
        bnb_4bit_compute_dtype=torch.bfloat16 if torch.cuda.is_bf16_supported() else torch.float16,
        bnb_4bit_use_double_quant=True,
    )

    tokenizer = AutoTokenizer.from_pretrained(args.model_id, trust_remote_code=True)
    if tokenizer.pad_token is None:
        tokenizer.pad_token = tokenizer.eos_token

    print_formatted_example(tokenizer, train_messages[0], 1)
    if len(train_messages) > 1:
        print_formatted_example(tokenizer, train_messages[1], 2)

    train_ds = build_text_dataset(tokenizer, train_messages)
    eval_ds = build_text_dataset(tokenizer, eval_messages) if eval_messages else None

    model = AutoModelForCausalLM.from_pretrained(
        args.model_id,
        quantization_config=bnb_config,
        device_map="auto",
        trust_remote_code=True,
    )
    model.config.use_cache = False
    model = prepare_model_for_kbit_training(model)

    trainer = build_sft_trainer(model, tokenizer, train_ds, eval_ds, output_dir, args)
    trainer.train()
    trainer.save_model(str(output_dir))
    tokenizer.save_pretrained(str(output_dir))

    meta = {
        "patients_loaded": len(patients),
        "synthetic_examples": synthetic_count,
        "patient_examples": patient_example_count,
        "examples_total": len(message_examples),
        "train_examples": len(train_messages),
        "eval_examples": len(eval_messages),
        "train_ratio": args.train_ratio,
        "max_seq_length": args.max_seq_length,
        "model_id": args.model_id,
        "output_format": "json",
        "system_message": SYSTEM_MESSAGE,
    }
    (output_dir / "training_meta.json").write_text(json.dumps(meta, indent=2), encoding="utf-8")

    print(f"\nTraining complete. Adapter and tokenizer saved to: {output_dir.resolve()}")


if __name__ == "__main__":
    main()
