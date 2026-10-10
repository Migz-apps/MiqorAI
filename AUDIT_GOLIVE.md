# MiqorAI — Go-Live Blockers (second pass)

New findings only — everything here is **in addition to** `AUDIT_DESIGN.md` / `AUDIT_CODE.md`
(first pass) and the performance items in `AUDIT_PERFORMANCE.md`. Items marked **[verified]**
were re-checked directly. One correction to the first pass is at the bottom.

Ordered by severity.

---

## Blockers (fix before any real traffic)

| # | Finding | Where |
|---|---------|-------|
| 1 | **PHI leak via admin settings.** `getPlatformSettings()` loads the **entire** `platform_settings` KV table and spreads `...settings` into the `GET /api/admin/settings` response — including every patient's prefs, pending QR access requests (patient IDs + requester emails), doctors' visit drafts with clinical notes, and onboarding payloads. Also an unbounded payload. **[verified]** | `server/src/services/admin.service.ts:474-484` |
| 2 | **All 8 `.env.production.example` files are gitignored** (`.env.*` at `.gitignore:19`, only `.env.example` re-included). They exist on your disk only; a fresh clone has none, `DEPLOYMENT_MAP.md:11,109` and `Running.md:73` point at missing files, and `npm run test:production:wiring` **crashes with ENOENT on a clean checkout** (`scripts/check-production-wiring.mjs:62-85`). Fix: add `!*.env.production.example` (and `.env.local.example`) to `.gitignore` and commit them. **[verified]** | `.gitignore:19-21` |
| 3 | **"Today" is server-local (UTC on Render).** Every day-boundary query uses `new Date()` with local midnight — for users at UTC+2/+3 the hospital check-in list, pharmacy receipts, dashboards and metrics shift by 2–3 hours. | `hospital.routes.ts:279,329-331,696`; `pharmacy.service.ts:92,942,973`; `portal-complete.service.ts:372,783,790,973,1143,1250`; `insurer.service.ts:308` |
| 4 | **nginx serves with zero security headers** (no CSP, HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy; no `server_tokens off`) **and `index.html` is not no-cache**, so browsers can keep loading old bundles after each deploy. Also `public, immutable` 7d is applied to **unhashed** favicon/placeholder files. Identical in all 4 nginx.conf + `docker/nginx-spa.conf`. Admin has no header layer at all. | `*/nginx.conf:12-20` |
| 5 | **Referral saved, then 503.** With SMS unconfigured in production, `createReferralWithIcd` persists the referral and *then* throws 503 from `sendSms` — the client shows failure for an action that succeeded. Twilio `fetch` has no timeout. | `portal-complete.service.ts:591-593`, `sms.service.ts` |
| 6 | **Insurance and pharmacy portals have no ErrorBoundary** — any render error is a white screen (hospital, patient, admin have one). Mobile has none either. | `insurance-portal/src/App.tsx`, `pharmacy-portal/src/App.tsx`, `mobile_patient/App.tsx` |
| 7 | **Mobile storage can brick the app.** The whole history persists as one AsyncStorage row, rewritten on every state change; Android fails to read rows >~2 MB ("Row too big to fit into CursorWindow") → long-history patients can't hydrate. Plus the 1-request/second QR retry storm when offline. | `mobile_patient/src/store.ts:1002-1033`, `components/ui/qr.tsx:28-40` |
| 8 | **Hospital QR check-in depends on a third-party CDN.** The scanner fetches ~1 MB of zxing wasm from `fastly.jsdelivr.net` at runtime on browsers without native BarcodeDetector (Windows Chrome, Firefox) — breaks offline, under CSP, or if the CDN is blocked. **[verified: URL in built bundle]** | `hospital-portal` (via `@yudiel/react-qr-scanner`); fix with the polyfill's `locateFile` → self-hosted wasm |
| 9 | **`render.yaml` is 9 lines and can't carry production**: no `healthCheckPath` (so no gated zero-downtime swaps), no `envVars`, no plan/region (defaults to a sleeping free tier, region not co-located with Supabase), `npm install` instead of `npm ci`, no Node version pinned anywhere (no `engines`, no `.nvmrc`), `autoDeploy: true` with no CI gate, and `server.close()` has no forced-exit timeout (keep-alive sockets hang shutdown until SIGKILL). | `render.yaml`; `server/src/index.ts:29-35` |
| 10 | **Rate limiter vs clinics**: 100 req/min per IP in memory — one clinic NAT plus a few polling patient tabs hits 429 for everyone behind it (detailed in `AUDIT_PERFORMANCE.md` A1.8). | `server/src/middleware/rateLimit.ts` |

