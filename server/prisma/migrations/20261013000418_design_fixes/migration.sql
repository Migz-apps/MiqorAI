-- AlterTable
ALTER TABLE "medical_records" ALTER COLUMN "recorded_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "visits" ALTER COLUMN "recorded_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "access_grants" ALTER COLUMN "granted_by" DROP NOT NULL;

-- AlterTable
ALTER TABLE "invitations" ADD COLUMN     "accepted_user_id" UUID;

-- AlterTable
ALTER TABLE "onboarding_requests" ADD COLUMN     "password_hash" TEXT;

-- AlterTable
ALTER TABLE "report_schedules" ADD COLUMN     "last_run_at" TIMESTAMP(3),
ADD COLUMN     "next_run_at" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "audit_logs_archive" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "user_email" TEXT,
    "action" TEXT NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_id" TEXT,
    "organization_id" UUID,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "success" BOOLEAN NOT NULL DEFAULT true,
    "failure_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL,
    "archived_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_archive_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visit_drafts" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "doctor_user_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_id" UUID,
    "status" TEXT NOT NULL DEFAULT 'active',
    "data" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visit_drafts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "qr_access_requests" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "hospital_name" TEXT NOT NULL,
    "hospital_code" TEXT NOT NULL,
    "requester_id" UUID NOT NULL,
    "requester_email" TEXT NOT NULL,
    "requester_name" TEXT NOT NULL,
    "context" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "expires_at" TIMESTAMP(3) NOT NULL,
    "responded_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "qr_access_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "org_settings" (
    "id" UUID NOT NULL,
    "scope" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "data" JSONB NOT NULL,

    CONSTRAINT "org_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "biometric" JSONB,
    "notifications" JSONB,
    "prefs" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patient_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "audit_logs_archive_organization_id_created_at_idx" ON "audit_logs_archive"("organization_id", "created_at");

-- CreateIndex
CREATE INDEX "visit_drafts_hospital_id_doctor_user_id_patient_id_idx" ON "visit_drafts"("hospital_id", "doctor_user_id", "patient_id");

-- CreateIndex
CREATE INDEX "qr_access_requests_patient_id_idx" ON "qr_access_requests"("patient_id");

-- CreateIndex
CREATE INDEX "qr_access_requests_status_idx" ON "qr_access_requests"("status");

-- CreateIndex
CREATE UNIQUE INDEX "org_settings_scope_org_id_key" ON "org_settings"("scope", "org_id");

-- CreateIndex
CREATE UNIQUE INDEX "patient_preferences_user_id_key" ON "patient_preferences"("user_id");

-- Cleanup: null out medical record recorders that no longer exist before adding the FK
UPDATE "medical_records" SET "recorded_by" = NULL
WHERE "recorded_by" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = "medical_records"."recorded_by");

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cleanup: null out visit recorders that no longer exist before adding the FK
UPDATE "visits" SET "recorded_by" = NULL
WHERE "recorded_by" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = "visits"."recorded_by");

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_recorded_by_fkey" FOREIGN KEY ("recorded_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Cleanup: delete adherence snapshots whose patient no longer exists before adding the FK
DELETE FROM "patient_adherence_snapshots"
WHERE NOT EXISTS (SELECT 1 FROM "patients" p WHERE p."id" = "patient_adherence_snapshots"."patient_id");

-- AddForeignKey
ALTER TABLE "patient_adherence_snapshots" ADD CONSTRAINT "patient_adherence_snapshots_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cleanup: delete adherence snapshots whose pharmacy no longer exists before adding the FK
DELETE FROM "patient_adherence_snapshots"
WHERE NOT EXISTS (SELECT 1 FROM "pharmacies" ph WHERE ph."id" = "patient_adherence_snapshots"."pharmacy_id");

-- AddForeignKey
ALTER TABLE "patient_adherence_snapshots" ADD CONSTRAINT "patient_adherence_snapshots_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Cleanup: null out grantors that no longer exist before adding the FK
UPDATE "access_grants" SET "granted_by" = NULL
WHERE "granted_by" IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM "users" u WHERE u."id" = "access_grants"."granted_by");

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_granted_by_fkey" FOREIGN KEY ("granted_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_drafts" ADD CONSTRAINT "visit_drafts_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_drafts" ADD CONSTRAINT "visit_drafts_doctor_user_id_fkey" FOREIGN KEY ("doctor_user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visit_drafts" ADD CONSTRAINT "visit_drafts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "qr_access_requests" ADD CONSTRAINT "qr_access_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patient_preferences" ADD CONSTRAINT "patient_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

