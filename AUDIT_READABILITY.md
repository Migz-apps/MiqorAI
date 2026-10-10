# MiqorAI — Readability & Maintainability Audit

What makes this codebase hard to read, navigate and change safely.
Line counts exclude the uncommitted comment-pass noise where noted.

Companions: `AUDIT_PERFORMANCE.md`, `AUDIT_GOLIVE.md`, `AUDIT_DESIGN.md`, `AUDIT_CODE.md`, `AUDIT_IMPROVEMENTS.md`.

---

## 1. The comment pass hurts readability (besides breaking JSX)

The uncommitted change adds ~5,100 generated one-liners (`// Handles the associated user-interface event.`, `// Executes the callback…`). They restate what the next line already says, add zero information, and bury the few real comments. Good comments explain *why*, not *what*. Revert it; if documentation is the goal, document the modules (one header per service/page explaining its role) rather than every callback.

## 2. Giant files and functions

### Backend (code-only lines, comment pass excluded)

| File | Lines | Problem |
|---|---|---|
| `server/src/routes/hospital.routes.ts` | 1,386 | 59 handlers, **38 inline Prisma calls** — half route table, half service layer |
| `server/src/services/portal-complete.service.ts` | 1,300 | 75 exports spanning **6 unrelated domains** (admin, insurer, hospital, patient, auth lockout, metrics) |
| `server/src/services/pharmacy.service.ts` | 976 | |
| `server/src/routes/patient.routes.ts` | 840 | 46 inline Prisma calls |
| `server/src/services/doctor-workspace.service.ts` | 678 | |
| `server/src/services/admin.service.ts` | 666 | |
| routes: admin 651 / insurer 596 / pharmacy 577; services: insurer 568 / clinical-safety 551 / hospital-ext 450 | | |

Functions >80 lines doing several jobs: `applySyncOperation` (~116, type-switch over 4 resource kinds — `sync.service.ts:70`); `completeDoctorVisitDraft` (~114: visit upsert + diagnosis + N prescriptions + N labs + draft delete + QR touch, **no transaction** — `doctor-workspace.service.ts:586`); `getDoctorPatientCensusMeta` (~80); `buildPatientRecord` (~79). Route handlers that are really services: hospital register (`hospital.routes.ts:462-535`), analytics (`:934-988`), savings (`:896-931`); patient settings (re-reads what it just wrote, `patient.routes.ts:646-702`), export (`:705-750`), dashboard (`:567-633`).

### Frontends (HEAD counts)

| File | Lines | Problem |
|---|---|---|
| `patient-portal-desktop/src/routes/login.tsx` | 919 | one ~710-line component, ~20 `useState`s, hand-rolled login/signup/OTP/reset state machines while react-hook-form+zod sit installed and unused |
| `mobile_patient/src/store.ts` | 946 | types + 10 normalizers + 10 mappers + sync orchestrator + all actions in one file |
| `mobile_patient/src/screens/OnboardingScreen.tsx` | 803 | component spans ~380 lines, 17 `useState` |
| `mobile_patient` ProfileScreen 724 / RecordsScreen 658 (six near-identical tab branches) / FamilyScreen 658 / ShareScreen 641 | | |
| `hospital-portal/src/lib/mappers.ts` | 698 | see §4 |
| `patient-portal-desktop/src/routes/portal.tsx` | 654 | 5 tabs + local UI primitives in one file, each tab doing fetch+state+render |
| hospital `AddVisitForm.tsx` 459 (8 useState) / `PrescriptionBuilder.tsx` 454 (10 useState, 3 queries) / `PatientProfile.tsx` 402 (7 useState, 2 queries, 3 mutations, 5 effects) | | |
| `insurance-portal/src/lib/api/insurer.ts` 426; admin `lib/api/admin.ts` 358, `routes/hospitals.tsx` 334 (5 queries in one component) | | |

## 3. Arbitrary module boundaries (backend)

