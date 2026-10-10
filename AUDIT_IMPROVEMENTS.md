# MiqorAI — Improvement Plan

Changes that keep the product exactly as it is for users, but make it better engineered,
lighter on resources, and safer to operate. Ordered by priority within each section.

Companion docs: `AUDIT_DESIGN.md` (what is wrong structurally), `AUDIT_CODE.md` (specific defects).

---

## 0. Do first (blocking)

1. **Revert the uncommitted comment pass** (`git restore .` or `git stash`) — HEAD `549916a` is clean. ~260 of the generated comments render as page text on web and crash React Native. If you want the comments, re-apply them only in statement positions, never between JSX elements, and run every app once afterwards.
2. **Close the four worst backend holes** (small diffs, huge risk reduction):
   - Remove or gate `POST /api/hospital/staff/signup` (`routes/hospital.routes.ts:86`) — or create the user `isActive:false` like `/api/auth/hospital-signup` does.
   - Fix the match-all patient search: build the `OR` array conditionally instead of `{ id: cond ? q : undefined }` (`hospital.routes.ts:397`).
   - Require a valid TOTP code to disable 2FA (patient settings + `/2fa/setup`).
   - Scope `verify-otp` reactivation to the single intended user, never `updateMany` by phone.

## 1. Resource optimisation — backend

| # | Change | Payoff |
|---|--------|--------|
| 1.1 | Replace the patient portal's 5-second access-request polling and the pharmacy 30/60 s queue polling with Server-Sent Events (one `/api/events` stream) or at minimum long-poll + `visibilitychange` pause. | Biggest single cut in request volume and Render CPU; battery win on mobile. |
| 1.2 | Add pagination + `select` projections to the heavy list endpoints (census, prescriptions `limit=200`, inventory `limit=500`, audit logs, members/enriched). Return only the columns the UI maps. | Less DB I/O, smaller JSON, faster portals on slow connections. |
| 1.3 | Add DB indexes for the real query patterns: `Visit(hospitalId, checkInTime)`, `Prescription(pharmacyId, status)`, `AccessGrant(patientId, granteeType, granteeId, expiresAt)`, `AuditLog(createdAt)`, `MedicalRecord(patientId, recordType, isDeleted)`. | Query latency; the seed is tiny but production won't be. |
| 1.4 | Move visit drafts, QR access requests and org settings out of `PlatformSetting` prefix scans into real tables (or Redis with TTL for the QR requests — the 10-min TTL is already manual). | Removes full-table scans on every QR approval poll. |
| 1.5 | Use Redis for rate limiting (`rate-limit-redis`) and add strict per-route limits on `/auth/login`, `/auth/send-otp`, `/auth/forgot-password`. | Correct behaviour behind a scaler; stops SMS-pumping cost. |
| 1.6 | Cache hot reference data (ICD search, drug search, pharmacies list) in Redis with a short TTL — these are static per deploy. | Cuts repeated DB hits from every prescription builder keystroke. |
| 1.7 | Make audit writes batched (queue + flush) instead of one awaitless insert per request, and make "archive" actually archive (copy to cold storage / `AuditLogArchive`) instead of deleting. | Less write amplification; restores the audit guarantee. |
| 1.8 | Switch `start:render` from `prisma db push` to `prisma migrate deploy` with committed migrations. | Faster boots (no schema diff), rollback safety. |
| 1.9 | Honour `AI_SERVICE_TIMEOUT_SECONDS` in the clinical-safety client (15 s is hard-coded today) and send `AI_SERVICE_API_KEY`; add a small in-memory LRU for repeated identical check-action payloads within a visit. | Fewer spurious 409 blocks; fewer duplicate AI calls. |

## 2. Resource optimisation — frontends

