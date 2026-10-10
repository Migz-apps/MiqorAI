# MiqorAI — Design & Architecture Audit

Scope: repository layout, architecture, security design, and professionalism issues.
These are *structural* problems — things that are wrong by design, not single bugs.
For line-by-line code defects see `AUDIT_CODE.md`. For improvements see `AUDIT_IMPROVEMENTS.md`.

Line numbers refer to the current working tree (which includes the uncommitted comment pass).

---

## 1. Repository & folder design

| # | Problem | Where |
|---|---------|-------|
| 1.1 | Six near-identical copies of the full shadcn/ui component set (~48 files each) are duplicated into every portal instead of living in one shared package. Any fix must be applied 5–6 times and the copies have already drifted. | `*/src/components/ui/` in all five web portals |
| 1.2 | The API client (`client.ts`: token storage, refresh-on-401, `resolveApiUrl`, `downloadFile`) is copy-pasted into all 5 portals + mobile with small divergences. Same for `notify.ts` / `user-messages.ts`. | `*/src/lib/api/client.ts` |
| 1.3 | No npm workspace. The root `package.json` orchestrates with `--prefix` and each app has its own lockfile; `install:all` runs 6 separate installs. | `package.json` |
| 1.4 | ~~Package manifests carried starter-template identities~~ **FIXED**: all five portals renamed to `miqorai-*-portal` (package.json + lockfiles synced); versions remain `0.0.0`. | each `package.json` |
| 1.5 | `hf-space-publish/` is committed as a **gitlink (mode 160000) with no `.gitmodules`** — an orphan submodule that clones as an empty directory for anyone else. `miqorai-ai-service/.git` is a second nested repo pointing at the same HF remote with diverged history. | repo root |
| 1.6 | `hf-space-publish/` duplicates `miqorai-ai-service/` almost byte-for-byte (code identical, comments differ) — two sources of truth for the deployed AI service. | both folders |
| 1.7 | Build artifacts and caches are committed or left in-tree: `__pycache__/*.pyc` (`MiqorAI_finetune/`, `hf-space-publish/`), a stale `dist/` in `pharmacy-portal/` and `hospital-portal/` (Aug 14, predates current source). | |
| 1.8 | `adapter_model.safetensors` is force-tracked despite the `*.safetensors` ignore rule — the ignore file and the tree contradict each other. | `.gitignore:120-122` |
| 1.9 | Training checkpoints with optimizer state (~47 MB × 3) are committed inside the service folder; they are training residue, not serving artifacts. | `miqorai-ai-service/model/.../checkpoint-25/50/75` |
| 1.10 | Seed CSV naming is inconsistent: `lab-orders.csv`, `medical-records.csv` (hyphens) vs `insurer_members.csv`, `savings_record.csv` (underscores). | `seed_data/` |
| 1.11 | Stale docs ship with the code: `patient-portal-desktop/src/routes/README.md` describes TanStack file routing the app no longer uses; `MiqorAI_finetune/README.md` contradicts the actual training run (split, epochs, seq length, output format, CLI flags); `CLINICAL_SAFETY.md` disagrees with the client code (mock routing, API key, timeout). | |
| 1.12 | The Java example client still uses the old product package name `medipass.app.integration`. | `miqorai-ai-service/examples/spring-boot/` |

## 2. Secrets & credentials handling

| # | Problem | Where |
|---|---------|-------|
| 2.1 | `CREDENTIALS.md` sits in the working tree with **one shared plaintext password for every account**, repeated again inside an example login JSON. It is gitignored, but it is one `git add -f` or one screen-share away from leaking. | `CREDENTIALS.md` |
| 2.2 | The same seed password is hard-coded in three places in source that **is** tracked. | `server/prisma/seed.ts:31`, `server/tests/helpers/context.ts:6`, `server/scripts/check-supabase-logins.ts:5` |
| 2.3 | No `.dockerignore` in any portal. `COPY . .` bakes the local `.env` (with its `VITE_API_URL`, and anything else ever put there) into every Docker image. | all portal Dockerfiles |
| 2.4 | JWT access + refresh tokens are stored in **localStorage** in all five web portals — readable by any XSS. No httpOnly-cookie option exists. | `*/src/lib/api/client.ts:12` |
| 2.5 | The mobile app persists tokens, **all PHI arrays, and the recovery phrase** in plain unencrypted AsyncStorage (`expo-secure-store` is not even installed). | `mobile_patient/src/store.ts:1003-1033` |
| 2.6 | The patient password-reset email contains both the OTP **and** a direct `?reset_token` deep link, and the reset token is stored **in plaintext** in the DB challenge payload. | `server/src/services/patient-auth-challenge.service.ts:189` |