- The "-ext" split is meaningless: `hospital-ext` owns the **generic** org-settings helpers used by everyone; `insurer-ext` owns hospital **and** pharmacy settings (hospital routes import hospital settings *from insurer-ext*, `hospital.routes.ts:44`); `patient-ext` holds `generateStaffSignupToken`; login lockout lives in `portal-complete.service.ts:27-61`.
- Duplicated logic: `requireHospitalContext` (hospital routes + ai routes), `checkDrugInteractions` (pharmacy + reference services), `deleteSyncQueueItem` (admin + portal-complete, **different semantics**), `changePassword` (auth + patient-ext), two AI patient-context builders, two AI config sources (one unused).
- Parallel "enriched/extended" endpoints duplicate base ones (staff, analytics, utilization, members, transactions, health, patients) — callers must guess which is canonical.
- **276 identical try/catch blocks** across routers; no `asyncHandler` wrapper.

## 4. API shape inconsistency (the single biggest reader tax)

- **Response casing is mixed**: ~30 endpoints return raw camelCase Prisma objects (`hospital.routes.ts:558,592,637,745,766,793,889`; `patient.routes.ts` ×11; admin/insurer lists) while the rest hand-map to snake_case; some objects mix both (`portal-complete.service.ts:1177,1221-1226`). `/api/ai/*` takes camelCase bodies while every other route takes snake_case.
- **Envelope roulette**: bare array vs `{items,total}` vs `{patients:[…]}` vs `{results}` vs `{download_url}` vs `{report_url}`.
- The frontends absorb this chaos with dual-casing fallbacks: hospital `mappers.ts` has **102 `??`** and checks `drugName ?? drug_name`, `bloodType ?? bloodGroup` (`:203-217,242`); it also writes display placeholders ("—") into data fields, and fabricates `gender:"Other"`, `dob:""` to pass partial rows off as full `Patient`s (`:259-306`); 33 `as Record<string, unknown>` casts because `hospitalApi` is untyped. Mobile mixes `first_name` with `recordType` in one client.
- Fix at the source: one response convention (snake_case + `{data, total}`), serializers on the server, then delete the fallback forest.

## 5. Copy-paste divergence (the six clients)

- The 5 web `client.ts` files are diff-identical **except**: hospital uses a `-v2` token key + legacy cleanup; insurance exports `TOKEN_KEY`; only hospital+patient clear tokens before login; `MeResponse` lives in different places; patient has no `getMe`. Mobile `api.ts` (395 lines) is a different design entirely. Any auth fix = 6 edits.
- `user-messages.ts` key sets differ per app (`generic.notFound` only in pharmacy, `offline` only in hospital, ~12 patient-only keys) → copying a call site between apps breaks non-obviously.
- Pharmacy has **two `pharmacyKeys` exports with different shapes** (`store/rx.ts:5` factories vs unused `lib/api/queries.ts:6` arrays); `store/rx.ts` is API loaders, not a store, despite the path.
- Three `ProtectedRoute` semantics (hospital: loader; pharmacy: renders `null`; insurance: no restore gate). Duplicate helpers: patient `formatRelative` + `timeAgo`; admin `timeAgo` + `formatRelativeTime` + duplicated `fmtKsh`; mobile redefines `cn()` in 8 dead files; `DetailRow` duplicated in two screens.

## 6. Convention inconsistencies

