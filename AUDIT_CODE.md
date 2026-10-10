# MiqorAI — Bad Implementations (code-level defects)

> **Status 2026-10-10: all items below are implemented/fixed.** Verified by: backend `tsc` clean + 273/273 API tests passing; all five portals typecheck and build clean; mobile typechecks clean; workflows/compose YAML-validated. Where a listed "fake" control had no backend counterpart, it was removed rather than left misleading; everything else was wired to real endpoints.

Concrete defects with file references, grouped by component, worst first.
Line numbers refer to the **current working tree** (the uncommitted comment pass shifted lines vs HEAD).
Items marked **[verified]** were re-checked directly; the rest come from a full read of each file.

Companion docs: `AUDIT_DESIGN.md` (structural issues), `AUDIT_IMPROVEMENTS.md` (recommendations).

---

## 1. The uncommitted comment pass (fix before anything else)

5,160 inserted lines across 567 files; all but 8 are generated `// Handles… / Executes… / Transforms…` comments. ~260 landed between JSX elements, where JSX treats them as **text nodes**: **[verified]**

- Web portals: the comment renders on screen (e.g. `hospital-portal/src/pages/Login.tsx:67` prints "// Handles the associated user-interface event." inside the hospital-code field). Inside `<tr>` (e.g. `insurance-portal/src/pages/Fraud.tsx:209`) it is also invalid DOM nesting.
- **Mobile: runtime crash.** Bare text outside `<Text>` throws in React Native. Hits in live screens: `OnboardingScreen.tsx` ×8, `HomeScreen.tsx` ×4, `ProfileScreen` ×6, `FamilyScreen` ×3, `RecordsScreen` ×2, `ShareScreen` ×2.
- Approximate counts per app: hospital ~118, pharmacy ~43, insurance ~41, patient-web ~28, mobile ~27, admin 2.
- `npm run typecheck` will NOT catch any of this. HEAD (`549916a`) is clean — reverting the comment pass is the fix.

## 2. Backend security defects (`server/`)

| # | Defect | Where |
|---|--------|-------|
| 2.1 | **Public endpoint creates active hospital staff.** `POST /api/hospital/staff/signup` requires no auth; with just a hospital code it creates a User (active — `isActive` defaults true) + HospitalStaff with **any role you name** (`role: input.role as never` defeats typing), no password-strength check. Response claims "pending_verification". The parallel `/api/auth/hospital-signup` correctly creates inactive accounts. **[verified]** | `routes/hospital.routes.ts:86`, `services/staff.service.ts:113-145` |
| 2.2 | **Patient search matches everything.** `{ id: q.length === 36 ? q : undefined }` inside `OR` — Prisma treats `{id: undefined}` as `{}`, which matches all rows → any query returns the first 25 patients of the whole platform. **[verified code; not executed]** | `routes/hospital.routes.ts:397` |
| 2.3 | **Grant-check bypasses:** `GET /hospital/patient/:id/qr` discards its visit lookup and returns **any** patient's live QR (which then unlocks `/api/scan/qr`); `/patient/:id/summary`, `/patient/:id/labs/trends`, `/labs/trends`, `POST /prescription/check-allergies`, `POST /referral` have no grant check; pharmacy `GET /patient/:id` + `patients/search` expose any patient's contacts, allergies, diagnoses. | `services/portal-complete.service.ts:462-465`; hospital & pharmacy routes |
| 2.4 | **2FA bypass ×2:** `PUT /api/patient/settings` toggles `two_factor_enabled` with no TOTP; `/auth/2fa/setup` overwrites the secret and sets `twoFactorEnabled=false` without verifying the current code. | `routes/patient.routes.ts:663-668`, `services/twofa.service.ts` |
| 2.5 | **Phone OTP reactivates accounts:** `verify-otp` sets `isActive=true` on **every** user sharing that phone — including deactivated staff and soft-deleted patients. | `services/otp.service.ts:54-57` |
| 2.6 | **Path traversal on upload:** local storage writes `<rand>-<raw originalname>` without sanitizing the client-supplied filename. | `services/file.service.ts:125` |
| 2.7 | **Family linking without consent:** `POST /patient/family` links any existing patient by phone number; the linker then reads their profile/dashboard via `/family/:id/*`. | `routes/patient.routes.ts` family section |
| 2.8 | **Safety-gate bypass:** completing a doctor visit draft creates prescriptions and lab orders directly, skipping the clinical-safety gate entirely; also non-transactional. | `services/doctor-workspace.service.ts` |
| 2.9 | **Override race:** clinical-safety override executes the stored order **before** flipping status — double-submit → duplicate orders; the access grant is not re-checked at override time. | `services/clinical-safety.service.ts` |
| 2.10 | `dispensed_by` is a client-supplied UUID (trusted), not taken from the token. | `services/pharmacy.service.ts` dispense |
| 2.11 | **Stock check commented out** ("Temporary testing override") → inventory can go negative on dispense. | `services/pharmacy.service.ts:~452` |
| 2.12 | Admin hospital-approve takes `verified_by` from the **request body**, not the token. | `routes/admin.routes.ts` |
| 2.13 | Plaintext reset token stored in `AuthChallenge.payload`; forgot-password returns a cooldown 400 only for existing patients → account enumeration. | `services/patient-auth-challenge.service.ts:189` |
| 2.14 | `GET /api/files/:id` honors a signed `?token=` for **anyone**; `optionalAuth` skips the blacklist check. | `routes/files.routes.ts`, `middleware/auth.ts` |