## 3. Authentication & authorization design

| # | Problem | Where |
|---|---------|-------|
| 3.1 | **Sub-roles are never enforced server-side.** The DB defines receptionist/nurse/doctor/dept_head, cashier/technician/pharmacist/manager, analyst/fraud_investigator/… — but every backend check stops at `hospital_staff` / `pharmacy_staff` / insurer roles. A receptionist can prescribe via the API; an insurer analyst can rotate API keys and remove staff. The role matrices exist **only in frontend code**. | `server/src/routes/*.routes.ts` vs `*/src/store/auth.ts` |
| 3.2 | Frontend role mapping silently defaults unknown roles to the **most privileged clinical role**: hospital → "doctor", pharmacy → "pharmacist", insurer → "analyst". | `hospital-portal/src/store/auth.ts:34`, `.../lib/api/mappers.ts:79`; pharmacy `store/auth.ts:31-35` |
| 3.3 | Refresh tokens are never rotated; stored server-side with a hard-coded 7-day expiry that ignores `JWT_REFRESH_EXPIRES`; `changePassword` does not revoke sessions; deactivating a user does not invalidate live access tokens; `authenticate` never re-checks `isActive`. | `server/src/services/auth.service.ts:61`, `middleware/auth.ts` |
| 3.4 | No single-flight refresh lock in any client — N concurrent 401s fire N parallel refresh calls. A failed refresh never logs the user out (all portals + mobile). | every `client.ts` |
| 3.5 | `requireRoles` returns **401** instead of 403 for insufficient role, conflating authn and authz. | `server/src/middleware/auth.ts` |
| 3.6 | Credentialed CORS allows **any** `https://*.vercel.app`, `*.onrender.com`, `*.hf.space` origin — anyone can host a site on those platforms and make credentialed calls. A blocked origin throws a plain Error → 500 instead of a clean rejection. | `server/src/app.ts:28-67` |
| 3.7 | The AI service has **no authentication at all** (no API key check, no rate limit) and `allow_origins=["*"]` with `allow_credentials=True`. Anyone who finds the HF Space URL can query it. Meanwhile the backend's clinical-safety client never sends `AI_SERVICE_API_KEY` anyway. | `miqorai-ai-service/app/main.py:51-57`; `server/src/services/ai-clinical-safety.client.ts` |
| 3.8 | Rate limiting is a single in-memory global limiter (resets on restart, per-instance, useless behind a scaler) with **no per-route limits on login / OTP / forgot-password** — brute-force and SMS-pumping are only slowed by the account lockout. | `server/src/middleware/rateLimit.ts` |
| 3.9 | Patient consent model is half-enforced: `assertAccessGrant` is only ever called with grantee type `"hospital"`. Doctor and pharmacy grants are never checked, grant `scope` (full / medications / lab_results / emergency_only) is **never enforced anywhere**, and `lastAccessedAt` is never written. | `server/src/services/access.service.ts` |

## 4. Data & persistence design

