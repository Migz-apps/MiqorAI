# MiqorAI — Go-Live Blockers (second pass): status

Every finding from the second-pass go-live audit has been resolved except web-portal i18n
(#22), which is tracked separately. This file records where each fix lives; the original
finding text is in git history.

| # | Finding | Status | Where |
|---|---------|--------|-------|
| 1 | PHI leak via `GET /api/admin/settings` | Fixed: only typed numeric settings are returned | `server/src/modules/platform/admin.service.ts` |
| 2 | Env examples gitignored | Fixed: `*.env.production.example` / `.env.local.example` tracked | `.gitignore` |
| 3 | Server-local "today" | Fixed: day ranges use `PLATFORM_TIMEZONE` (Africa/Kigali) | `server/src/shared/utils/day-range.ts` |
| 4 | nginx without security headers / cache rules | Fixed | `deploy/docker/nginx/` |
| 5 | Referral saved, then 503 / Twilio without timeout | Fixed: best-effort SMS, 10 s abort | `server/src/shared/services/sms.service.ts` |
| 6 | Missing ErrorBoundary | Fixed: shared `@miqorai/ui/error-boundary`; mobile has its own | portals, `mobile_patient/App.tsx` |
| 7 | Mobile single-row storage / QR retry storm | Fixed: split persist storage, exponential backoff | `mobile_patient/src/lib/persist-layout.ts`, `src/lib/backoff.ts` |
| 8 | QR scanner wasm from a CDN | Fixed: `qr-scanner` with a bundled worker | `hospital-portal/src/components/miqorai/QRScanner.tsx` |
| 9 | `render.yaml` not production-ready | Fixed: plan/region, `/health/ready`, `npm ci`, Node 22, worker, shutdown timeout; `checksPass` gated by `ci.yml` | `render.yaml`, `.github/workflows/ci.yml` |
| 10 | In-memory 100/min per-IP rate limit | Fixed: Redis-backed, per user and per IP | `server/src/shared/middleware/rateLimit.ts` |
| 11 | `robots.txt` allows indexing | Fixed: `Disallow: /` (patient landing page excepted) | `*/public/robots.txt` |
| 12 | HTML 404 / wrong status codes | Fixed: JSON 404, 400 bad JSON, 413, 403 CORS | `server/src/shared/middleware/errorHandler.ts` |
| 13 | Vercel rewrite swallows `/api` | Fixed: `/api` proxied first, SPA fallback excludes it; headers block | `*/vercel.json` |
| 14 | Docker builds bake the wrong API URL | Fixed: one root-context `portal.Dockerfile`, required `ARG VITE_API_URL`, root `.dockerignore` applies | `deploy/docker/` |
| 15 | Portal URL / SMTP / auth env vars undocumented | Fixed; `test:production:wiring` checks config vs example | `server/.env.production.example`, `render.yaml` |
| 16 | EAS build without API URL, cleartext, no icon | Fixed | `mobile_patient/eas.json`, `app.config.ts` |
| 17 | Admin production host unclear | Fixed: static SPA on Vercel (or the nginx image) | `DEPLOYMENT_MAP.md` §4 |
| 18 | No license | Fixed: `LICENSE`, `"license": "UNLICENSED"`, `"private": true` | all `package.json` |
| 19 | Census filters capped at 50 | Fixed: searchable catalog filter | `hospital-portal/src/components/miqorai/CatalogFilter.tsx` |
| 20 | Sync conflict unreachable | Fixed: `SyncConflictError` / `SYNC_CONFLICT` | `server/src/modules/platform/sync.service.ts` |
| 21 | Decorative health check | Fixed: `/health/live`, `/health/ready` | `server/src/app.ts` |
| 22 | i18n gap | Mobile done (en/rw/fr). **Web portals open**: English-only | `mobile_patient/src/locales/` |
| 23 | Locale / currency drift | Fixed: Kigali time, RWF, shared formatters | per-portal `lib/format.ts` |
| 24 | Accessibility floor | Fixed: labelled form controls and icon buttons in all portals and mobile; jsx-a11y in lint | portals, `mobile_patient/` |
| 25 | Seed wipes any database | Fixed: refuses `NODE_ENV=production` without `FORCE_SEED=1` | `server/prisma/seed.ts` |
| 26 | AI service env example / hard-coded password | Fixed | `miqorai-ai-service/.env.example`, `server/scripts/check-supabase-logins.ts` |
| 27 | Credential-shaped seed CSVs | Confirmed synthetic and documented | `seed_data/README.md` |
| 28 | Template residue in `public/` | Fixed | `*/public`, `*/index.html` |

Production API host: `https://miqorai.onrender.com` (see `DEPLOYMENT_MAP.md`).
