# Clinical Safety AI Integration

The MiqorAI Node.js API calls a remote always-on FastAPI clinical-safety service over public HTTPS only when a doctor orders a lab test or prescribes medication.

## Environment variables

Add these to `server/.env`:

```env
AI_SERVICE_BASE_URL=https://your-ai-service.example.com
AI_SERVICE_API_KEY=
MIQORAI_AI_MOCK=false
```

| Variable | Description |
|----------|-------------|
| `AI_SERVICE_BASE_URL` | Primary base URL of the deployed FastAPI clinical-safety service, without a trailing slash |
| `AI_SERVICE_URL` | Legacy alias still supported by the backend |
| `AI_SERVICE_API_KEY` | Optional bearer/API key forwarded to the AI service when required |
| `MIQORAI_AI_MOCK` | `true` uses the mock checker instead of the live model |

If neither `AI_SERVICE_BASE_URL` nor `AI_SERVICE_URL` is set and `MIQORAI_AI_MOCK` is not `true`, prescriptions and lab orders proceed without an AI gate.

## Health check

```bash
curl https://miqorai.onrender.com/api/v1/clinical-safety/health
```

This proxies to `GET {AI_SERVICE_BASE_URL}/health` when the AI service is configured.

Expected remote AI endpoints:

- `GET /health`
- `POST /clinical-safety/check`
- `POST /clinical-safety/check/mock`

## Doctor order flow

1. Doctor submits `POST /api/hospital/prescription` or `POST /api/hospital/lab-order`.
2. Backend builds a clinical-safety payload from patient history, visits, complaint, and attempted action.
3. Backend calls the remote AI service with the configured timeout and retry policy.
4. If `intervention_required` is `false`, the order is created normally.
5. If `intervention_required` is `true`, the order is blocked and a `409 Conflict` response is returned.

Example blocked response:

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

If the AI service is unreachable, the backend returns a safe fallback alert with `intervention_required: true`.

## Override and cancel

After a block, the doctor can:

Override with a documented reason:

```http
POST /api/v1/clinical-safety/{pendingActionId}/override
Authorization: Bearer <hospital token>
Content-Type: application/json

{ "override_reason": "Benefit outweighs risk after manual review" }
```

This completes the original prescription or lab order and stores an audit record.

Cancel:

```http
POST /api/v1/clinical-safety/{pendingActionId}/cancel
Authorization: Bearer <hospital token>
```

No order is created.

## Mock mode

Set `MIQORAI_AI_MOCK=true` to test without the deployed AI host.

- With `AI_SERVICE_BASE_URL` or `AI_SERVICE_URL` set, the backend calls `/clinical-safety/check/mock`
- Without an AI URL, the backend uses the built-in local mock

## Audit trail

Decisions are stored in `clinical_safety_audit_logs` with:

- patient, doctor, attempted action, and AI alert details
- final decision of `ALLOWED`, `BLOCKED`, `OVERRIDDEN`, or `CANCELLED`
- override reason when applicable

## What is not gated

- Reception and check-in
- Doctor assignment
- Vitals, diagnosis notes, and referrals
- Pharmacy dispensing

Only test orders and medication prescriptions trigger the AI service.