- **Two stack generations side by side**: React 19 + Vite 7 + Tailwind 4 (patient, admin) vs React 18 + Vite 5 + Tailwind 3 (hospital, insurance, pharmacy); lucide 0.462 vs 0.575; recharts 2.12.7 vs ^2.15.4; TS 6.0.3 (mobile) vs 5.8.
- Folder naming: `routes/` in patient-portal **but it uses react-router** (template leftover); `routes/` (real file-routing) in admin; `pages/` in the other three.
- Exports: pages default-exported in 3 apps, admin has none, patient mixes.
- Server-state: React Query (3 apps) vs zustand waitlist (hospital) vs `useEffect`+`useState` (patient) vs one global store (mobile). Query keys: central factories (admin/pharmacy/insurer) vs 33 ad-hoc inline shapes (hospital).
- Toast systems: custom (patient) vs sonner (web) with Radix toast also still wired in 3 apps.
- Styling: Tailwind on web; mobile live screens use `StyleSheet` with ~60 hard-coded hex colors bypassing `theme.ts`, while the NativeWind `className` system exists only in dead files.
- `any`-typed props: hospital `SyncQueue.tsx:149`, `ManualRegister.tsx:25,75`, `AppSidebar.tsx:24`, `FormAlert.tsx:6`, `Signup.tsx:16`; insurance `StatusPill.tsx:21`; `useState(user!)` in patient portal.
- i18n: mobile has en/rw/fr and a language picker, but live screens make ~8 `t()` calls — Home, Records, Onboarding, Login and toasts are hard-coded English; all web apps hard-coded English. Choosing Kinyarwanda/French barely changes the UI.

## 7. Magic numbers (backend)

`86400000`-style day math ×26 (incl. `365*24*60*60*1000`, `hospital.routes.ts:521`); adherence threshold **75** repeated in 4 files; fraud thresholds 90/70 (`insurer.service.ts:243-245`); invented economics: savings ×1200 (`insurer.service.ts:203`), plan 499/5000 (`hospital-ext.service.ts:94-96`), allowances 100000/1000000/12.4 MB (`insurer-ext.service.ts:56-59`); blacklist TTL 900 (`auth.service.ts:143`); lockout 5/15 min; QR TTLs; assorted `take` constants 100–5000. Pull these into named constants / config.

## 8. Error-handling inconsistency (backend)

Two error shapes: most throw `AppError` → `{error:{code,message}}`, but some write inline (`auth.routes.ts:287`, `files.routes.ts:15`, `pharmacy.routes.ts:166`) and the clinical-safety 409 returns `{success:false, blocked:true}` (`hospital.routes.ts:658,681`). Plain `throw new Error` and all Prisma known errors (P2002 unique, P2025 missing row, P2023 bad UUID) surface as generic 500s (`admin.service.ts:143,234,316,445,604`). `errorHandler.ts:27` logs with `console.error`, bypassing winston. Swallowed failures: audit writes (`middleware/audit.ts:32` — a compliance gap), `twofa.service.ts:61` `catch {}`. Sync conflicts are unreachable: the detector checks `.includes("CONFLICT")` but the thrown message is lowercase `"Sync conflict: …"` (code sits in `details`) — `sync.service.ts:52` vs `:117` **[verified]**.

## 9. Docs that contradict each other (current state)

- `DEPLOYMENT_MAP.md` calls `render.yaml` the "runtime source of truth" — it declares zero env vars; says patient web → Vercel while CI deploys to GitHub Pages under `/MiqorAI/`; says admin → Cloudflare Workers while its Dockerfile runs `vite preview`; cites env example files that are **gitignored** and absent from a fresh clone.
- `todo_list.md` is ~5 items stale (claims `MiqorAI: "file:.."` deps, ngrok in env examples, pre-filled demo credentials, `Running.md` pointing to `backend/` — all already fixed in code).
- `Running.md` calls Docker non-authoritative while `README.md` presents compose as the Redis path; `dev:full` actually uses redis-memory-server via `scripts/ensure-redis.mjs`.
- `README`/`Running` advertise `test:api:all` / `test:integration:portals`, which **re-seed (wipe) whatever `DATABASE_URL` points at** with no warning.
- Stale in-tree docs: `patient-portal-desktop/src/routes/README.md` (TanStack routing it doesn't use), `MiqorAI_finetune/README.md`, `server/CLINICAL_SAFETY.md` vs the actual client code.

**Fix:** collapse to one `docs/` source of truth (setup, run, deploy, test), delete the rest or reduce them to pointers; regenerate `todo_list.md` from the audit files.
