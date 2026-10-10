# MiqorAI — Performance Audit (second pass)

Everything that costs CPU, memory, bandwidth, battery or latency, with the fix for each.
Line numbers refer to the current working tree. Items marked **[verified]** were re-checked directly.

Companions: `AUDIT_GOLIVE.md` (launch blockers found in this pass), `AUDIT_READABILITY.md`,
and the first-pass set (`AUDIT_DESIGN.md`, `AUDIT_CODE.md`, `AUDIT_IMPROVEMENTS.md`).

---

## A. Backend (`server/`)

### A1. The ten most expensive problems

| # | Problem | Where | Fix |
|---|---------|-------|-----|
| 1 | **The most-polled endpoint is the most expensive.** Patient access-requests (polled every 5 s per open patient tab) run `platformSetting.findMany({key startsWith "qr_access_request:"})` — no patient filter, no `take`, JSON-parse of every row, and expired rows are **never deleted**. Prefix-LIKE can't use the btree under default collation → sequential scan of the table that also holds all drafts/prefs/settings. | `qr-access-request.service.ts:110-125`, `patient.routes.ts:397` | Move to Redis with TTL, or a dedicated table indexed on `(patientId, status, expiresAt)`. |
| 2 | `insurer /patients/list` loads **every adherence snapshot on the platform** (`findMany()` with no `where`). | `insurer.service.ts:489` | Filter by the insurer's member patients; paginate. |
| 3 | Admin hospital stats fan out ~2 queries **per hospital** (`groupBy` of all patient ids + aggregate) in `Promise.all`; `limit` uncapped → `limit=50` ≈ 100 concurrent queries vs a Prisma pool of ~3–5 connections. Same pattern for pharmacies. | `admin.service.ts:669-692,703-710` | One grouped query (`groupBy hospitalId`) + cap limit. |
| 4 | `getEnrichedAdminPatients` runs 2 queries per patient, sequentially, with an uncapped limit. | `portal-complete.service.ts:1314-1316`, `admin.routes.ts:483` | Batch with `in` queries. |
| 5 | Drug-interaction check is O(n²) sequential `findFirst`s per drug pair, run on **every prescription detail view**, which also re-fetches the prescription 3 times. | `pharmacy.service.ts:380-401,251-350` | One `findMany({OR: pairs})`; reuse the loaded prescription. |
| 6 | **`scryptSync` re-derives the AES key on every `encryptText`/`decryptText` call** — scrypt is deliberately slow and blocks the event loop; this hits every 2FA verify and recovery-phrase read. Login/register also hash synchronously; two spots hash **random throwaway passwords**. | `utils/crypto.ts:46-72`; `hospital.routes.ts:481`, `portal-complete.service.ts:296` | Derive the AES key once at module load; switch to async `crypto.scrypt`. |
| 7 | **No compression middleware, no cache headers** — every JSON response is uncompressed; Express's default ETag hashes every body for nothing. **[verified: no `compression` anywhere]** | `app.ts` | `app.use(compression())`; disable etag or set proper Cache-Control. |
| 8 | **Rate limit will throttle real clinics**: 100 req/min per IP, in memory. One clinic NAT + a few patient tabs polling at 12 req/min each = 429s for everyone behind that IP; and the store doesn't work across instances. | `middleware/rateLimit.ts:5-6`, `config.ts:99` | Redis store, higher global ceiling, strict per-route limits on auth endpoints only. |
| 9 | Prescriptions/lab orders block on a synchronous AI round-trip: ~7 queries + up to 30 s (15 s timeout × 2 tries, hard-coded); AI down ⇒ fallback **blocks every order**. | `clinical-safety.service.ts:330`, `ai-clinical-safety.client.ts:9,99` | Honour the timeout env; cache patient context; consider async check + optimistic pending state. |
| 10 | **Slow, fragile boot**: sequential Redis connect (up to ~10 s), seeding, network SMTP `verify()`, then `archiveOldAuditLogs` — a `deleteMany` full-scan on `audit_logs` (no `createdAt` index) **before `listen()`**. Plus `prisma db push` on every Render boot. | `index.ts:14-19`, `sync.service.ts:217` | Parallelize; move the audit purge to a scheduled job after listen; use migrations. |