| # | Change | Payoff |
|---|--------|--------|
| 2.1 | Convert the repo to **npm workspaces** with shared packages: `@miqorai/api-client` (client.ts, notify, user-messages), `@miqorai/ui` (one shadcn copy). Each portal keeps its own pages. | One lockfile, one install, ~5× less duplicated code, fixes apply once. Product unchanged. |
| 2.2 | Remove unused heavyweight deps per portal (recharts in hospital, react-hook-form/zod in insurer+pharmacy+hospital, most Radix primitives in patient-desktop where only `input-otp` is used). Add `rollup-plugin-visualizer` once to verify. | Smaller bundles → faster loads on low-bandwidth connections, less Vercel/Pages egress. |
| 2.3 | Route-level `React.lazy` code splitting in the three big portals (hospital, insurance, pharmacy) — login shouldn't pull in recharts and the full admin surface. | First-paint on login drops sharply. |
| 2.4 | Actually use React Query capabilities: set a default `staleTime` (e.g. 30 s) and `refetchOnWindowFocus:false` where appropriate; fix the colliding query keys (admin audit logs/hospitals, hospital `["departments"]` vs `["hospital","departments"]`); migrate the patient portal's `useEffect` fetching onto the already-mounted React Query. | Eliminates redundant refetches, fixes stale-data bugs for free. |
| 2.5 | Debounce the insurer member search (and the hospital global search uses 0-length `" "` queries — gate on ≥2 chars). | One request per pause instead of per keystroke. |
| 2.6 | Single-flight the token refresh (one shared promise) in the shared client; on refresh failure, clear tokens + redirect to login. | Removes parallel refresh storms and the "zombie session" states in every app. |
| 2.7 | Admin `PageShell` calls `GET /me` on every navigation — cache it in React Query with a 5-min staleTime. | One request per session instead of per page. |
| 2.8 | Mobile: replace the login-time `Promise.all` of 12 GETs with `Promise.allSettled` + lazy per-tab loading; persist refreshed tokens back to the store; stop the 1-second QR refetch loop (schedule exactly one timer to the expiry). | Faster, reliable login; large battery/data win. |

## 3. Resource optimisation — AI service

| # | Change | Payoff |
|---|--------|--------|
| 3.1 | Load the model in bf16/fp16 on CPU too (`torch_dtype=torch.bfloat16` when supported) or, better, **merge the LoRA and export to GGUF (Q4_K_M) served by llama.cpp / llama-cpp-python**. | RAM drops ~2 GB → ~400–700 MB; 2–4× faster CPU inference; fits the free HF Space tier comfortably. |
| 3.2 | Install `requirements-gpu.txt` conditionally in the Dockerfile (build arg) or drop the GPU claims from the README. | Removes the broken documented path. |
| 3.3 | Fix the serving prompt to match training (`medication_order`, no Patient-ID line) **or** regenerate training data to match serving — then retrain. Add completion-only loss masking. | The model answers in-distribution; accuracy up at zero runtime cost. |
| 3.4 | Replace the hand-rolled JSON repair with constrained decoding (e.g. `outlines`/`lm-format-enforcer` grammar) or at least fix the `"},"` bug and add `response_format` validation retries. | Fewer fallback alerts blocking doctors. |
| 3.5 | Add an eval set with clinically labelled expected decisions and score **decision accuracy** (block/allow, alert type), not JSON shape. Gate deploys on it. | You finally know if the model is right, not just well-formatted. |
| 3.6 | Add API-key auth + per-IP rate limit to the FastAPI service; set CORS to the backend origin only (browsers never call it directly anyway). | Closes the open public inference endpoint. |

## 4. Reliability & operations (keeps behaviour identical)

| # | Change |
|---|--------|
| 4.1 | Add `.dockerignore` (node_modules, .env, dist, .git) to every app; pass `VITE_API_URL` as a build ARG instead of baking `.env`. |
| 4.2 | CI: add `tsc --noEmit` + `eslint` + `vitest run` jobs for every portal on PR; the Pages workflow currently ships without any check. |
| 4.3 | Mobile release: switch the workflow to `eas build -p android --profile preview` (release-signed, bundle embedded, `EXPO_PUBLIC_API_URL` set) — the current debug APK cannot work for an end user. |
| 4.4 | Wire the existing-but-orphaned Supabase scripts into `package.json` and run them: `harden-supabase-rls.sql`, `check-supabase-rls.ts`. The API uses the service role, so RLS is your only defence if the DB URL ever leaks. |
| 4.5 | Make `hf-space-publish/` either a real submodule (add `.gitmodules`) or delete it and deploy `miqorai-ai-service/` directly; remove the nested `.git` in `miqorai-ai-service/`. |
| 4.6 | Fix the mojibake at the source: re-save the affected files as UTF-8, add `.gitattributes` (`* text=auto eol=lf`), and fix the `"â€”"` comparisons while doing it. |
| 4.7 | Structured error handling: map JSON SyntaxError and multer limits to 400/413; return 403 (not 401) from `requireRoles`; make the CORS rejection a 403 instead of a 500. |
| 4.8 | Add real transactions around visit-draft completion and clinical-safety override (status flip **before** executing the order, idempotency key on the pending action). |
| 4.9 | Uptime checks + error tracking (e.g. Sentry free tier covers the server and all portals) before any launch; `GET /health` should also report DB/Redis/AI reachability (an extended health endpoint already exists for admin — reuse it). |
| 4.10 | Rotate everything in `CREDENTIALS.md` before launch, delete the file, and move operator credentials to a password manager. Remove the shared password constants from `seed.ts`/tests into an env var. |