## 3. Backend functional defects

| # | Defect | Where |
|---|--------|-------|
| 3.1 | `"postinstall"` sits **outside** the `"scripts"` block → never runs. | `server/package.json:22` |
| 3.2 | `POST /pharmacy/dispense` builds `String(undefined)` = `"undefined"`, so the "prescription_id required" check can never fire. | `routes/pharmacy.routes.ts` |
| 3.3 | `DrugInteraction` is **never seeded** → every interaction check returns empty; the portals' interaction UI can never trigger. `platform_settings.csv` exists but is never read. Only PAT001 gets its QR regenerated on seed. | `prisma/seed.ts` (`:571`) |
| 3.4 | Diagnosis record shape mismatch: hospital writes `{codes}`, AI/pharmacy read `data.name` → UI shows "Condition". | hospital routes vs AI/pharmacy services |
| 3.5 | Clinical-safety client ignores `AI_SERVICE_API_KEY` and `AI_SERVICE_TIMEOUT_SECONDS` (15 s hard-coded); sends an `ngrok-skip-browser-warning` header (leftover). The AI fields in `config.ts` are dead — `ai-service.config.ts` reads `process.env` directly. | `services/ai-clinical-safety.client.ts` |
| 3.6 | `touchPatientData` regenerates the patient QR after every clinical mutation → any QR currently on a patient's screen is invalidated mid-visit (60 s staleness on top). | `services/qr.service.ts` |
| 3.7 | QR access requests stored as JSON in `PlatformSetting` with manual 10-min TTL; listing loads **every** row. | `services/qr-access-request.service.ts` |
| 3.8 | `qr_scans_today` counts scans across **all** hospitals, not the caller's. | `services/portal-complete.service.ts` |
| 3.9 | Fake metrics served as real: `Math.random()` adherence and system latency. | `portal-complete.service.ts:770,1281` |
| 3.10 | No JSON `SyntaxError` / multer-limit handling in the error middleware → malformed body or oversized upload = 500. | `middleware/errorHandler.ts` |
| 3.11 | Logout blacklists the access token for a fixed 900 s regardless of actual remaining lifetime. | `services/auth.service.ts` |
| 3.12 | Dead code: `createSuperAdminIfMissing`, `markPendingActionCompleted`, `isPhoneVerified`, `assertSmsDeliveryReady`, `generateStaffSignupToken`, `hashApiKeyPreview`, duplicate `changePassword` in patient-ext, unused `bcryptjs` dependency. | various services |

## 4. AI service & fine-tune defects

