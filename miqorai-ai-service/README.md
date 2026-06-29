# MiqorAI Clinical Safety AI Service

FastAPI microservice that serves the fine-tuned **Qwen/Qwen1.5-0.5B-Chat** LoRA adapter for MiqorAI clinical safety checks.

The service stays dormant until a doctor attempts to order a test or prescribe medication. Your backend sends patient context; the service returns a **validated JSON safety alert**.

## Architecture

```
Hospital Portal / Doctor UI
        |
        v
Spring Boot medical-service  (or Node server/)
        |
        POST /clinical-safety/check
        v
miqorai-ai-service (FastAPI, port 8000)
        |
        Qwen1.5-0.5B + LoRA adapter
```

## Model files

Copy your trained adapter into:

```
miqorai-ai-service/model/miqorai-qwen1.5-0.5b-lora-json-v3/
```

Required files:
- `adapter_config.json`
- `adapter_model.safetensors` (or `.bin`)
- tokenizer files (`tokenizer_config.json`, etc.)

The base model `Qwen/Qwen1.5-0.5B-Chat` is downloaded from Hugging Face on first run.

## Install

```bash
cd miqorai-ai-service
python -m venv .venv

# Windows
.venv\Scripts\activate

# Linux / macOS
source .venv/bin/activate

pip install -r requirements.txt
```

### GPU (recommended)

Install a CUDA-enabled PyTorch build if needed:

```bash
pip install torch --index-url https://download.pytorch.org/whl/cu121
pip install -r requirements-gpu.txt
```

Without CUDA, the service still runs on CPU but logs a warning and inference is slow. `requirements.txt`
is intentionally CPU-safe; GPU hosts should additionally install `requirements-gpu.txt`.

## Run locally

```bash
cd miqorai-ai-service
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Optional environment variables (`.env`):

```env
BASE_MODEL_ID=Qwen/Qwen1.5-0.5B-Chat
ADAPTER_PATH=model/miqorai-qwen1.5-0.5b-lora-json-v3
USE_4BIT=true
MAX_NEW_TOKENS=160
DEBUG_RAW_MODEL_OUTPUT=false
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Service health + model loaded flag |
| POST | `/clinical-safety/check` | Run real model inference |
| POST | `/clinical-safety/check/mock` | Mock alert for backend integration tests |

### Health

```bash
curl http://localhost:8000/health
```

```json
{
  "status": "ok",
  "model_loaded": true
}
```

### Clinical safety check

```bash
curl -X POST http://localhost:8000/clinical-safety/check \
  -H "Content-Type: application/json" \
  -d @examples/request_sample.json
```

Use `?debug=true` to include `raw_model_output` in the response (off by default).

### Mock check (no model inference)

```bash
curl -X POST http://localhost:8000/clinical-safety/check/mock \
  -H "Content-Type: application/json" \
  -d @examples/request_sample.json
```

## Request example

```json
{
  "patient_record": {
    "patient_id": "pat-001",
    "name": "Jane Doe",
    "sex": "F",
    "date_of_birth": "1981-04-02",
    "blood_type": "A+",
    "allergies": [],
    "chronic_conditions": [
      {
        "condition": "Iron deficiency anemia",
        "diagnosed_date": "2024-11-01",
        "current_status": "active"
      }
    ],
    "current_medications_as_of_2026_06": [
      {
        "name": "Ferrous sulfate",
        "dose": "325mg",
        "frequency": "daily",
        "route": "oral"
      }
    ]
  },
  "visit_history": [
    {
      "date": "2026-06-01",
      "facility": "City Clinic",
      "reason_for_visit": "Fatigue follow-up",
      "chief_complaint_or_context": "Persistent fatigue",
      "tests_ordered": ["CBC"],
      "test_results": ["Mild anemia"],
      "diagnoses_or_assessments": ["Iron deficiency"],
      "medications_started_or_given": ["Ferrous sulfate"],
      "procedures_or_interventions": [],
      "outcome": "Continue iron"
    }
  ],
  "current_complaint": "Persistent fatigue",
  "doctor_attempted_action": {
    "type": "test_order",
    "item": "CBC"
  }
}
```

## Response example