## Should fix before launch

| # | Finding | Where |
|---|---------|-------|
| 11 | **`robots.txt` says `Allow: /` for all bots** on three authenticated healthcare portals → login pages get indexed. Should be `Disallow: /`. | `hospital-portal/public/robots.txt`, insurance, pharmacy |
| 12 | **Server has no JSON 404 catch-all** — unknown API routes return Express's default HTML "Cannot GET /x". Bad-JSON bodies, >2 MB payloads and CORS rejections all surface as 500 INTERNAL_ERROR instead of 400/413/403. | `server/src/app.ts:64-92`, `middleware/errorHandler.ts:20-30` |
| 13 | **Vercel rewrites swallow `/api`**: `"/(.*)" → /index.html` catches API paths too; with an empty/relative `VITE_API_URL`, API calls receive index.html with HTTP 200 → JSON parse errors instead of clean failures. No `headers` block either (ties into #4). | all 4 `vercel.json` |
| 14 | **Docker builds bake the wrong API URL.** No Dockerfile declares `ARG VITE_API_URL`; `COPY . .` bakes whatever local `.env` exists (or nothing on a clean clone → empty URL at build time). | all portal Dockerfiles |
| 15 | **Portal URL env vars missing from the production example** (`ADMIN/PATIENT/HOSPITAL/INSURANCE/PHARMACY_PORTAL_URL`) — if unset they're guessed from CORS origins or fall back to `BASE_URL`, so invitation and reset **emails can link to the API host**. Also missing: `SMTP_SECURE`, `AUTH_CHALLENGE_*`, `PASSWORD_RESET_EXPIRES_MINUTES`. | `server/.env.production.example` vs `config.ts:88,102-111` |
| 16 | **EAS production builds get no API URL**: `eas.json` production profile has no `env` block, so cloud builds rely on an EAS secret that nothing documents; `app.json` `extra.apiUrl: "${EXPO_PUBLIC_API_URL}"` is a dead literal (never interpolated, never read). Mobile also ships `usesCleartextTraffic: true` and **no app icon/splash** (default Expo icon), while `android/gradle.properties` contradicts `app.json` on `newArchEnabled`. | `mobile_patient/eas.json:16-20`, `app.json:20,25-26` |
| 17 | **Admin production story is incoherent**: Dockerfile runs `vite preview` (a dev preview server, full dev `node_modules` copied in) while `DEPLOYMENT_MAP.md:68` says Cloudflare Workers and `wrangler.jsonc` is unconfigured template residue (`"name": "tanstack-start-app"`, no vars). Pick one host and make it real. | `admin-portal/Dockerfile:17-21`, `wrangler.jsonc` |
| 18 | **No LICENSE file and no `license` field in any package.json**, despite "Proprietary — MiqorAI" in README prose. Add `"license": "UNLICENSED"` + `"private": true` everywhere and a LICENSE file. | all `package.json` |
| 19 | **Census filters are silently capped at 50**: the server returns `take: 50` for ICD and drug catalogs, and the hospital portal renders that as the complete filter list — filtering by any condition/drug outside the first 50 alphabetical entries is impossible. | `server/src/services/reference.service.ts`, `hospital-portal/src/pages/Patients.tsx:46-56,92-103` |
| 20 | **Sync conflict state is unreachable** (`.includes("CONFLICT")` vs lowercase message) — the whole conflict-resolution UI can never trigger. **[verified]** | `server/src/services/sync.service.ts:52,117` |
| 21 | **Health check is decorative**: `/health` returns static `{status:"ok"}` with no DB/Redis probe, so Render (once `healthCheckPath` exists) would pass a dead instance. | `server/src/app.ts:74` |
| 22 | **i18n gap for the target market**: mobile offers en/rw/fr with a language picker, but live screens are ~95% hard-coded English; all web portals are English-only. Choosing Kinyarwanda barely changes the UI. | `mobile_patient/src/i18n.ts` + screens |
| 23 | **Timezone/locale drift in UI**: ~67 bare `toLocaleDateString()`/`toLocaleString()` calls across the portals (admin 18, pharmacy 19, hospital 11, insurance 10, patient 9) with no locale/timeZone pinned; admin mixes `en-US` and `en-GB`. Currency: server default `KES`, admin/insurance format `KSh` but admin fee is USD, insurance copy says "Franc", pharmacy formats `KES`. Pick one locale + currency source (the server setting) and one `formatMoney`. | per-portal |
| 24 | **Accessibility floor**: admin login labels have no `htmlFor`/`id` or `autoComplete`; patient login has 0 `htmlFor` and unlabeled OTP slots; icon-only buttons without `aria-label` (QR scanner close, etc.); one `accessibilityLabel` in the entire mobile app; 5–11 `aria-label`s per portal total. | `admin-portal/src/routes/login.tsx:132-160`, `patient .../login.tsx:954`, scanners |
| 25 | **Seeding footgun**: `test:api:all` and `test:integration:portals` run `db:seed`, which **wipes whatever `DATABASE_URL` points at**, with no production guard and no docs warning. Add an env check in `seed.ts` (refuse when `NODE_ENV=production` unless `FORCE_SEED=1`). | `server/package.json:18,20`, `prisma/seed.ts` |
| 26 | **AI service has no `.env.example` at all** (settings exist in `config.py` only), and `check-supabase-logins.ts:5` carries a hard-coded default password literal. | `miqorai-ai-service/`, `server/scripts/` |
| 27 | **Tracked seed CSVs contain credential-shaped columns** (`users.csv` `password_hash`, `patients.csv` `national_id`, `recovery_phrase_enc`, `staff_users.csv` `license_number`). They look synthetic — confirm that, and keep real onboarding data out of this path. | `seed_data/` |
| 28 | **Default-template residue in public**: identical `favicon.ico` (20 KB, unreferenced — but browsers still request `/favicon.ico`) and `placeholder.svg` in 3 portals; `pharmacy-portal/index.html:12` has a relative canonical URL; patient portal loads Google Fonts from a third party (privacy/CSP concern for a health app); admin declares fonts it never loads. | `*/public`, `*/index.html` |

## Correction to the first pass

- `AUDIT_DESIGN.md` §2.3 said "No `.dockerignore`". Precisely: a **root** `.dockerignore` exists and is tracked, but every Dockerfile builds from its own subfolder where no `.dockerignore` exists, so the root file never applies. The consequence (local `.env` baked into images by `COPY . .`) stands. Fix: one `.dockerignore` per app folder.

## Env hygiene summary (from the full code-vs-example diff)

- Read in code, in **no** example: `VITE_BASE` (patient portal, set only in the Pages workflow); migration script vars (`SOURCE_DATABASE_URL`, `TARGET_DATABASE_URL`, `RESET_TARGET`, `MIGRATE_FILES`, `LOCAL_UPLOAD_ROOT`, `NEW_BASE_URL`, `CHECK_PASSWORD`).
- Listed but redundant: `AI_SERVICE_URL` loses to `AI_SERVICE_BASE_URL` silently (`config.ts:114-115`) — keep one.
- Template leftovers to delete: `patient-portal-desktop/src/lib/config.server.ts` (reads `VITE_FOO`/`DATABASE_URL`).
