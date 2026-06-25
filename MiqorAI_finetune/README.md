# MiqorAI Fine-Tuning (Qwen1.5-0.5B-Chat)

Kaggle-ready QLoRA fine-tuning for **MiqorAI clinical safety alerts** using synthetic patient JSONL data.

## Project layout

```
MiqorAI_finetune/
├── dataset/                  ← put your 10 .jsonl batch files here
├── train_miqorai_qwen15.py   ← training script
├── test_miqorai_qwen15.py    ← 5 fixed clinical safety tests
├── requirements.txt
└── README.md
```

**Dataset expectation:** 10 independent `.jsonl` files × 10 patients per file = **100 patients total**.

---

## JSONL schema (one patient per line)

Each line is a JSON object:

```json
{
  "patient_record": {
    "demographics": {
      "name": "Grace Muthoni",
      "age": 41,
      "sex": "F",
      "weight_kg": 64,
      "renal_function": "eGFR 72"
    },
    "allergies": [
      { "substance": "Penicillin", "severity": "severe" }
    ],
    "chronic_conditions": [
      { "name": "Type 2 diabetes" },
      { "name": "Hypertension" }
    ],
    "current_medications": [
      { "name": "Metformin", "dose": "500mg", "frequency": "BID" },
      { "name": "Lisinopril", "dose": "10mg", "frequency": "daily" }
    ]
  },
  "visit_history": [
    {
      "date": "2026-05-10",
      "complaint": "Fatigue",
      "tests_ordered": "CBC, HbA1c",
      "imaging": "none"
    },
    {
      "date": "2026-06-01",
      "complaint": "Follow-up",
      "tests_ordered": "CBC",
      "imaging": "none"
    }
  ],
  "ai_training_action_cases": [
    {
      "current_complaint": "Persistent fatigue",
      "doctor_attempted_action": "Order CBC today",
      "alert_title": "Duplicate CBC within 30 days",
      "severity": "high",
      "reasoning": "CBC was ordered on 2026-06-01; repeat testing may be unnecessary unless clinical change.",
      "doctor_options": [
        "Cancel duplicate CBC and review prior result",
        "Proceed with override and document clinical justification",
        "Order alternative workup if symptoms worsened"
      ]
    }
  ]
}
```

**Rules:**
- One JSON object per line (JSONL).
- Each patient can have **multiple** `ai_training_action_cases` → multiple training examples.
- Field aliases are supported (e.g. `medications` vs `current_medications`).

---

## System message (fixed)

```
You are MiqorAI, a clinical safety assistant. You help doctors detect duplicate tests, medication allergies, drug interactions, medication risk, and clinically justified overrides. You do not replace the doctor. You provide concise safety alerts.
```

---

## Training format

| Role | Content |
|------|---------|
| **system** | Message above |
| **user** | Demographics, allergies, conditions, meds, recent visits, complaint, doctor action |
| **assistant** | `ALERT TITLE`, `SEVERITY`, `REASONING`, `DOCTOR OPTIONS` |

**Split:** **80% train / 20% eval** (shuffled, seed=42).

---

## LoRA / QLoRA config

| Parameter | Value |
|-----------|-------|
| Base model | `Qwen/Qwen1.5-0.5B-Chat` |
| r | 16 |
| lora_alpha | 32 |
| lora_dropout | 0.05 |
| target_modules | q_proj, k_proj, v_proj, o_proj, gate_proj, up_proj, down_proj |
| Quantization | 4-bit NF4 (bitsandbytes) |

## Training hyperparameters

| Parameter | Value |
|-----------|-------|
| max_seq_length | 2048 |
| num_train_epochs | 2 |
| per_device_train_batch_size | 1 |
| gradient_accumulation_steps | 8 |
| learning_rate | 2e-4 |
| effective batch size | 8 |

---

## Kaggle quickstart

### 1. Enable GPU
Settings → Accelerator → **GPU T4 x2** (or P100).

### 2. Install dependencies
```bash
cd /kaggle/working/MiqorAI_finetune
pip install -q -r requirements.txt
```

### 3. Add your dataset
Upload your 10 `.jsonl` files into `dataset/` (or mount as Kaggle Dataset).

### 4. Train
```bash
python train_miqorai_qwen15.py \
  --data_dir ./dataset \
  --output_dir ./miqorai-qwen15-adapter
```

The script prints:
- Number of patients loaded
- Number of training examples created
- Train/eval split sizes
- **2 formatted examples** before training starts

### 5. Test (5 fixed scenarios)
```bash
python test_miqorai_qwen15.py \
  --adapter_dir ./miqorai-qwen15-adapter
```

Tests:
1. Duplicate CBC
2. Penicillin allergy vs amoxicillin
3. NSAID risk in CKD
4. Justified repeat CT after trauma
5. Warfarin + ibuprofen interaction

### 6. Save output (Kaggle)
```bash
cp -r miqorai-qwen15-adapter /kaggle/working/
```
Then **Save Version** → **Save & Run All** to persist the adapter.

---

## Local run

```bash
cd MiqorAI_finetune
pip install -r requirements.txt

# Place .jsonl files in dataset/
python train_miqorai_qwen15.py --data_dir ./dataset --output_dir ./miqorai-qwen15-adapter
python test_miqorai_qwen15.py --adapter_dir ./miqorai-qwen15-adapter
```

Requires NVIDIA GPU with CUDA for practical training (QLoRA 4-bit).

---

## CLI reference

### `train_miqorai_qwen15.py`
| Flag | Default | Description |
|------|---------|-------------|
| `--data_dir` | `./dataset` | Folder with `.jsonl` files |
| `--output_dir` | `./miqorai-qwen15-adapter` | Adapter output path |
| `--model_id` | `Qwen/Qwen1.5-0.5B-Chat` | Base model |
| `--max_seq_length` | 2048 | Max tokens |
| `--num_train_epochs` | 2 | Epochs |
| `--train_ratio` | 0.8 | Train fraction (rest = eval) |
| `--seed` | 42 | Shuffle seed |

### `test_miqorai_qwen15.py`
| Flag | Default | Description |
|------|---------|-------------|
| `--adapter_dir` | `./miqorai-qwen15-adapter` | Trained adapter |
| `--max_new_tokens` | 384 | Generation length |
| `--temperature` | 0.2 | Sampling temperature |

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `No .jsonl files found` | Add files to `dataset/` |
| `No training examples created` | Ensure each patient has `ai_training_action_cases` array |
| CUDA OOM | Already using 4-bit; reduce `max_seq_length` to 1024 |
| `bitsandbytes` error on CPU | Use Kaggle GPU runtime |
| Slow first run | HuggingFace downloads ~1GB model weights |

---

## License note

`Qwen/Qwen1.5-0.5B-Chat` is subject to [Qwen license terms](https://huggingface.co/Qwen/Qwen1.5-0.5B-Chat). Use synthetic/de-identified training data only for clinical ML experiments.
