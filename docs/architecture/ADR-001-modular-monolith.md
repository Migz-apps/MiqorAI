# ADR-001: Modular monolith with satellite services

**Status:** Accepted · **Date:** 2026-10-09

## Context

MiqorAI's backend is one Express/Prisma service whose core workflows are cross-domain
transactions (visit → prescription → dispense → claim), whose consent model (access grants +
audit) must have a single source of truth, and whose analytics are cross-domain joins. The
code, however, has no enforced internal boundaries: `portal-complete.service.ts` spans six
domains, route files embed queries, and "-ext" services split logic arbitrarily.

## Decision

1. **One deployable backend, one PostgreSQL database.** No microservices split now.
2. **Bounded-context modules** inside `server/src/modules/`:

   | Module | Owns (tables) | Public surface |
   |---|---|---|
   | `identity` | User, RefreshToken, AuthChallenge, OtpVerification, LoginAttempt, Invitation, PasswordResetToken | login/session, `requireRoles`, context resolvers, invitations |
   | `patient` | Patient, EmergencyContact, FamilyMember, DataDeletionRequest, Appointment, AccessGrant, AccessLog | patient routes, grants/consent API (`assertAccessGrant`, `logPatientAccess`), QR identity |
   | `clinical` | Visit, MedicalRecord, LabOrder, Referral, Prescription*, AiPendingClinicalAction, ClinicalSafetyAuditLog, Department, HospitalNotification | hospital routes, doctor workspace, clinical-safety gate, AI visit assist, scan |
   | `pharmacy` | PharmacyInventory, InventoryAdjustment, DispenseEvent, InteractionOverride, PharmacyInvoice, PatientAdherenceSnapshot | pharmacy routes, dispense workflow, adherence |
   | `financing` | Insurer*, InsurerMember, Claim, SavingsRecord, InsurerAlert, InsurerInvoice, InsurerContract, InsurerApiKey, ProviderRiskScore | insurer routes, claims/fraud/savings |
   | `platform` | Hospital, Pharmacy (org records), OnboardingRequest, Dispute, PlatformSetting, PlatformInvoice, AuditLog†, SyncQueue, NetworkNode, ActivityFeedEntry, HourlyMetric, RevenueSnapshot, ReportHistory, ReportSchedule | admin routes, onboarding, sync, org settings |
   | `shared` | FileAsset, IcdCode, DrugCatalog, DrugInteraction, DomainEvent | prisma/redis/config, errors, validation, crypto, audit writer, notification/sms/file/report services, event outbox |

   \* `Prescription`/`PrescriptionItem` are written by `clinical`, transitioned by `pharmacy`;
   pharmacy consumes them through the clinical module's interface (or events), never by raw
   table access from its own services.
   † Audit rows are written through the shared writer only.

   Rules: a module imports other modules **only via their `index.ts`** public surface; raw
   Prisma access to another module's tables is forbidden; `portal-complete.service.ts` and the
   `-ext` services are dissolved into their owning modules.

3. **Domain events via a transactional outbox** (`DomainEvent` table; publisher in
   `shared/events`). Producers append events inside the same transaction as the state change
   (`PrescriptionCreated`, `PrescriptionDispensed`, `DiagnosisRecorded`, `ClaimFlagged`,
   `SafetyOverridden`, `ReferralCreated`). Consumers (worker, surveillance aggregation,
   notifications) poll the outbox; events are the future service seams and the NHIC
   surveillance feed.
4. **Satellite processes, same repo:**
   - AI inference service (already separate; gets mandatory API-key auth).
   - `src/worker.ts`: a second process consuming the outbox + a `JobQueue` for slow work
     (PDF/Excel/CSV exports, SMS/email sends). HTTP handlers never block on these again; the
     "referral saved then 503" class of bug disappears because side effects move to events.
5. **Database defense-in-depth without distribution:** per-context PostgreSQL roles with
   least-privilege grants + RLS backstop (`server/scripts/setup-db-roles.sql`). Physical
   schema-per-module separation is deferred (Prisma `multiSchema` migration) and not required
   for the security property.

## Extraction criteria (when a module becomes a service)

Extract **along an existing module seam** only when a concrete force appears, and only the
module that feels the force:

1. **Scale asymmetry:** a module needs ≳10× the replicas/resources of the rest.
2. **Failure-domain mandate:** a module must keep working while the rest is down (or vice
   versa) and process isolation inside one deploy can't deliver it.
3. **Regulatory isolation:** data that legally cannot co-reside or share credentials.
4. **Runtime mismatch:** the component needs a different language/hardware (the AI service).
5. **Organizational contention:** multiple teams whose deploys block each other.

Until one of these is true for a specific module, splitting it is cost without benefit.

## Consequences

- Clinical correctness keeps single-transaction guarantees; consent stays one lookup.
- Deploys remain atomic; module boundaries make later extraction mechanical.
- The outbox adds one table and a poller, and introduces at-least-once semantics for side
  effects (consumers must be idempotent).
- Cross-module imports become reviewable (lint rule on `modules/*/index.ts`).