| # | Problem | Where |
|---|---------|-------|
| 4.1 | **No migrations.** `start:render` runs `prisma db push` against the production DB on every deploy — no history, no rollback, silent destructive changes possible. | `server/package.json` |
| 4.2 | `PlatformSetting` is abused as a general key-value store: doctor visit drafts, QR access requests (with manual TTL), org settings, patient prefs — all prefix-scanned JSON blobs in one table. | `server/src/services/doctor-workspace.service.ts`, `qr-access-request.service.ts` |
| 4.3 | Referential integrity is optional: `User.organizationId`/`organizationType` are plain strings with no FK; `AccessGrant.granteeId` is polymorphic with no FK; `MedicalRecord.recordedBy`, `Invitation.organizationId`, adherence snapshots — no FKs. Orphans are possible everywhere. | `server/prisma/schema.prisma` |
| 4.4 | Audit-log "archiving" **permanently deletes** rows older than the cutoff, at every boot. For a medical platform this is the opposite of an audit trail. | `server/src/services/sync.service.ts:217-223` |
| 4.5 | Audit writes are fire-and-forget (failures lost silently), and the seed's `clearDatabase()` skips the two clinical-safety tables, so safety audit rows from old runs survive re-seeds. | `server/src/middleware/audit.ts`; `prisma/seed.ts` |
| 4.6 | Medical record payloads are a free-form JSON `data` column with at least two incompatible shapes in live code (diagnosis written as `{codes}` by hospital routes, read as `data.name` by AI/pharmacy views → shows "Condition"). | `server/src/routes/hospital.routes.ts` vs AI/pharmacy services |
| 4.7 | `visits.vitals` seed data is single-quoted Python-dict text, not JSON — only parseable because the seeder has a custom "loose JSON" parser. | `seed_data/visits.csv`, `server/prisma/csv-utils.ts` |
| 4.8 | Reports are pdfkit dumps of `JSON.stringify` and a CSV writer that "escapes" by replacing commas with semicolons (no quoting). Not professional output for insurers/regulators. | `server/src/services/report.service.ts` |

## 5. Shipped features that don't actually exist

The UI presents these as working; none of them are. This is the "demo-ware" pattern — dangerous because operators will rely on them.

| # | Fake feature | Where |
|---|--------------|-------|
| 5.1 | Staff invitations can be created and emailed by all four org portals — **there is no accept endpoint anywhere**; the invite link dead-ends. Admin `POST /invite` always links to the admin portal regardless of target role. | `server/` (grep `invite_token` — no consumer) |
| 5.2 | Approving an onboarding request never creates the hospital/pharmacy (only insurers), and the submitted password is discarded. | `server/src/routes/admin.routes.ts` onboarding |
| 5.3 | Insurer API keys: created, rotated, hashed, stored — **nothing ever authenticates with them**. | `server/src/services/insurer*.ts` |
| 5.4 | Report schedules are stored (`ReportSchedule`) and never executed by anything. | schema + no job runner |
| 5.5 | Offline sync is cosmetic in hospital, pharmacy and mobile apps: banners and queues exist, but mutations go straight to the network and nothing ever queues or replays. | `*/store/sync.ts` |
| 5.6 | Hospital portal: Signup page is fake (no API call), ManualRegister is fully mocked, patient check-out is local state only, Settings/2FA/notification toggles are mocks, staff resend/reset are toast-only. Pharmacy Signup: `onSubmit={e => e.preventDefault()}`. | `hospital-portal/src/pages/Signup.tsx:44-56`, `ManualRegister.tsx:30-46`, `pharmacy-portal/src/pages/Signup.tsx:27` |
| 5.7 | Mobile onboarding is theatre: hard-coded 12-word recovery phrase, "Generating keys" is a 1.8 s `setTimeout`, the PIN is validated then thrown away, "Restore from Backup" just marks onboarding complete, biometric login shows an error. | `mobile_patient/src/screens/OnboardingScreen.tsx:58,110,165` |
| 5.8 | Mobile Terms/Privacy screens claim local-first storage, AES-256 and "no central servers" — the opposite of the actual architecture. Legal exposure, not just polish. | `mobile_patient/src/screens/settings/` (dead but shipped) |
| 5.9 | Hard-coded marketing stats presented as live: admin login "47 hospitals / 99.97% / 127k+", sidebar badges 3 & 2, StatCard deltas, "ALL SYSTEMS NOMINAL", insurer "Trusted by 14 insurers / KSh 1.2M", hospital "HIPAA-grade / Works offline", patient landing "50K+ patients", `Math.random()` latency & adherence on the server. | `admin-portal/src/routes/login.tsx:89-107`, `index.tsx:96-165`; `server/src/services/portal-complete.service.ts:770,1281` |

## 6. AI / ML design

