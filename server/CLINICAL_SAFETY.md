# Clinical Safety AI Integration

The MiqorAI Node.js API calls a remote always-on FastAPI clinical-safety service over public HTTPS only when a doctor orders a lab test or prescribes medication.

## Environment variables

Add these to `server/.env`:

```env
AI_SERVICE_BASE_URL=https://your-ai-service.example.com
AI_SERVICE_API_KEY=
AI_SERVICE_TIMEOUT_SECONDS=60
AI_SERVICE_ENABLED=true
MIQORAI_AI_MOCK=false
```

| Variable | Description |
|----------|-------------|
| `AI_SERVICE_BASE_URL` | Primary base URL of the deployed FastAPI clinical-safety service, without a trailing slash |
| `AI_SERVICE_URL` | Legacy alias still supported by the backend |
| `AI_SERVICE_API_KEY` | Optional bearer/API key forwarded to the AI service when required |
| `AI_SERVICE_TIMEOUT_SECONDS` | Request timeout for AI service calls in seconds (default `60`, minimum `5`) |
| `AI_SERVICE_ENABLED` | Set to `false` to disable the AI gate entirely; any other value (or unset) keeps it enabled |
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

## Fail-open vs fail-closed

The gate distinguishes an *unconfigured* service from an *unreachable* one.

| Variable | Default | Description |
|----------|---------|-------------|
| `CLINICAL_SAFETY_REQUIRED` | `false` | `true` blocks prescriptions and lab orders when the clinical-safety service is disabled or unconfigured, instead of letting them through ungated |

Decision matrix:

| Service state | `CLINICAL_SAFETY_REQUIRED=false` (default) | `CLINICAL_SAFETY_REQUIRED=true` |
|---------------|--------------------------------------------|---------------------------------|
| Configured and reachable | Model/mock decision applies | Model/mock decision applies |
| Configured but unreachable or erroring | Blocked: safe fallback alert (`intervention_required: true`), pending action created | Same — blocked with safe fallback alert |
| Disabled (`AI_SERVICE_ENABLED=false`) or no URL/mock configured | Allowed: order proceeds without a safety gate (fail-open) | Blocked: treated like the unreachable case — safe fallback alert, pending action created (fail-closed) |

In every blocked case the doctor can still override with a documented reason or
cancel via the pending-action endpoints above. Set `CLINICAL_SAFETY_REQUIRED=true`
in environments where orders must never bypass the safety review.
