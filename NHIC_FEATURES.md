# MiqorAI → NHIC Rwanda: Feature Roadmap for the Technical Interview

**Purpose of this document.** Features that are compatible with MiqorAI exactly as it is today
(Express + Prisma/Postgres backend, five React portals, Expo patient app, FastAPI AI service)
and that map directly onto what the National Health Intelligence Center (NHIC) exists to do.
Each feature includes enough implementation detail (schema, endpoints, service logic, UI, demo)
to build it without further design work.

**What the NHIC is (verified, Oct 2026).** Launched April 2025 as a flagship initiative of the
Rwanda Biomedical Centre (RBC) under the Ministry of Health. Public descriptions consistently name
five pillars:

1. **Unified health data integration** — a national health data warehouse with real-time feeds.
2. **Advanced analytics & decision support** for policy and operations.
3. **Disease surveillance & early outbreak warning** — incl. IMPURUZA, their nationwide
   electronic event-based surveillance system; One Health scope (human/animal/environmental).
4. **Health financing optimization & performance monitoring.**
5. **An AI lab** — predictive analytics and AI-powered tools supporting medical decisions.

The ecosystem your project must speak to: **DHIS2** is the national HMIS (700+ facilities);
**eBuzima** is the national centralized EMR; interoperability runs on **OpenHIE/OpenHIM** with a
**HAPI-FHIR client registry** connected to OpenMRS, LabWare, **NIDA** (national ID) and DHIS2;
**FHIR is advised, not mandated**; **Law No. 058/2021** governs personal-data protection and a
**National Data Sharing Policy (2025)** governs data exchange.

**The interview thesis you can defend:** *"MiqorAI is a facility-level data-capture network
(hospital, pharmacy, insurer, patient) that can feed the NHIC's warehouse with standards-based,
de-identified, surveillance-ready data — and it already has an AI clinical-safety layer aligned
with the NHIC AI lab's mission."* Every feature below strengthens one pillar of that sentence.

---

## Tier 1 — Direct NHIC-pillar features (build these first)

### F1. Disease Surveillance & Early-Warning Module (pillar 3 — the strongest card)

**What it is.** An indicator-based + event-based surveillance layer: the system continuously
aggregates diagnoses already captured in visits into weekly epidemiological counts per facility
and district, detects anomalies against historical baselines, and raises alerts — a
facility-level IMPURUZA companion.

**Why it fits now.** `Visit.diagnosisCodes` (ICD-11-style array) and
`MedicalRecord(recordType=diagnosis)` already capture the raw signal; the admin portal already
has `GlobalMap`, `ActivityFeed` and chart components; `HourlyMetric` shows the aggregation
pattern already exists.

**Data model (add to `server/prisma/schema.prisma`):**
```prisma
model NotifiableCondition {       // IDSR priority disease dictionary
  id          String  @id @default(uuid())
  code        String  @unique     // ICD-11 code or code prefix, e.g. "1A00" (cholera)
  name        String              // "Cholera"
  category    String              // "epidemic_prone" | "eradication" | "other_public_health"
  immediate   Boolean @default(false) // true = case-based immediate notification
  threshold   Int?                // optional absolute alert threshold per week
}

model SurveillanceWeekly {        // one row per (condition, facility, ISO week)
  id           String   @id @default(uuid())
  conditionId  String
  hospitalId   String
  isoYear      Int
  isoWeek      Int
  caseCount    Int
  @@unique([conditionId, hospitalId, isoYear, isoWeek])
  @@index([conditionId, isoYear, isoWeek])
}

model SurveillanceSignal {        // raised alerts
  id           String   @id @default(uuid())
  conditionId  String
  hospitalId   String?            // null = national-level signal
  isoYear      Int
  isoWeek      Int
  observed     Int
  expected     Float
  zScore       Float
  level        String             // "watch" | "alert" | "epidemic"
  status       String  @default("open") // open | acknowledged | closed
  createdAt    DateTime @default(now())
  @@index([status, createdAt])
}
```

**Service (`server/src/services/surveillance.service.ts`):**
1. `aggregateWeek(isoYear, isoWeek)` — one grouped query over `Visit` joining
   `diagnosisCodes` against `NotifiableCondition.code` prefixes (unnest the array in raw SQL or
   filter in JS at current scale), upsert into `SurveillanceWeekly`.