## 5. Nice-to-have (same product, better finish)

| # | Change |
|---|--------|
| 5.1 | Delete the dead code inventoried in `AUDIT_CODE.md` (unused API functions, template leftovers, mobile `components/{family,…}` duplicates, `queries.ts`, `Index.tsx`, `App.css` ×3). Roughly 60+ files disappear with zero user-visible change. |
| 5.2 | Either wire or remove every no-op control (admin topbar search/bell, "View all", insurer tabs/sort, pharmacy "Open receipt", mobile settings rows, hospital "SMS patient"/"Notify supervisor"). A button that does nothing erodes trust faster than a missing button. |
| 5.3 | Replace hard-coded marketing numbers with real queries where cheap (admin login stats, sidebar badges, StatCard deltas) or drop them. Remove `Math.random()` latency/adherence on the server. |
| 5.4 | Enforce sub-roles server-side using the matrices that already exist in the frontends (receptionist can't prescribe, cashier can't verify, analyst can't manage staff). The frontends already hide the buttons, so nothing visible changes — the API just stops trusting the client. |
| 5.5 | Enforce grant `scope` and the pharmacy/doctor grantee types in `assertAccessGrant`; write `lastAccessedAt`. The patient-facing promise ("share only medications") becomes true. |
| 5.6 | Implement the invitation-accept endpoint (token → set password → activate) — everything else for it already exists; this also lets you remove the public staff-signup hole for good. |
| 5.7 | Unify the QR payload: both apps should render the server's QR (`qr_code` data URL) so hospital scanners see one format; stop `touchPatientData` from rotating the QR mid-visit (rotate on a timer, not on every write). |
| 5.8 | One shared `formatKsh`/date util in the workspace package; fix `.excel` → `.xlsx` default filenames; real CSV quoting in `report.service.ts`. |
| 5.9 | Seed `DrugInteraction` (even 20 classic pairs) so the interaction UI that's already built actually fires; read `platform_settings.csv`; regenerate every patient's QR in seed, not just PAT001. |
| 5.10 | Mobile: finish or remove NativeWind (currently half-wired); if kept, mount `ThemeBridge` and add the babel preset. Point Terms/Privacy at text that matches the real architecture. |
| 5.11 | Pin the portals' shared deps to identical versions (pharmacy's recharts `2.12.7` vs insurer's `^2.15.4`) — trivially solved by the workspace move (2.1). |
| 5.12 | Docs: fold `Running.md`/`README.md`/`DEPLOYMENT_MAP.md` overlaps into one source of truth; refresh `MiqorAI_finetune/README.md` and `CLINICAL_SAFETY.md` to match the code; delete `patient-portal-desktop/src/routes/README.md`. |

## Suggested order of attack

1. §0 (revert comment pass, four security fixes) — hours.
2. §4.1–4.3 + §4.10 (CI, dockerignore, credential rotation) — a day.
3. §2.6 + §2.4 (shared refresh fix, query hygiene) and §1.1 (kill polling) — the biggest stability/perf wins per line changed.
4. §2.1 workspace consolidation — do it before touching the duplicated clients again, it makes every later fix 6× cheaper.
5. §3 (AI retrain + GGUF) whenever the model next matters; §5 continuously.
