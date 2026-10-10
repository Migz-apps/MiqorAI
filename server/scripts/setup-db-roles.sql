-- MiqorAI: per-context least-privilege database roles (ADR-001 §5).
-- Run as a superuser / owner against the production database AFTER tables exist.
-- Idempotent: safe to re-run. Review role passwords before use (set via \password or ALTER ROLE).
--
-- Model: the API continues to connect with its single app role today. These roles exist so
-- that (a) the worker process can run with a narrower grant set than the web tier, and
-- (b) any module extracted later starts with a ready, least-privilege credential.
-- Table lists mirror the module ownership map in docs/architecture/ADR-001-modular-monolith.md.

-- ---------------------------------------------------------------------------
-- 0. Base roles
-- ---------------------------------------------------------------------------
DO $$ BEGIN CREATE ROLE miqorai_web NOINHERIT LOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE miqorai_worker NOINHERIT LOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE miqorai_readonly NOINHERIT LOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$; -- analytics/BI exports

-- Context roles (NOLOGIN groups; grant to a LOGIN role when a module is extracted)
DO $$ BEGIN CREATE ROLE ctx_identity NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_patient NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_clinical NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_pharmacy NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_financing NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_platform NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE ctx_shared NOLOGIN; EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- ---------------------------------------------------------------------------
-- 1. Revoke public defaults
-- ---------------------------------------------------------------------------
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM PUBLIC;
REVOKE ALL ON SCHEMA public FROM PUBLIC;
GRANT USAGE ON SCHEMA public TO miqorai_web, miqorai_worker, miqorai_readonly,
  ctx_identity, ctx_patient, ctx_clinical, ctx_pharmacy, ctx_financing, ctx_platform, ctx_shared;

-- ---------------------------------------------------------------------------
-- 2. Per-context table grants (Prisma @@map names)
-- ---------------------------------------------------------------------------
-- identity
GRANT SELECT, INSERT, UPDATE, DELETE ON
  users, refresh_tokens, auth_challenges, otp_verifications, login_attempts,
  invitations, password_reset_tokens
TO ctx_identity;

-- patient (incl. consent: grants + access logs)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  patients, emergency_contacts, family_members, data_deletion_requests, appointments,
  access_grants, access_logs
TO ctx_patient;

-- clinical
GRANT SELECT, INSERT, UPDATE, DELETE ON
  visits, medical_records, lab_orders, referrals, prescriptions, prescription_items,
  ai_pending_clinical_actions, clinical_safety_audit_logs, departments, hospital_notifications
TO ctx_clinical;

-- pharmacy (reads prescriptions via clinical's interface; direct grant is transition-only)
GRANT SELECT, INSERT, UPDATE, DELETE ON
  pharmacy_inventory, inventory_adjustments, dispense_events, interaction_overrides,
  pharmacy_invoices, patient_adherence_snapshots
TO ctx_pharmacy;
GRANT SELECT, UPDATE ON prescriptions, prescription_items TO ctx_pharmacy;

-- financing
GRANT SELECT, INSERT, UPDATE, DELETE ON
  insurers, insurer_staff, insurer_members, claims, savings_records, insurer_alerts,
  insurer_invoices, insurer_contracts, insurer_api_keys, provider_risk_scores
TO ctx_financing;

-- platform
GRANT SELECT, INSERT, UPDATE, DELETE ON
  hospitals, pharmacies, hospital_staff, pharmacy_staff, hospital_subscriptions,
  onboarding_requests, disputes, platform_settings, platform_invoices, sync_queue,
  network_nodes, activity_feed_entries, hourly_metrics, revenue_snapshots,
  report_history, report_schedules
TO ctx_platform;

-- shared (reference data, files, audit, outbox)
GRANT SELECT, INSERT, UPDATE, DELETE ON file_assets TO ctx_shared;
GRANT SELECT ON icd_codes, drug_catalog, drug_interactions TO ctx_shared;
GRANT INSERT, SELECT ON audit_logs TO ctx_shared;          -- append-only: no UPDATE/DELETE
-- domain_events (outbox) once the table exists:
-- GRANT INSERT, SELECT, UPDATE ON domain_events TO ctx_shared;

-- ---------------------------------------------------------------------------
-- 3. Compose process roles from contexts
-- ---------------------------------------------------------------------------
GRANT ctx_identity, ctx_patient, ctx_clinical, ctx_pharmacy, ctx_financing, ctx_platform, ctx_shared
  TO miqorai_web;
-- worker: side effects + exports only — no identity writes, no clinical writes
GRANT ctx_shared, ctx_platform TO miqorai_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO miqorai_worker;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO miqorai_readonly;

-- Sequences (Prisma uuid PKs mostly; cover any serial/identity use)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO miqorai_web, miqorai_worker;

-- ---------------------------------------------------------------------------
-- 4. RLS backstop: enable on PHI tables; app roles use permissive policies for
--    now (the API enforces consent); the win is that NO role without a policy
--    (e.g. a leaked BI credential) can read PHI rows at all.
-- ---------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'patients','medical_records','visits','prescriptions','prescription_items','lab_orders',
    'access_grants','access_logs','emergency_contacts','family_members',
    'patient_adherence_snapshots','claims','insurer_members']
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS app_rw ON %I', t);
    EXECUTE format('CREATE POLICY app_rw ON %I FOR ALL TO miqorai_web USING (true) WITH CHECK (true)', t);
    EXECUTE format('DROP POLICY IF EXISTS worker_ro ON %I', t);
    EXECUTE format('CREATE POLICY worker_ro ON %I FOR SELECT TO miqorai_worker USING (true)', t);
  END LOOP;
END $$;

-- miqorai_readonly intentionally gets NO policies on the PHI tables above:
-- RLS denies it those rows even though §3 granted table-level SELECT.
-- It can read aggregates/reference tables only; pair it with the de-identified
-- export layer for analyst access.

-- ---------------------------------------------------------------------------
-- 5. Future (deferred): physical schema-per-context via Prisma multiSchema.
--    When adopted, move each context's tables into its schema and replace the
--    public-schema grants above with schema-level grants.
-- ---------------------------------------------------------------------------