| # | Defect | Where |
|---|--------|-------|
| 4.1 | `json_repair` runs `repaired.replace("},", "}")` — **deletes the comma after any nested object**, turning valid JSON invalid → fallback alert. Same bug duplicated in the test harness. | `app/json_repair.py:70`, `test_miqorai_qwen15.py:359` |
| 4.2 | Empty allergy string triggers CRITICAL on everything: `"" in name` is always true. | `app/ai_visit.py:164` |
| 4.3 | Relevant-history fallback reports "Matched 0.1 keyword(s)" (score 0.1 used as count). | `app/ai_visit.py:142,148` |
| 4.4 | Mock endpoint concatenates `action.item` into a JSON string without escaping → a `"` in the item yields broken `ai_search_result`. | `app/main.py:115-131` |
| 4.5 | Training/serving skew (`medication_prescription` vs `medication_order`; extra Patient-ID line) + synthetic examples asserting facts absent from the prompt → trained hallucination. See `AUDIT_DESIGN.md` §6. | schemas/prompt_builder vs train script |
| 4.6 | Test harness counts a **fallback** (i.e., model failure) as PASS; checks JSON shape only, never clinical correctness; truncates options to 2 while the service doesn't. | `test_miqorai_qwen15.py:407,499-506` |
| 4.7 | Training script calls `torch.cuda.is_bf16_supported()` unconditionally in the bnb config → crash on CPU. | `train_miqorai_qwen15.py:702` |
| 4.8 | Dockerfile never installs `requirements-gpu.txt` → the documented GPU path (`USE_4BIT=true` + CUDA) crashes at load. On CPU the model silently runs fp32 (~2 GB). | `Dockerfile`, `app/model_loader.py:59-66` |
| 4.9 | Severity vocabulary is inconsistent across the codebase: free-text "high"/"critical"/"Review" vs uppercase enums LOW/MEDIUM/HIGH/CRITICAL. | schemas vs ai_visit |
| 4.10 | `hf-space-publish/model/` lacks tokenizer files → the Space silently loads the **base** tokenizer, another train/serve divergence. | `hf-space-publish/model/` |

## 5. Hospital portal

| # | Defect | Where |
|---|--------|-------|
| 5.1 | SyncQueue reads `.conflicts` off an **un-awaited Promise** → always "Nothing to sync". | `pages/SyncQueue.tsx:26` |
| 5.2 | SyncQueue `typeIcon` has no entry for `check-in`/`registration` → undefined component → **page crashes** into the ErrorBoundary, and those are exactly the types Checkin/ManualRegister enqueue. | `SyncQueue.tsx:13` |
| 5.3 | Prescription validation disabled ("Temporary testing override") — missing fields default to "Medication to be confirmed". | `components/miqorai/PrescriptionBuilder.tsx:234-239` |
| 5.4 | `proceedAfterAlert` returns early if `!drug` → free-text medications can never proceed past an AI alert. | `PrescriptionBuilder.tsx:306` |
| 5.5 | Manual-entry fallback in the QR scanner navigates to a patient **without consent approval** — bypasses the whole request-access flow. Demo shortcut buttons ("simulate a QR scan") still shipped. | `components/miqorai/QRScanner.tsx:152,241-258` |
| 5.6 | Check-in `reason` is collected but never sent. Duplicate check-in blocked client-side only. | `store/waitlist.ts:44-48` |
| 5.7 | Autosave effect depends on the mutation object (new identity every render) → repeated rescheduling/saves. | `pages/PatientProfile.tsx:202,222` |
| 5.8 | `labs.sort()` mutates the react-query cache in place. | `pages/Labs.tsx:36` |
| 5.9 | Waitlist mutations swallow errors and update optimistically → failed status/assign/priority changes look successful. Assignment matches doctors **by name**. | `pages/Waitlist.tsx` |
| 5.10 | Patient check-out is local state only (`visitCheckout` API exists, never called). Billing payment methods hard-coded ("•••• 4242 (Stripe)"). Settings email fabricated as `${staffId}@hospital.med`. Referral `from_department` hard-coded "General". | `PatientHeader.tsx:73`, `pages/Billing.tsx`, `pages/Settings.tsx:23`, `pages/Referrals.tsx` |
| 5.11 | ~14 defined-but-never-called API functions (registerPatient, visitVitals, visitDiagnosis, visitCheckout, prescription, labOrder, deleteDepartment, updateSettings, syncApi.push, …) — the nurse/doctor visit endpoints the backend exposes are **not wired**. | `lib/api/hospital.ts` |
| 5.12 | Notifications `audience = ALL_ROLES` for every item → role filtering is a no-op. Duplicate query-key caches (`["departments"]` vs `["hospital","departments"]`, `["staff"]` …). | `store/notifications.ts`, various pages |

## 6. Admin portal