2. `detectSignals(isoYear, isoWeek)` — for each (condition, facility): compute baseline mean μ
   and standard deviation σ from the same ISO week ±2 in the previous 3 years, or (while history
   is short) a rolling 8-week window excluding the current week. Flag **C2-style**:
   `z = (observed − μ) / max(σ, 1)`; `z ≥ 2` → watch, `z ≥ 3` or `observed ≥ threshold` → alert;
   any case of an `immediate` condition → alert instantly at visit-save time (hook in
   `hospital.routes.ts` where the diagnosis is written).
3. Run both from a scheduler (node-cron inside the server or a Render cron job hitting an
   internal endpoint) **after** `listen()` — never during boot.
4. On a new signal: create an `ActivityFeedEntry`, a `HospitalNotification` for the facility,
   and (reuse `sms.service`) an SMS to a configured district contact.

**Endpoints (`/api/admin/surveillance`, super_admin + a new `surveillance_analyst` role):**
- `GET /summary?weeks=12` — epi-curve series per condition (national).
- `GET /facility/:hospitalId?weeks=12` — per-facility curves.
- `GET /signals?status=open` / `PUT /signals/:id {status}` — alert triage.
- `GET /conditions` / `POST /conditions` — manage the dictionary.
- `GET /linelist/:signalId` — the de-identified case line list behind a signal (age band,
  sex, week, facility — **no names/IDs**; see F5 rules).

**UI (admin portal, new route `/surveillance`):** epi-curve chart (recharts is already in the
bundle), the existing `GlobalMap` recolored by signal level per facility node, a signals table
with acknowledge/close, and the condition dictionary editor. Add a red badge count to the Sidebar
wired to `GET /signals?status=open` (replacing one of the fake badges).

**Seed for the demo:** add `seed_data/notifiable_conditions.csv` (start with ~10: cholera,
measles, meningococcal meningitis, malaria, COVID-19, VHF/Ebola, rabies, typhoid, bloody
diarrhoea, maternal death — *verify the current Rwanda IDSR list before the interview*) and a
script that injects a synthetic measles spike in week-2 so a live alert fires on screen.

**Effort:** 4–6 days. **Demo line:** "Every diagnosis a doctor enters becomes a surveillance
data point within the week; thresholds fire automatically — this is the facility feed IMPURUZA-style
systems need."

---

### F2. DHIS2 Aggregate Reporting Export (pillar 1 — speaks the national language)

**What it is.** Monthly facility indicator reports exported as DHIS2 `dataValueSets` JSON —
the exact payload a DHIS2 instance imports (`POST /api/dataValueSets`). Rwanda's HMIS is DHIS2,
so demonstrating a native export is worth more in the interview than any custom dashboard.

**Data model:**
```prisma
model Dhis2ElementMap {
  id            String @id @default(uuid())
  internalKey   String @unique  // e.g. "visits_total", "malaria_confirmed", "rx_dispensed"
  dataElement   String          // DHIS2 dataElement UID (11 chars)
  categoryCombo String?         // optional disaggregation UID
}
model Dhis2OrgUnitMap {
  hospitalId String @id         // our Hospital.id
  orgUnit    String             // DHIS2 orgUnit UID for that facility
}
```

**Service (`dhis2-export.service.ts`):**
1. `computeMonthlyValues(hospitalId, period /* "2026-09" → "202609" */)` — reuse the queries
   behind the existing hospital analytics: total visits, visits by top ICD groups, prescriptions
   dispensed, lab orders completed, referrals out. Return `{internalKey → value}`.
2. `buildDataValueSet(hospitalId, period)` →
   `{ dataSet?, completeDate, period: "202609", orgUnit, dataValues: [{dataElement, value, categoryOptionCombo?}] }`,
   resolving through the two map tables; skip and report unmapped keys.
3. `pushToDhis2(payload)` — `fetch(`${DHIS2_BASE_URL}/api/dataValueSets`)` with Basic auth from
   `DHIS2_USERNAME`/`DHIS2_PASSWORD` env (add to `.env.example`). **Also always offer file
   download** — in the interview you demo against the free public `play.dhis2.org` instance or
   just show the generated JSON if offline.