| # | Problem | Where |
|---|---------|-------|
| 6.1 | **Training/serving skew:** the service sends action type `medication_prescription` and a `- Patient ID:` line; training data used `medication_order` and no patient-ID line. The model is queried out-of-distribution on every prescription check. | `app/schemas.py:55`, `app/prompt_builder.py:168` vs `MiqorAI_finetune/train_miqorai_qwen15.py:426-462` |
| 6.2 | 40 of the 50 synthetic training examples assert patient facts ("documented allergy") that are **absent from their prompts** — the model is explicitly taught to hallucinate clinical facts. | `train_miqorai_qwen15.py:324-475` |
| 6.3 | Evaluation is JSON-shape-only: token accuracy in training, and a test harness that counts a *fallback* response as PASS. **No clinical-correctness metric exists anywhere.** 223 total examples, eval on 23. | `test_miqorai_qwen15.py:499-506`, `training_meta.json` |
| 6.4 | Loss is computed over the full sequence including the prompt (no completion masking) — standard practice violated, wastes capacity on memorizing prompts. | `train_miqorai_qwen15.py:559-570` |
| 6.5 | `/ai/relevant-history` and `/ai/check-action` are presented as "AI" but are keyword/substring rules with a fabricated `confidence = 0.35 + 0.12·n`; medication risk is literally two hard-coded drug names (warfarin, penicillin); IMAGING/REFERRAL/INTERACTION enum values can never be produced. | `app/ai_visit.py:109-219` |
| 6.6 | The fail-open/fail-closed story is inconsistent: AI unreachable → clinical-safety **blocks** the order (fallback `intervention_required: true`), but AI disabled → everything is allowed; meanwhile completing a visit draft bypasses the gate entirely. One doctor pathway is gated, the other is not. | `server/src/services/clinical-safety.service.ts:330-386`, `doctor-workspace.service.ts` |
| 6.7 | GPU deployment path is broken by design: README instructs `--gpus all -e USE_4BIT=true`, but the Dockerfile never installs `bitsandbytes` → crash on any CUDA host with the default config. | `miqorai-ai-service/README.md:214-219`, `Dockerfile` |

## 7. Testing & release design

| # | Problem | Where |
|---|---------|-------|
| 7.1 | Backend tests require a real, freshly-seeded Postgres and mutate it; no isolation. Test-env OTP is fixed at `654321`, a value compiled into the production codepath behind a `NODE_ENV` check. | `server/vitest.config.ts`, `utils/one-time-code.ts` |
| 7.2 | ESM import hoisting silently defeats parts of the test setup (`SMTP_HOST`, cooldown overrides are read before they're set). Tests pass for the wrong reason. | `server/tests/helpers/vitest.setup.ts` |
| 7.3 | All five portals' "test suites" are one placeholder `expect(true).toBe(true)`. The admin and patient portals have no test script at all. Zero coverage on mappers, auth stores, role logic. | `*/src/test/example.test.ts` |
| 7.4 | CI deploys the patient portal to GitHub Pages with **no typecheck or lint step** (`vite build` does not typecheck). | `.github/workflows/deploy-patient-portal.yml` |
| 7.5 | CI builds and publishes a **debug** APK signed with the debug keystore to the repo's "Latest release" slot; `__DEV__` is true so it targets `10.0.2.2:3000`, and the JS bundle is likely not embedded (needs Metro). The published artifact cannot work for a real user. | `.github/workflows/build-patient-mobile-apk.yml` |
| 7.6 | Mojibake throughout: UTF-8 double-encoding left `â€”` and `Â·` literals **in source**, including in logic comparisons. The same corruption exists at HEAD, so the team's editor/pipeline is mangling encodings. | `pharmacy-portal/src/lib/api/mappers.ts` (14×), `insurance-portal/src/pages/Adherence.tsx:244`, `hospital-portal/.../PrescriptionBuilder.tsx:110,356` |
| 7.7 | The uncommitted "comment pass" (5,160 inserted lines, 567 files) placed `// …` lines in JSX children positions ≈260 times: rendered as visible page text on web, and a **guaranteed runtime crash** in React Native ("Text strings must be rendered within a <Text>"). Automated edits were applied with no build/run verification. | working tree (see `AUDIT_CODE.md` §1) |