### A2. Unbounded queries (grow with production data)

~73 `findMany`/`groupBy` calls lack `take`. The dangerous ones:

- **Patient:** `/visits`, `/prescriptions` (+items+2 relations), `/labs`, `/allergies` (`patient.routes.ts:307,322,341,356`); `/export-data` = 6 full-history queries + pretty `JSON.stringify` (`:709-742`).
- **Hospital:** `/referrals` (`hospital.routes.ts:756`), `/savings` (`:902`), `/analytics` (user-chosen range, `:942`); extended analytics returns **every visit incl. vitals JSON** just to count codes (`hospital-ext.service.ts:253`); `groupBy patientId` just to count (`:125`); `/patient/:id` includes **all** medical records (`hospital.routes.ts:549`).
- **Insurer:** savings (`insurer.service.ts:108`), fraud windows ×2 (`:219,235`), utilization (`:302`), analytics loads every claim to sum in JS — use `aggregate` (`:454`), snapshots across all pharmacies (`:158`), invoices (`:417`), member export with full patient rows (`portal-complete.service.ts:1002`).
- **Pharmacy:** `calculatePatientAdherence` loads full Rx + dispense history and runs **inline on every dispense**; the filter is O(rx×events) (`pharmacy.service.ts:809-832,507`); reports with full prescriptions included, trend emits one entry per event (`:945-985`).
- **Admin:** audit export whole-range in memory (`admin.service.ts:364-380`); `getPlatformSettings` loads the entire KV table (`:475` — also a PHI leak, see `AUDIT_GOLIVE.md` #1).
- **Doctor workspace:** all of a doctor's prescriptions for ≤500 census patients (`doctor-workspace.service.ts:433`); draft rows via `startsWith` scan (`:442`).
- **Reference:** `drugInteraction.findMany()` loads the whole table on every call — cache it (`reference.service.ts:33`).
- **Uncapped `?limit=` passthrough (17 sites)** — `parseInt` with no `Math.min`; non-numeric → `NaN` → Prisma 500: `admin.routes.ts:84,109,169,238,271,414,453,471,483,516,645`; `insurer.routes.ts:257,290,587`; `pharmacy.routes.ts:75,229,388`; `hospital.routes.ts:994`. Only 3 endpoints cap at 100.
- **Wrong pagination:** pharmacy lowStock fetches 500 then skips offset in JS (`pharmacy.service.ts:567-577`); dashboard takes lowest-100 then filters in JS (`:107-114`) — use a field reference (`stock ≤ reorderPoint`) in SQL. In-memory search after `take/skip` returns wrong pages: `insurer-ext.service.ts:100-107`, `insurer.service.ts:504-511`, `portal-complete.service.ts:1076-1100`.
- **`count(*)` on every audit page load** (O(n) on `audit_logs`; admin version has no org filter): `audit.service.ts:72`, `admin.service.ts:352`, `pharmacy.service.ts:1012`, `insurer.service.ts:534`.

### A3. N+1 and missed parallelism

- Per-item queries: enriched access grants (1 lookup per grant — `portal-complete.service.ts:228-260`); census medication filter (1 `findFirst` per patient ≤500 — `:417-424`); insurer stats repeats an identical `revenueSnapshot.findFirst` per insurer (`:1156-1158`); dispense does 3 sequential queries per line item **inside the transaction** (`pharmacy.service.ts:449-483`); register creates allergies one-by-one, no transaction (`hospital.routes.ts:502-512`); draft completion creates orders one-by-one, each calling `touchPatientData` (`doctor-workspace.service.ts:673-702`); sync push ≤50 items sequential (`sync.service.ts:204-212`); adherence reminders send SMS one at a time with **no fetch timeout**, unbounded list (`portal-complete.service.ts:934-938`).
- Sequential work: hospital dashboard 4+5 queries with duplicates (`hospital.routes.ts:281-303`); patient dashboard re-counts allergies/Rx (`patient.routes.ts:571-627`); admin dashboard 10 parallel then health check incl. `pg_stat_activity` (`admin.service.ts:25-55`); insurer dashboard runs a **platform-wide** `medicalRecord.groupBy` whose result is unrelated to the insurer (`insurer.service.ts:62`); loads 100 claims to count in JS (`:38,93`); login ≈6 sequential queries + sync scrypt (`auth.service.ts:88-110`).
- Repeated reads in one request: QR service reads patient → regenerates → reads again (`qr.service.ts:51-58`); `requireHospitalContext` + grant check + access-log insert on every clinical call (`hospital.routes.ts:97-113`, dup `ai.routes.ts:23-36`); `requirePatient` ditto (`patient.routes.ts:50`) — cache org/patient context in Redis or JWT claims.
- **`touchPatientData` = read+write on `patients` per clinical mutation**, ~20 call sites → write amplification + a hot row + invalidates any QR on screen (`qr.service.ts:146`).

### A4. Over-fetching (missing `select`)

Full patient rows where only the name is used (`portal-complete.service.ts:394,796,921,1002,1079,1082`; `hospital-ext.service.ts:199,218`; `insurer-ext.service.ts:82-86` which also pulls 5 Rx+items per member); full prescription per dispense event (`pharmacy.service.ts:947`); `/me` loads full org rows for 2 fields; raw Prisma graphs returned to clients incl. vitals/results JSON in list views (`hospital.routes.ts:545-558`; `hospital-ext.service.ts:230`; `patient-ext.service.ts:140`); sync-queue polls return `resourceData` JSON every 30–60 s (`sync.service.ts:27`); admin patient search includes visits+claims to compute a boolean (`admin.service.ts:625-631`).

### A5. Blocking CPU in the request path

pdfkit PDFs + ExcelJS `writeBuffer` + CSV built fully in memory, in-process, then a synchronous Supabase upload before responding (`report.service.ts`; export endpoints in portal-complete/insurer/pharmacy); hospital audit CSV holds ≤5000 rows (`portal-complete.service.ts:631`); `QRCode.toDataURL` on every `/qr-code` poll (~60 s TTL drives it) (`qr.service.ts:62`); `JSON.parse(JSON.stringify())` ×3 per safety gate (`clinical-safety.service.ts:36`); file downloads buffer the whole file instead of streaming (`files.routes.ts:40-43`, `file.service.ts:210`). Multer memoryStorage ⇒ ~20 parallel 10 MB uploads ≈ +200 MB heap on a 512 MB instance.

### A6. Missing indexes (Postgres doesn't index FKs automatically)

Highest impact first: `PrescriptionItem(prescriptionId)` (~25 `include items` sites); `AccessGrant(patientId, granteeType, granteeId, isActive, expiresAt)` (checked on every clinical call); `Visit(hospitalId, checkedInAt)` + `(patientId, checkedInAt)` + `(hospitalId, patientId, status)`; `Prescription(patientId, prescribedAt)`, `(hospitalId, prescribedAt)`, `(pharmacyId, status, dispensedAt)`; `AuditLog(createdAt)`, `(resourceId)`, `(userId, createdAt)`; `AccessLog(patientId, createdAt)`, `(action, createdAt)`; `LabOrder(hospitalId, orderedAt)`, `(patientId, status, orderedAt)`, `(visitId)`; `Claim(insurerId, createdAt)`; `SavingsRecord(insurerId, createdAt)`, `(attemptedProvider)`; `DispenseEvent(pharmacyId, createdAt)`, `(prescriptionId)`; `SyncQueue(userId, status, createdAt)`; `InsurerAlert(insurerId, createdAt)`; `Referral(fromHospitalId)`, `(toHospitalId)`; `HospitalStaff(hospitalId)`; `RefreshToken(tokenHash)`; `InsurerMember(patientId)`. Name/phone/ID `contains` searches need `pg_trgm` GIN indexes (`hospital.routes.ts:388-398`, `pharmacy.service.ts:723-733`, `admin.service.ts:612-623`). `platform_settings.key` prefix scans need `text_pattern_ops` — or dedicated tables.

### A7. Infrastructure

Redis is used **only** for the token blacklist + health ping. Natural wins: QR access requests, org/staff/patient context, reference catalogs + interactions, dashboard aggregates, login lockout, rate-limit store. Prisma has no visible `connection_limit`/`pgbouncer=true` (check `DATABASE_URL`), no slow-query logging, no request-latency middleware. Audit middleware writes a row for **every** mutation incl. login/refresh/sync — many actions get 2 rows. `pdfkit`/`exceljs`/`qrcode` load eagerly via portal-complete into most routers — lazy-import ExcelJS (one endpoint uses it). The `--max-old-space-size=768` build flag signals tsc memory pressure — add `incremental`, consider esbuild.

---

## B. Frontends

### B1. Bundles **[sizes verified from dist/]**

| App | Main chunk | Split? |
|---|---|---|
| insurance-portal | **906 KB** | no — single chunk |
| pharmacy-portal | **897 KB** | no — single chunk |
| hospital-portal | **787 KB** | no — single chunk |
| admin-portal | 395 KB + 375 KB recharts chunk | yes (TanStack Start auto) |
| patient-portal-desktop | 346 KB | no |

- **Zero `React.lazy` / dynamic `import()` in any client** [verified]. All pages statically imported (`hospital App.tsx:8-29`, `insurance App.tsx:11-22`, `pharmacy App.tsx:9-25`, mobile `App.tsx:9-15`). Every `vite.config.ts` raises `chunkSizeWarningLimit` to 700 — which only hides the warning.
- Login pages download everything: recharts is statically imported by insurer/pharmacy dashboards; the QR scanner by hospital Dashboard/Checkin.
- **Hospital QR scanner pulls ~1 MB of zxing wasm from `fastly.jsdelivr.net` at runtime** [verified: URL present in the built bundle] on browsers without native `BarcodeDetector` (Windows Chrome, Firefox) — third-party CDN on the patient-ID path; fails offline/under CSP. Self-host via the polyfill's `locateFile` + lazy-load the scanner.
- Unused deps per app (install weight + confusion; full lists per app): patient-desktop uses 1 of 46 ui files and ships react-query **without a single `useQuery`**, two icon libraries; admin uses 1 of 46; hospital 23 of 49; mobile's nativewind/tailwind/clsx/tailwind-merge serve only dead files.
- Fonts: patient loads Roboto in 5 weights (300/900 unused); insurance loads 7 font files via render-blocking CSS `@import` (no preconnect); hospital/pharmacy same pattern; admin declares Inter/Fira Code but never loads them (silent system-font fallback).

### B2. Re-renders & main-thread work

- **No virtualization or memoized rows anywhere.** Pharmacy Inventory renders 500 `TableRow`s, filters per keystroke with per-item `Date` allocations, and **every +/− click invalidates and refetches all 500** (`Inventory.tsx:36-132`, `store/rx.ts:50`). Prescriptions: 200 rows, `formatDistanceToNow` per row per render (`Prescriptions.tsx:104`).
- Hospital Waitlist: unbounded rows × 3 Radix `Select`s each + doctor list per row; checkbox click copies a Set → re-renders every row; `Date.now()` scans outside memo (`Waitlist.tsx:74-225`). "Auto no-show" awaits serial round-trips (`:95-97`).
- Insurance Savings re-maps all records + rebuilds chart arrays per keystroke → charts replay animations (`Savings.tsx:44-160`); dashboards compute chart series in render, unmemoized (insurer `Dashboard.tsx:48-57`, admin `index.tsx:72-80`).
- Context values recreated every render: patient `Toast.tsx:36`, `auth.tsx:226-241` (13 fields), hospital `GlobalSearch.tsx:56` (provider owns query state → every search keystroke re-renders consumers), mobile `toast.tsx:75`.
- Mobile: **12 whole-store `usePatientStore()` subscriptions, no selectors** → every `set()` (incl. `isLoading` toggles and the 60 s QR refresh) re-renders the root + active screen; no `FlatList` anywhere (all lists are `.map` in `ScrollView`); `HomeScreen` sorts the full activity log with `new Date()` ×2 per comparison each render (`:61-64`); O(n²) dedupe on every sync (`store.ts:725-739`); `QRDisplay` re-renders the QR SVG every second from the countdown (`qr.tsx:68`); artificial 1.8 s + 0.6 s onboarding `setTimeout`s; 2 s forced splash after a loader; conditional tab rendering loses scroll/state per switch.
- `PrescriptionBuilder.tsx:62` puts the whole prescriptions array in a query key → hashed per render, refetch on identity change. PrintStickers re-encodes every QR on each store update, twice due to a double refresh.

### B3. Network waste

- Every `QueryClient` uses defaults (`staleTime: 0`, refetch on focus/mount/reconnect) → alt-tabbing back into pharmacy refetches 500+200 records (`hospital App.tsx:33`, `insurance App.tsx:24`, `pharmacy App.tsx:27`, `admin router.tsx:6`).
- **No AbortController, no timeout in any client** (web `client.ts` or mobile `api.ts`) → per-keystroke requests run to completion; mobile sync can hang forever with `isLoading` stuck. No single-flight refresh anywhere; mobile can fire 12 parallel `/refresh`.
- Per-keystroke, undebounced server queries: hospital census (`Patients.tsx:34`), GlobalSearch (also fires `query || " "` on open → fetches everyone, `GlobalSearch.tsx:28-31`), drug search (`PrescriptionBuilder.tsx:38`), ICD search (`AddVisitForm.tsx:76`), insurer members (`Members.tsx:26`).
- Over-fetch: pharmacy dashboard loads 200 prescriptions to show 5 (`Dashboard.tsx:46-100`); pharmacy QR "scan" loads 200 and searches client-side — **misses anything past 200** (`QRScanner.tsx:16-39`); hospital scanner fetches the full census for 4 demo shortcuts (`QRScanner.tsx:62-66`).
- Duplicate caches/fetches: hospital `["departments"]` vs `["hospital","departments"]`, `["staff"]` vs `["hospital","staff"]`, `["pharmacies"]` vs `["reference","pharmacies"]` — invalidations miss the twin; waitlist fetched twice on direct loads (`AppLayout.tsx:22-26` + `Departments.tsx:35`/`PrintStickers.tsx:19`); admin `hospitals("active")` collision (limit 10 vs 50); `/me` fetched by both `lib/auth.ts:57` and `["admin","me"]`.
- Polling: patient portal access-requests every 5 s **even in background tabs** (no visibility check, `portal.tsx:152-162`); hospital QR approval every 2 s ≤60 s with no unmount cancellation (`QRScanner.tsx:70-76`); mobile **QR retry storm — 1 request/second indefinitely** when offline/failing, since errors are swallowed and `qrExpiresAt` never advances (`qr.tsx:28-40`, `store.ts:822-831`).
- **Mobile login = 24 requests**: `login()` runs `syncAllRemoteData` (12 parallel), then the auth flip makes `App.tsx:59-66` run it again. None of the 12 endpoints is paginated.
- Patient portal: every tab switch remounts and refetches all data (React Query mounted but unused).
- Pharmacy `ProtectedRoute` renders `null` until `/me` resolves → blank page + serialized auth→data waterfall.

### B4. Mobile persistence

Single persisted blob `MiqorAI-mobile-storage` holds the **entire medical history** and is re-serialized + rewritten on **every** `set()` (incl. per-second QR retries). Android AsyncStorage rows >~2 MB fail to read ("Row too big to fit into CursorWindow") → a long-history patient may be unable to hydrate the app at all. Split into domain slices or move to MMKV/SQLite (`store.ts:1002-1033`).

---

## C. Priority order

1. **Backend quick wins (hours):** compression middleware; cap every `?limit=`; derive the AES key once; fix `getPlatformSettings` (also a leak); add the §A6 top-5 indexes; Redis-backed rate limit.
2. **Kill the polling economy (1–2 days):** QR requests → Redis/table + SSE or visibility-aware backoff; fix the mobile QR retry storm; single-flight refresh + AbortController in the shared client (do this once the workspace consolidation from `AUDIT_IMPROVEMENTS.md` §2.1 lands).
3. **Frontend defaults (1 day):** `staleTime` ≥30 s; debounce the five per-keystroke searches; route-level `React.lazy` in hospital/insurance/pharmacy; lazy-load recharts + the QR scanner; self-host zxing wasm.
4. **Query hygiene (ongoing):** batch the N+1s in §A3; add `select` to the hot endpoints; move exports/PDFs out of the request path.
5. **Mobile (before release):** fix double-sync login, store slices/MMKV, FlatList, selectors.