**Endpoints:** `GET /api/admin/dhis2/preview?hospital_id&period`,
`POST /api/admin/dhis2/export {hospital_id, period, push: boolean}` (returns the JSON and, if
push, the DHIS2 import summary), CRUD for the two map tables.

**UI:** admin portal → new "National Reporting" card on `/compliance` or its own route:
period picker, facility picker, preview table (internalKey, value, mapped UID or "unmapped"),
Export / Push buttons, import-summary display.

**Effort:** 3–4 days. **Demo line:** "One click and this facility's month is a valid
`dataValueSet` — the NHIC warehouse ingests it with zero transformation."

---

### F3. FHIR R4 Read-Only Facade (pillar 1 — interoperability credibility)

**What it is.** A `/fhir` route group exposing the existing data as FHIR R4 resources — the
standard Rwanda's HIE client registry (HAPI FHIR) already uses. Read-only first: that is 20% of
the work and 90% of the interview value.

**Scope (7 resources + CapabilityStatement):**

| FHIR resource | Source mapping (Prisma → FHIR) |
|---|---|
| `Patient` | `Patient`: id→`id`; firstName/lastName→`name[0].given/family`; dob→`birthDate`; gender→`gender`; nationalId→`identifier[]` with `system: "https://nida.gov.rw/id/nid"`; phone→`telecom`; bloodType→extension |
| `Organization` | `Hospital`/`Pharmacy`/`Insurer`: code→`identifier`, name, type via `type.coding` |
| `Encounter` | `Visit`: status map waiting/with_nurse/with_doctor→`in-progress`, completed→`finished`, no_show→`cancelled`; department→`serviceType`; checkedInAt/checkedOutAt→`period`; hospital→`serviceProvider` |
| `Condition` | `MedicalRecord(recordType=diagnosis)` + `Visit.diagnosisCodes`: ICD-11 in `code.coding` with `system: "http://id.who.int/icd/release/11/mms"` |
| `MedicationRequest` | `Prescription`+`PrescriptionItem`: status map (pending→active, dispensed→completed, rejected→cancelled…); drug name in `medicationCodeableConcept.text`; dose/frequency→`dosageInstruction` |
| `Observation` | `LabOrder.results` JSON: one Observation per analyte, `status: final` when completed; test code in `code.text` (LOINC later) |
| `AllergyIntolerance` | `MedicalRecord(recordType=allergy)`: substance→`code.text`, reaction/severity→`reaction[]` |
| `Immunization` | `MedicalRecord(recordType=immunization)` |

**Implementation (`server/src/routes/fhir.routes.ts` + `services/fhir-mapper.service.ts`):**
- Pure mapping functions `toFhirPatient(p): object` etc. — no new tables. Type them against
  `@types/fhir` (dev-dep only) so the compiler enforces resource shape.
