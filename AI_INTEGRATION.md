# MiqorAI — AI Service Integration

This document explains how the Node.js backend connects to the AI service (local FastAPI or Google Colab tunnel) for visit assistance and clinical action checks.

## Architecture

```
Hospital Portal  →  Node API (/api/ai/*)  →  AI Service (/ai/*)
Patient Portal   →  Node API (/api/patient/*)
```

The backend never sends full patient charts to the frontend by default. During a visit:

1. Doctor enters complaint / symptoms / assessment / diagnosis.
2. Backend extracts medical keywords and loads **limited** history for that patient only.
3. AI returns **relevant history** for the Records / Relevant History panel.
4. Before lab or prescription actions, backend calls **check-action** and returns alerts.
5. Doctor may override with a documented reason (`POST /api/ai/override`).

Existing clinical-safety gating on `POST /api/hospital/prescription` and `POST /api/hospital/lab-order` remains intact.

---

## Environment variables

Add to `server/.env`:

```env
AI_SERVICE_BASE_URL=https://your-tunnel-url.trycloudflare.com
AI_SERVICE_URL=https://your-tunnel-url.trycloudflare.com
AI_SERVICE_API_KEY=
AI_SERVICE_TIMEOUT_SECONDS=60
AI_SERVICE_ENABLED=true
MIQORAI_AI_MOCK=false
```

| Variable | Description |
|----------|-------------|
| `AI_SERVICE_BASE_URL` | Public URL of the AI FastAPI service (Colab tunnel) |
| `AI_SERVICE_URL` | Alias supported for backward compatibility |
| `AI_SERVICE_API_KEY` | Optional bearer token sent to AI service |
| `AI_SERVICE_TIMEOUT_SECONDS` | Request timeout (default `60`) |
| `AI_SERVICE_ENABLED` | `false` disables AI calls; app continues normally |
| `MIQORAI_AI_MOCK` | `true` uses local mock when remote AI is unreachable |

---

## Backend endpoints

| Method | Path | Purpose |
|--------|------|---------|
| `GET` | `/api/ai/health` | AI integration status |
| `POST` | `/api/ai/relevant-history` | Keyword + history → relevant records |
| `POST` | `/api/ai/check-action` | Lab / Rx / imaging / referral safety check |
| `POST` | `/api/ai/override` | Save doctor override to audit log |

AI service endpoints (FastAPI):

| Method | Path |
|--------|------|
| `POST` | `/ai/relevant-history` |
| `POST` | `/ai/check-action` |
| `GET` | `/health` |

---

## Manual setup — Google Colab

1. Open the AI service notebook / environment.
2. Start the FastAPI server (`uvicorn app.main:app --host 0.0.0.0 --port 8000`).
3. Start a tunnel (`ngrok`, `cloudflared`, or `localtunnel`).
4. Copy the public **HTTPS** URL.
5. Keep the Colab runtime running while testing.

Example:

```bash
cloudflared tunnel --url http://localhost:8000
```

---

## Manual setup — Backend

```powershell
cd server
# Edit .env with AI_SERVICE_BASE_URL and AI_SERVICE_ENABLED=true
npm run dev
```

Verify:

```powershell
curl http://localhost:3000/api/ai/health
curl http://localhost:3000/health
```

---

## Manual setup — Frontend

```powershell
cd ..
npm run dev:core
```

Hospital portal: http://localhost:8080/login  
Patient portal: http://localhost:5173/login

---

## UI test flow

### Hospital (doctor)

1. Log in as `dr.amara@example.com` / `SCH001` / `MiqorAI123!`
2. Open a patient (e.g. Grace Muthoni after QR / search).
3. Confirm tabs: **Patient Profile**, **Add Visit** only by default.
4. Start **Add Visit** — enter chief complaint, symptoms, assessment.
5. Click **Analyze visit** → **Relevant History** tab shows AI-selected prior records (not the doctor's draft text).
6. Order **HbA1c** → duplicate / safety modal if applicable.
7. Prescribe a high-risk drug (e.g. warfarin in mock) → alert modal → **Proceed anyway** with override reason.

### Patient

1. Log in as `grace.muthoni@example.com` / `MiqorAI123!`
2. Go to **Share Access**.
3. Confirm doctors/hospitals show with correct names (not "Unknown").
4. Click **Revoke** — access should be removed; error shown if API fails.

---

## Fallback behavior

| Condition | Behavior |
|-----------|----------|
| `AI_SERVICE_ENABLED=false` | No alerts; empty relevant history |
| AI unreachable | `aiUnavailable: true` message; doctor continues with judgment |
| `MIQORAI_AI_MOCK=true` | Local rule-based mock responses |

---

## Tests

```powershell
cd server
npm run test:all
```

Includes `tests/ai-visit.test.ts` for disabled AI, relevant history, check-action, and override.