| # | Defect | Where |
|---|--------|-------|
| 6.1 | Settings form initializes with hard-coded defaults (90/0.01/20/7) — saving before load **overwrites real production settings**. | `routes/settings.tsx:29-34` |
| 6.2 | Query-key collisions: `auditLogs` cached once for limit 50 and limit 4; `hospitals("active")` for limit 10 and 50 — first response wins everywhere. | `lib/api/admin.ts:197-222` |
| 6.3 | Session (zustand) and tokens (localStorage) live under different keys and desync: tokens gone + session present → shell renders, every call 401s, no logout. Failed refresh never redirects. | `lib/auth.ts:55`, `lib/api/client.ts` |
| 6.4 | `toast.error(error)` passes an Error object into a string sanitizer → backend messages are **never** shown to the admin. | `lib/notify.ts`, `lib/user-messages.ts:19-28` |
| 6.5 | Pilot end date hard-coded to 90 days, ignoring the `default_pilot_duration_days` platform setting. Reject/resolve reasons collected via `window.prompt`. | `routes/hospitals.tsx:76`, `disputes.tsx` |
| 6.6 | `downloadFile` forwards the Bearer token to **any** absolute URL the backend returns. (Same pattern in hospital portal.) | `lib/api/client.ts:145-177` |
| 6.7 | `invite_url` silently copied to clipboard, never displayed. TopHospitals divides by max → NaN width when top savings is 0. Revenue chart labels only the last month. Same latency sparkline reused on all 6 system cards. | `routes/settings.tsx`, `index.tsx:287,302`, `system.tsx` |
| 6.8 | SSR/hydration bounce: hard reload on `/` redirects to `/login` then back; other routes SSR "Redirecting to sign in…". `wrangler.jsonc` is template residue (wrangler not even a dependency) while the Dockerfile actually serves via `vite preview` — not a production server. | `routes/__root.tsx`, `Dockerfile`, `wrangler.jsonc` |

## 7. Insurance portal

| # | Defect | Where |
|---|--------|-------|
| 7.1 | Mojibake comparison bug: Call button checks `p.phone === "â€”"` but the mapper emits `"—"` → never disabled for members without a phone. | `pages/Adherence.tsx:244` vs `lib/api/insurer.ts:320` |
| 7.2 | Synthesized display data: flagged-claim patients named `Patient ${idx+1}`; audit role always "analyst"; medication trend always 0; "days overdue" invented as `(75-rate)/3`; missing lastLogin → 1970-01-01. | `lib/api/insurer.ts:228,296,306,313,318,337` |
| 7.3 | `/members` route is ungated (every other data route has a permission). Member search fires a request per keystroke (no debounce). | `App.tsx`, `pages/Members.tsx:25-29` |
| 7.4 | Excel report downloads saved as `.excel` when no server filename. Month/YTD tabs and sort button do nothing; savings always fetched undated. | `pages/Reports.tsx:243`, `pages/Savings.tsx:98-103` |
| 7.5 | Login page promises "4-hour session timeout" and "MFA" — neither enforced. Headline says "Franc", amounts in KSh. | `pages/Login.tsx:93`, AuthShell |

## 8. Pharmacy portal

| # | Defect | Where |
|---|--------|-------|
| 8.1 | Mapper emits mojibake `"â€”"` as the placeholder in **14 places** → garbage characters all over the UI for missing values. `doctorName` always "Prescriber"; list patients always age 0. | `lib/api/mappers.ts:94-302,184,232` |
| 8.2 | Permission gaps: `/prescriptions/:id` unguarded → cashiers can open details and Hold; "Mark ready" allowed from `pending` → verification skippable; dispense not blocked on low stock ("still available for testing"). | `App.tsx`, `pages/PrescriptionDetail.tsx:232` |
| 8.3 | Offline banner promises queued dispenses; mutations go straight to network; `pushSyncItem`/`removeSyncItem` dead. `lib/api/queries.ts` entirely unused and duplicates `pharmacyKeys` with different shapes. | `store/sync.ts`, `lib/api/queries.ts` |
| 8.4 | Static "Twilio Connected" integrations card; Billing says "today" but never sends a date; "Open receipt" and staff row menu do nothing; `mapAuditLog` never yields the "success" level the page styles for. | `pages/Settings.tsx:94-98`, `pages/Billing.tsx` |

## 9. Patient web portal

