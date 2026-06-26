# Clinical Safety AI Integration

The MiqorAI Node.js API calls a remote FastAPI clinical-safety service (for example a fine-tuned model running on Google Colab behind ngrok) **only when a doctor orders a lab test or prescribes medication**.

## Environment variables

Add these to `server/.env`:

```env
AI_SERVICE_URL=https://xxxx.ngrok-free.app
MIQORAI_AI_MOCK=false
```

| Variable | Description |
|----------|-------------|
| `AI_SERVICE_URL` | Base URL of the Colab/ngrok FastAPI service (no trailing slash) |
| `MIQORAI_AI_MOCK` | `true` = use local mock or `/clinical-safety/check/mock` when URL is set |

If **neither** `AI_SERVICE_URL` nor `MIQORAI_AI_MOCK=true` is set, prescriptions and lab orders proceed without an AI gate (existing behavior preserved).

## Health check

```bash
curl http://localhost:3000/api/v1/clinical-safety/health
```

Proxies to `GET {AI_SERVICE_URL}/health` when configured.

Remote AI service endpoints:

- `GET /health`
- `POST /clinical-safety/check`
- `POST /clinical-safety/check/mock`

## Doctor order flow

1. Doctor submits `POST /api/hospital/prescription` or `POST /api/hospital/lab-order`.
2. Backend builds a clinical-safety payload from patient history, visits, complaint, and attempted action.
3. Backend calls the remote AI service (15s timeout, one retry on transient errors).
4. If `intervention_required` is **false** → order is created normally.
5. If `intervention_required` is **true** → order is **not** created. Response:

```json
{
  "success": false,
  "blocked": true,
  "message": "MiqorAI clinical safety review requires doctor attention.",
  "ai_alert": {
    "alert_title": "...",
    "severity": "...",
    "reasoning": "...",
    "ai_search_result": "...",
    "doctor_options": ["..."],
    "intervention_required": true
  },
  "pending_action_id": "uuid"
}
```

HTTP status: **409 Conflict**

If the AI service is unreachable, a safe fallback alert is returned with `intervention_required: true`.

## Override and cancel

After a block, the doctor can:

**Override** (requires documented reason):

```http
POST /api/v1/clinical-safety/{pendingActionId}/override
Authorization: Bearer <hospital token>
Content-Type: application/json

{ "override_reason": "Benefit outweighs risk after manual review" }
```

This completes the original prescription or lab order and stores an audit record.

**Cancel**:

```http
POST /api/v1/clinical-safety/{pendingActionId}/cancel
Authorization: Bearer <hospital token>
```

No order is created.

## Mock mode

Set `MIQORAI_AI_MOCK=true` to test without Colab:

- With `AI_SERVICE_URL` set → calls `/clinical-safety/check/mock`
- Without URL → uses built-in local mock (flags high-risk drug/test names)

## Audit trail

Decisions are stored in `clinical_safety_audit_logs` with:

- patient, doctor, attempted action, AI alert
- final decision: `ALLOWED`, `BLOCKED`, `OVERRIDDEN`, `CANCELLED`
- override reason when applicable

## What is NOT gated

- Reception / check-in
- Doctor assignment
- Vitals, diagnosis notes, referrals
- Pharmacy dispensing

Only **test orders** and **medication prescriptions** trigger the AI service.