```json
{
  "alert_title": "Recent Similar Test Found",
  "severity": "high",
  "reasoning": "A CBC was ordered recently; repeat testing may be unnecessary unless clinical status changed.",
  "ai_search_result": "{\"match_type\":\"duplicate_test\",\"test\":\"CBC\",\"days_since\":19}",
  "doctor_options": [
    "Cancel duplicate order and review prior result",
    "Proceed with override and document clinical justification"
  ],
  "intervention_required": true,
  "used_fallback": false,
  "raw_model_output": null
}
```

## Safety behavior

1. Model output is **JSON only**.
2. Output passes through the same **repair + validation** layer used in `MiqorAI_finetune/test_miqorai_qwen15.py`.
3. If parsing fails, a **safe fallback alert** is returned (`intervention_required: true`).
4. The API never returns raw malformed model text as the final alert fields.
5. `raw_model_output` is only included when `debug=true` or `DEBUG_RAW_MODEL_OUTPUT=true`.

## Docker

```bash
cd miqorai-ai-service
docker build -t miqorai-ai-service .
docker run --gpus all -p 8000:8000 miqorai-ai-service
```

Copy the adapter into `model/miqorai-qwen1.5-0.5b-lora-json-v3/` before building.

For GPU-enabled Docker images, install the optional GPU requirements during build:

```bash
docker build -t miqorai-ai-service .
docker run --gpus all -e USE_4BIT=true -p 8000:8000 miqorai-ai-service
```

---

## Spring Boot integration

Example client: `examples/spring-boot/AiClinicalSafetyClient.java`

### 1. Configure service URL

`application.yml`:

```yaml
services:
  miqorai:
    url: http://localhost:8000
```

### 2. Register RestClient bean (if not already present)

```java
@Bean
RestClient restClient(RestClient.Builder builder) {
    return builder.build();
}
```

### 3. Call before prescription or lab order

```java
ClinicalSafetyRequest request = new ClinicalSafetyRequest(
    new PatientRecord(
        patientId,
        patientName,
        sex,
        dob,
        bloodType,
        allergies,
        chronicConditions,
        currentMedications
    ),
    visitHistory,
    currentComplaint,
    new DoctorAttemptedAction("medication_prescription", "amoxicillin 500mg TID")
);

ClinicalSafetyAlert alert = aiClinicalSafetyClient.checkClinicalSafety(request);

if (alert.interventionRequired()) {
    // Block action and return alert to frontend
    throw new ClinicalSafetyBlockedException(alert);
}

// Continue normal prescription / lab order workflow
```

### 4. Doctor override flow

When the doctor chooses to proceed despite an alert:

```java
aiClinicalSafetyClient.logOverride(doctorId, patientId, alert, overrideReason);
// persist override in audit log, then continue workflow
```

### 5. Integration testing without GPU

```java
ClinicalSafetyAlert mockAlert = aiClinicalSafetyClient.checkClinicalSafetyMock(request);
```

---

## Node.js server integration (optional)

Your `server/` API can call the same endpoint before:

- `POST /api/hospital/prescription`
- lab order creation routes

```typescript
const response = await fetch("http://localhost:8000/clinical-safety/check", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(payload),
});
const alert = await response.json();

if (alert.intervention_required) {
  return res.status(409).json({
    error: "CLINICAL_SAFETY_BLOCK",
    alert,
  });
}
```

---

## Doctor action types

| API value | Meaning |
|-----------|---------|
| `test_order` | Doctor is ordering a diagnostic test |
| `medication_prescription` | Doctor is prescribing a medication |

## Generation settings

- `do_sample=false`
- `max_new_tokens=160`
- `repetition_penalty=1.2`
- `no_repeat_ngram_size=4`

## Project layout

```
miqorai-ai-service/
├── app/
│   ├── main.py           # FastAPI app + endpoints
│   ├── model_loader.py   # Load model once at startup
│   ├── prompt_builder.py # Training-aligned prompt formatting
│   ├── json_repair.py    # Repair + fallback JSON layer
│   ├── schemas.py        # Pydantic request/response models
│   └── config.py         # Settings
├── model/
│   └── miqorai-qwen1.5-0.5b-lora-json-v3/
├── examples/
│   ├── request_sample.json
│   └── spring-boot/
│       └── AiClinicalSafetyClient.java
├── requirements.txt
├── Dockerfile
└── README.md
```