- Endpoints: `GET /fhir/metadata` (CapabilityStatement listing the 7 resources, `mode:
  "server"`, read+search-type only), `GET /fhir/{Resource}/:id`, `GET /fhir/{Resource}?patient=`
  plus `Patient?identifier=` search. Return `Bundle {type:"searchset"}` with `total` and basic
  paging (`_count`, max 100 — respects the audit's uncapped-limit rule).
- Auth: same JWT, new scope rule — only `super_admin` or a dedicated `integration` role; every
  access writes an `AccessLog`. Content-Type `application/fhir+json`.
- Validate during development against the public HAPI validator or `fhir-validator-cli`; keep
  one validated example of each resource in `server/tests/fhir.endpoints.test.ts` (snapshot
  the JSON, assert `resourceType`, `id`, mandatory fields).

**Effort:** 4–5 days. **Demo line:** open `/fhir/Patient/<id>` and `/fhir/metadata` live;
"this plugs into an OpenHIM channel as-is."

---

### F4. National ID (NIDA) Linkage + Master Patient Index (pillar 1 — identity)

**What it is.** Verified national-ID linkage and duplicate-patient detection — the prerequisite
for any national warehouse to merge records across facilities. Rwanda's HIE already links NIDA,
so showing you designed for it lands well.

**What exists:** `Patient.nationalId` is already a unique column; registration already collects it.

**Implementation:**
1. **Adapter interface** (`services/identity/nida.adapter.ts`):
   `verifyNationalId(nid: string): Promise<{valid: boolean; fullName?: string; dob?: string; sex?: string}>`
   with two implementations: `MockNidaAdapter` (checksum + lookup against a local fixture file —
   what you demo) and `HttpNidaAdapter` (env-configured base URL + API key, for when real access
   is granted). Selected by `NIDA_MODE=mock|http`. Be explicit in the interview that production
   NIDA access is a government integration process — the adapter boundary is the point.
2. **Verification workflow:** `POST /api/hospital/patient/:id/verify-nid` → calls the adapter,
   compares returned name/dob with the stored record (normalized Levenshtein ≤ 0.2 on names,
   exact dob), stores result in new columns `Patient.nidVerifiedAt DateTime?`,
   `nidVerifyStatus String?` ("verified" | "mismatch" | "not_found"). Show a ✓/✗ badge in the
   hospital portal `PatientHeader` and patient census.
3. **Duplicate detection (MPI-lite):** nightly job + on-registration check:
   - deterministic: same `nationalId` or same `phone` + dob;
   - probabilistic: blocking key = soundex(lastName) + birth year; score candidates with
     weighted field agreement (firstName 0.3 via Jaro-Winkler, dob 0.3 exact, sex 0.1,
     district 0.1, phone 0.2); score ≥ 0.75 → row in new model
     `PatientLinkCandidate {patientAId, patientBId, score, status: pending|merged|rejected}`.
   - Admin portal `/patients` gains a "Possible duplicates" tab with side-by-side compare and a
     **merge** action: repoint FKs (visits, prescriptions, labs, records, grants) in one
     transaction, soft-deactivate the loser, write an `AuditLog` with both ids.
4. Registration UX: when a receptionist enters an NID that verifies, auto-fill name/dob/sex from
   the adapter response (editable before save).

**Effort:** 4–6 days (merge transaction is the careful part). **Demo line:** register the same
person twice with a typo'd name; the duplicates tab catches it; merge live.

---

### F5. De-identified Analytics Feed (pillars 1+2 — the "warehouse-ready" proof)

**What it is.** A documented, enforced de-identification layer that exports aggregate and
record-level datasets safe to hand to NHIC analysts — directly invoking Law 058/2021 and the
2025 National Data Sharing Policy in your design rationale.

**Rules (write them in code and in a `docs/deidentification.md` you can show):**
- **Aggregate endpoints:** any count < k (default `K_ANONYMITY_MIN=5`, env-configurable) is
  suppressed and returned as `null` with `suppressed: true`.
- **Record-level exports:** drop all direct identifiers (names, phone, email, NID, exact dob,
  QR fields, free-text notes); generalize dob→5-year age band, date→ISO week, facility→district
  (add `Hospital.district String?` — you already have geo data in seed); pseudonymize patient id
  with HMAC-SHA256(patientId, `EXPORT_SALT` env) so longitudinal analysis works without identity;
  rotate the salt per export unless the requester is flagged `longitudinal: true`.
- Every export writes an `AuditLog` row (who, dataset, filters, row count) — your Law-058
  accountability story.

**Implementation:**
- `services/deid-export.service.ts` with dataset builders: `visits_weekly`,
  `diagnoses_weekly` (feeds F1), `prescribing_monthly` (feeds F8), `claims_monthly`,
  `adherence_snapshot`. Each returns rows + a machine-readable schema descriptor
  `{name, columns:[{name,type,generalization}], k, generatedAt}`.
- Endpoints: `GET /api/admin/datasets` (catalog), `POST /api/admin/datasets/:name/export
  {format: csv|json, from, to}` → streams the file via the existing `FileAsset`/signed-URL path.
- UI: admin portal "Data Sharing" page — catalog cards, parameters, export history (reuse
  `ReportHistory`).
- Unit tests that **prove suppression**: seed a cell with 3 cases, assert the API returns
  `suppressed: true`; assert no export column matches a direct-identifier denylist.

**Effort:** 3–4 days. **Demo line:** "Here is the dataset catalog the NHIC warehouse would pull;
small cells are suppressed automatically, identifiers are provably absent, and every export is
audited — that's Law 058/2021 by construction."

---

## Tier 2 — Financing & clinical-quality features (pillar 4)

### F6. CBHI / Mutuelle de Santé Support

**What it is.** Model Rwanda's community-based health insurance in the existing insurer module:
member category tiers, copay computation, and an RSSB-shaped claims batch export.

**Implementation:**
- Schema: add `InsurerMember.cbhiCategory Int?` (Ubudehe category 1–4),
  `membershipNumber String?`, `householdId String?`; add `Insurer.scheme String` ("cbhi" |
  "private"). *Verify current premium/copay rules with RSSB sources before the interview; make
  every rate configurable*, seeded defaults: category-based annual premium, flat 10% copay at
  point of service, category 1 exempt.
- `services/cbhi.service.ts`: `computeCopay(memberId, grossAmount)` → `{copay, insurerShare,
  exempt: boolean, reason}`; called where claims are created so every `Claim` stores
  `copayAmount` and `insurerAmount` (add columns).
- Eligibility endpoint for facilities: `GET /api/hospital/patient/:id/coverage` → scheme,
  category, active (membership year paid), copay rate — displayed as a coverage badge in the
  hospital `PatientHeader` and on pharmacy `PrescriptionDetail` (so the cashier sees the copay).
- Claims batch export: `POST /api/insurer/claims/export-batch {period}` → CSV with member
  number, facility code, service date, ICD-11 codes, gross/copay/net — columns configurable via
  a small template table so it can be reshaped to whatever RSSB actually requires.
- UI: insurer portal Members page shows category and household; new "CBHI batch" card on Reports.

**Effort:** 3–4 days. **Demo line:** check in a category-1 patient — the copay banner says
"exempt"; export the month's claims batch.

### F7. Health-Financing Analytics Dashboard

**What it is.** Turn the existing `Claim`, `SavingsRecord` and dispense data into the financing
views the NHIC's pillar-4 language describes: cost per episode, cost per capita by district,
top cost drivers (conditions, drugs, facilities), avoidable-spend tracking (your savings records),
claim-rejection and fraud-flag rates over time.

**Implementation:** one new service with grouped queries (all `aggregate`/`groupBy` — follow the
performance audit: no loading whole tables), endpoints under `/api/insurer/financing/*` and
`/api/admin/financing/*`, one new page per portal reusing the existing chart components. Add the
missing indexes first (`Claim(insurerId, createdAt)`, `SavingsRecord(insurerId, createdAt)` —
already listed in `AUDIT_PERFORMANCE.md` §A6). **Remove the `Math.random()` metrics the audits
flagged as part of this feature** — in an NHIC interview, fake numbers are disqualifying.

**Effort:** 2–3 days.

### F8. Antimicrobial Stewardship (AMR) Tracking

**What it is.** Facility-level antibiotic-prescribing surveillance using the WHO **AWaRe**
classification (Access / Watch / Reserve) — AMR is a priority surveillance topic and a natural
One Health talking point.

**Implementation:**
- Schema: `DrugCatalog.awareClass String?` ("access" | "watch" | "reserve" | null) +
  `atcCode String?`. Seed ~40 common antibiotics with their AWaRe class (public WHO list).
- Metrics service: % of prescriptions containing an antibiotic; Access share (WHO target ≥ 60%);
  Watch/Reserve share per facility per month; top prescribed Watch antibiotics; per-prescriber
  distribution (hospital-internal only).
- Soft nudge in the existing `PrescriptionBuilder`: when a selected drug is Watch/Reserve, show
  an informational badge ("WHO Watch group — confirm indication") — **not** a block; it composes
  with the existing AI check-action dialog.
- Endpoints `/api/hospital/stewardship`, `/api/admin/stewardship`; one chart page each.

**Effort:** 2–3 days. **Demo line:** "This is AMR surveillance falling out of data we already
capture — no extra data entry for clinicians."

---

## Tier 3 — Access & resilience features (Rwanda-context credibility)

### F9. Full Kinyarwanda + French Localization

**What it is.** True rw/fr/en across the patient-facing surfaces (mobile + patient portal first,
hospital portal second). The mobile app already has `src/i18n.ts` with en/rw/fr scaffolding and a
language picker, and the backend already stores a `language` setting — finish the loop.

**Implementation:**
- Mobile: route every live screen's strings through the existing `t()`; move the ~8 current
  calls to full coverage (Home, Records, Share, Family, Profile, Login, Onboarding, toasts).
  Keep keys flat and namespaced (`records.tab.labs`). Have the translations reviewed by a native
  Kinyarwanda speaker — say so in the interview; machine-only medical translation is a red flag.
- Patient portal: add `react-i18next` + the same key files (copy the JSON), a language switcher
  in the profile tab, persist to the existing `PUT /api/patient/settings {language}` and
  initialize from it.
- Backend: localize the SMS/email templates in `notification.service.ts`/`sms.service.ts` by the
  user's stored language (template map keyed `templateName.lang`, fall back to en).
- Dates: pin `Intl` formatting to `rw-RW`/`fr-RW`/`en-RW` with an explicit `timeZone:
  "Africa/Kigali"` — this simultaneously fixes the UTC day-boundary bug from `AUDIT_GOLIVE.md` #3
  on the display side (fix the server queries too).

**Effort:** 3–5 days (translation review is the long pole — start it first).

### F10. SMS/USSD Channel for Patients and CHWs

**What it is.** Feature-phone access: appointment reminders, adherence check-ins, and a USSD menu
for patients without smartphones — critical-mass reality in rural Rwanda and a strong equity
story. Builds on the existing `sms.service.ts`.

**Implementation:**
- **Outbound (1 day):** a `notification-jobs.service.ts` cron that sends (a) appointment
  reminders T-24h (`Appointment` exists), (b) adherence reminders (already exist as manual
  endpoints — schedule them), (c) surveillance alerts (F1). All messages via the existing
  Twilio path; add `SMS_PROVIDER=africastalking` as a second adapter (same interface:
  `sendSms(to, body)`) since Africa's Talking is the regional default — ~60 lines.
- **Inbound USSD (2–3 days):** endpoint `POST /api/ussd` accepting the Africa's Talking
  callback shape `{sessionId, phoneNumber, text}`. Implement a state machine keyed by
  `sessionId` in Redis (TTL 120 s):
  ```
  *VERIFY_CODE# →
  1. Amateka y'imiti (My medications)  → list active prescriptions (name + dose), from phone-number lookup
  2. Gahunda (Appointments)            → next appointment date/facility
  3. Kwemeza ko nafashe imiti (Confirm dose taken) → writes an adherence event
  4. Kode y'umuganga (Doctor access code) → generates a 6-digit, 10-min one-time code
  ```
  Option 4 is the QR-equivalent for feature phones: the code maps to the same
  consent flow as a QR scan — the hospital enters it in the existing scanner's manual field,
  which (per the audit) must then call `request-access`, closing the current consent bypass.
  New model `PhoneAccessCode {codeHash, patientId, expiresAt, usedAt}`.
- Respond in the user's stored language (F9).
- Demo without a telco: a tiny "USSD simulator" page in the admin portal (or a curl script)
  that posts to `/api/ussd` and renders the menu exchange — interviewers understand sandboxes.

**Effort:** 3–4 days total.

### F11. Real Offline-First Sync for Rural Facilities

**What it is.** Make the already-present-but-cosmetic offline story real for the hospital
portal's check-in and vitals flows — rural connectivity is the obvious objection to any
cloud EMR in Rwanda, and the server's `SyncQueue` + conflict schema already exist.

**Implementation:**
1. **Client outbox:** in the hospital portal, wrap the mutations for check-in, vitals and visit
   drafts: on network failure (navigator offline or fetch rejection), persist
   `{opId: uuid, resource, operation, payload, queuedAt}` to IndexedDB (localForage, ~1 KB each).
   A sync loop flushes on `online` events: `POST /api/sync/push` (exists) with the batch.
2. **Idempotency:** send `opId` as `clientOpId`; add a unique column on `SyncQueue.clientOpId`
   so replays are no-ops (the server currently lacks this — small migration).
3. **Fix the dead conflict path** (verified bug: `sync.service.ts:52` checks `"CONFLICT"` against
   a lowercase message): compare `err.details?.code === "CONFLICT"` instead; then the existing
   `resolve client|server` endpoint and the portal's SyncQueue page finally work. Also add the
   two missing `typeIcon` entries that crash that page (`AUDIT_CODE.md` §5.2).
4. **Read cache:** precache the day's check-in list and the open patient's workspace in
   IndexedDB via a small service worker (Workbox, `NetworkFirst` for `/api/hospital/checkins/today`),
   so reception keeps seeing the queue during an outage.
5. Honest scope boundary for the interview: prescriptions/lab orders stay online-only because
   the AI safety gate must see current data — that is a *considered* design decision; say it.

**Effort:** 4–6 days.

### F12. Immunization Registry + Defaulter Tracking (EPI)

**What it is.** A child-vaccination schedule view with automatic defaulter lists and SMS
recall — immunization is a core HMIS indicator set and feeds F2's DHIS2 export directly.

**Implementation:**
- Schema: `VaccineSchedule {id, antigen, doseNumber, dueAgeDays, name}` seeded with the Rwanda
  EPI schedule (BCG birth; OPV 0/6/10/14wk; DTP-HepB-Hib 6/10/14wk; PCV; rota; measles-rubella
  9/15mo; HPV — *verify the current national schedule*). Immunization events already fit
  `MedicalRecord(recordType=immunization, data:{antigen, doseNumber, date, batchNo})`.
- Service: for patients under 5 (dob exists), join given doses vs schedule → status per antigen
  (`due`, `overdue`, `complete`). Defaulter = any dose > 14 days overdue.
- Endpoints: `GET /api/hospital/immunization/defaulters`, `GET
  /api/patient/immunizations` (card for the mobile app), monthly coverage % per antigen →
  register as F2 internal keys (`penta3_coverage` is *the* classic HMIS indicator).
- UI: hospital portal tab with the defaulter list + "Send SMS recall" (reuses F10 outbound);
  a vaccination card screen in the mobile app (table of antigens × doses with ✓/due dates).

**Effort:** 3–4 days.

---

## Tier 4 — AI-lab alignment (pillar 5) — your differentiator, handled honestly

### F13. Clinical-Safety AI: Evaluation Harness + Explainability + Guideline Rules

**What it is.** Not a new model — an upgrade of what you have into something an AI-lab
interviewer will respect: measurable clinical accuracy, visible reasoning, and a deterministic
national-guideline rule layer that the LLM complements rather than replaces.

**Why this framing:** your audits found the current model is evaluated only on JSON shape, has
training/serving skew, and synthetic data that teaches hallucination. An interviewer who probes
will find this in minutes. Owning it — "here is my eval harness, here are the numbers, here is
the rule layer that guarantees the safety floor" — turns the weakness into the strongest part of
the conversation.

**Implementation:**
1. **Golden evaluation set:** 100–150 cases in `MiqorAI_finetune/dataset/eval_golden.jsonl`,
   each `{patient_record, visit_history, action, expected: {intervention_required, alert_type,
   severity}}` — write them from the WHO/Rwanda standard treatment guideline logic (allergy
   conflicts, duplicate tests within lookback windows, dose-range checks, pregnancy
   contraindications, renal-adjustment drugs). `make eval` runs the model and prints precision /
   recall / F1 on `intervention_required` plus alert-type confusion matrix. Gate any model change
   on recall ≥ a chosen floor (safety = recall-critical).
2. **Deterministic rule layer first, LLM second:** in `clinical-safety.service.ts`, run cheap
   DB-backed rules **before** calling the AI: allergy exact/class match (exists), duplicate lab
   within N days (exists), `DrugInteraction` table (exists — **seed it**, audit found it empty),
   plus new max-daily-dose columns on `DrugCatalog`. Rules produce guaranteed blocks; the LLM
   adds context and catches what rules miss. Pitch: "defense in depth — the floor is
   deterministic and auditable, the ceiling is learned."
3. **Explainability in the UI:** the override dialog already shows reasoning; add the
   `evidence[]` records (date/facility/detail — the schema exists in `ai_visit.py`) as expandable
   citations, and a visible label distinguishing `RULE` vs `AI` provenance on every alert.
   `ClinicalSafetyAuditLog` already records decisions — add provenance + model version columns.
4. **Fix the skew** (from `AUDIT_CODE.md` §4.5): align serving action-type strings with training,
   regenerate the synthetic examples so stated facts exist in the prompt, retrain the LoRA
   (the training script exists; 3 epochs on the corrected data), and re-run the eval to show the
   before/after numbers — *that chart is your interview centerpiece.*

**Effort:** 5–8 days including a retrain (Colab/Kaggle GPU, the scripts exist).

### F14. Operational Forecasting (patient flow & stock-outs)

**What it is.** Small, honest predictive analytics on your own data — matching the NHIC's
"predict and prevent" language without overclaiming: 7-day facility visit-volume forecast and
pharmacy stock-out-date prediction.

**Implementation:**
- `services/forecast.service.ts`, pure TypeScript, no ML infra: **Holt-Winters** (triple
  exponential smoothing, weekly seasonality m=7) over daily visit counts per facility — ~80
  lines; and per-inventory-item consumption rate = EWMA of `InventoryAdjustment`/`DispenseEvent`
  daily outflow → `daysToStockout = stock / rate`, flag < 14 days (reorder data exists:
  `reorderPoint`).
- Endpoints: `GET /api/hospital/forecast/visits?days=7` (with ±1 RMSE band computed on a holdout
  of the last 14 days — show the band, it signals statistical literacy), `GET
  /api/pharmacy/forecast/stockouts`.
- UI: forecast line overlaid on the existing analytics chart (dashed, shaded band); a
  "Projected stock-outs" card on the pharmacy dashboard sorted by days remaining.
- Say explicitly in the interview: "simple statistical baselines first; they're transparent,
  they run on a 512 MB instance, and they set the benchmark any future ML model must beat."

**Effort:** 2–3 days.

### F15. One Health / Community Event Reporting Hook (small, pointed)

**What it is.** A minimal event-based-surveillance intake: a public (rate-limited, CAPTCHA-less
but throttled) or CHW-authenticated endpoint + simple form for community health events ("5
children with fever in village X", "livestock die-off") feeding the F1 signal queue with
`source: "community"`. One model (`CommunityEventReport {id, reporterPhone?, district, sector?,
category, description, status, createdAt}`), one endpoint, one admin triage list inside the F1
surveillance page, optional USSD entry via F10 menu option 5. **Effort: 1–2 days** — cheap, and
it name-checks IMPURUZA's event-based model and One Health scope directly.

---

## Build order for the interview (suggested)

| Phase | Items | Why |
|---|---|---|
| 0. Credibility floor (do first) | Revert the comment pass; fix the 4 security holes + PHI leak (`AUDIT_GOLIVE.md` #1, `AUDIT_IMPROVEMENTS.md` §0); remove `Math.random()` metrics & fake stats | A health-data interviewer probing a demo that leaks PHI or shows random "metrics" ends the conversation |
| 1. Surveillance spine | **F1** + **F5** + seed script with a synthetic outbreak | The live "diagnosis → weekly signal → alert on the map" demo is the single highest-impact artifact |
| 2. Interop proof | **F2** + **F3** | Speaks DHIS2 and FHIR — the two words every Rwandan HIS reviewer listens for |
| 3. One equity feature | **F9** or **F10** (pick one and finish it completely) | Shows you build for the actual population, not just dashboards |
| 4. AI honesty | **F13** (eval harness + rule layer at minimum; retrain if time allows) | Converts your riskiest component into your differentiator |
| 5. If time remains | F4, F6, F8, F14 in that order | Breadth across the remaining pillars |

**Demo storyline (12 minutes):** receptionist checks a patient in by QR (consent approval on the
patient's phone) → doctor enters a measles diagnosis → AI/rule layer flags a duplicate lab with
cited evidence → admin surveillance map lights up from the week's synthetic spike, SMS alert
fires → one click exports the month as a DHIS2 `dataValueSet` → open `/fhir/Patient/{id}` raw →
close on the de-identified dataset catalog and the eval-metrics chart.

**Claims discipline:** never say "integrated with NIDA/DHIS2/RSSB" — say "implements the
integration contract, demonstrated against a mock/sandbox, production access is a government
onboarding process." Interviewers at a national data institution reward that precision.

**Verify before the interview** (facts marked above): the current Rwanda IDSR notifiable-disease
list, current CBHI premium/copay rules (RSSB), the current EPI schedule, and the NHIC's own
latest public materials (moh.gov.rw/sites-apps/nhic and rbc.gov.rw).