| # | Defect | Where |
|---|--------|-------|
| 9.1 | Profile save **PUTs twice** (direct call with swallowed errors, then again via `updateUser`). | `routes/portal.tsx:576`, `lib/auth.tsx:221` |
| 9.2 | Refresh handling drops a rotated refresh token (only `access_token` read). | `lib/api/client.ts:52,90` |
| 9.3 | ErrorBoundary redirects to hard-coded `"/login"` — breaks under the `/MiqorAI/` GitHub Pages base. | `components/ErrorBoundary.tsx:33-35` |
| 9.4 | Access-requests polled every 5 s while Home is mounted (no backoff, no visibility pause). | `routes/portal.tsx:152-162` |
| 9.5 | React Query is mounted but **zero** `useQuery` calls exist — all fetching is `useEffect`+`useState` with swallowed errors; `patientKeys` dead. Cached user written to localStorage but never read. Delete-account / contact-delete / settings toggles have no error handling. | `App.tsx:2,10`, `lib/auth.tsx:60,82-102`, `portal.tsx:642-696` |
| 9.6 | All auth failures collapse to `false` → duplicate-email signup shows "invalid credentials"-style generic. Single-word name → last name duplicated from first. Template dead code shipped (`config.server.ts`, `example.functions.ts`, error-capture/page). | `lib/auth.tsx:105,214` |

## 10. Mobile app

| # | Defect | Where |
|---|--------|-------|
| 10.1 | Login runs 12 parallel GETs via `Promise.all` with only one `.catch` → **any single failing endpoint fails the whole login**. | `src/store.ts:704,839-857` |
| 10.2 | A refreshed access token updates only the module variable, never the persisted store → after restart the stale token is reused and re-refreshed forever. A 401 that survives refresh leaves `isAuthenticated=true` and masquerades as "offline". | `src/lib/api.ts:247`, `store.ts:1035-1042` |
| 10.3 | QR timer: expiry = `generated_at + 60s`, ticking every second and regenerating at 0 → if the server timestamp doesn't advance or the call fails, it **refetches every second**. Mobile also encodes its own QR payload, diverging from the server-rendered QR the web portal shows. | `components/ui/qr.tsx:30-34`, `store.ts:676` |
| 10.4 | Export opens `download_url` via `Linking.openURL` — no auth header, breaks on relative URLs. | `screens/ProfileScreen.tsx:239` |
| 10.5 | Edit-profile pre-fills from `activePatient` → with a family member active, **their values save onto the logged-in user's profile**. | ProfileScreen edit flow |
| 10.6 | "Add Emergency Contact" button has no `onPress`; same endpoint unreachable on web too (dead in both UIs). "Forgot Password?", Google/Apple buttons, Change PIN, Trusted Devices, Help, Privacy, Terms rows — no handlers. | `ProfileScreen.tsx:358`, `LoginScreen.tsx:129,173-178` |
| 10.7 | NativeWind half-wired: no babel preset/jsxImportSource, `global.css` never imported, `ThemeBridge` never mounted → `className` styling (LoginScreen) and `var(--color-…)` icons silently don't render. | `babel.config.js`, `metro.config.js`, `src/theme-bridge.tsx` |
| 10.8 | `app.json` `extra.apiUrl`/`apiPort` are literal `"${EXPO_PUBLIC_API_URL}"` strings (app.json doesn't interpolate) — dead config. `usesCleartextTraffic: true` shipped. Grant `expires_at` truncated to date → "24h" means midnight UTC. Provider search picks exact-name match else **first result**; no scope sent. | `app.json`, `store.ts:264,909`, `api.ts:371-374` |
| 10.9 | Dead shipped code: `screens/SettingsPages.tsx`, all `screens/settings/*`, `components/{family,onboarding,profile,records,sharing}/*` (untyped `any` duplicates), `i18n.ts` effectively unused. Dark-mode/notification toggles local-only; version string hard-coded "1.0.0 (Build 2026.01)". | `mobile_patient/src/` |

## 11. CI / deployment

| # | Defect | Where |
|---|--------|-------|
| 11.1 | APK workflow: debug build, debug keystore, `__DEV__=true` → targets `10.0.2.2:3000`, bundle likely not embedded (needs Metro), yet published as the repo's **Latest release**. | `.github/workflows/build-patient-mobile-apk.yml` |
| 11.2 | Pages deploy: no `VITE_API_URL` set (relies on the hard-coded onrender fallback), no typecheck/lint. | `.github/workflows/deploy-patient-portal.yml` |
| 11.3 | `render.yaml` boots with `prisma db push` (schema push on every deploy, no migrations). | `render.yaml`, `server/package.json` |
| 11.4 | `docker-compose.yml` runs the 5 SPAs only — no API, no Redis, no AI → the composed stack can't actually log in. | `docker-compose.yml` |
