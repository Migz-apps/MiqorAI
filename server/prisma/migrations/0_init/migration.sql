-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('scheduled', 'completed', 'cancelled', 'no_show');

-- CreateEnum
CREATE TYPE "DeletionRequestStatus" AS ENUM ('pending', 'processing', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('super_admin', 'hospital_admin', 'hospital_staff', 'pharmacy_manager', 'pharmacy_staff', 'insurer_admin', 'insurer_analyst', 'patient');

-- CreateEnum
CREATE TYPE "HospitalStaffRole" AS ENUM ('receptionist', 'nurse', 'doctor', 'admin', 'dept_head');

-- CreateEnum
CREATE TYPE "AccessScope" AS ENUM ('full', 'lab_results', 'medications', 'emergency_only');

-- CreateEnum
CREATE TYPE "PharmacyStaffRole" AS ENUM ('cashier', 'technician', 'pharmacist', 'manager');

-- CreateEnum
CREATE TYPE "InsurerStaffRole" AS ENUM ('analyst', 'fraud_investigator', 'contracts_manager', 'executive', 'admin');

-- CreateEnum
CREATE TYPE "RecordType" AS ENUM ('visit', 'diagnosis', 'medication', 'lab_result', 'immunization', 'procedure', 'allergy');

-- CreateEnum
CREATE TYPE "VisitStatus" AS ENUM ('waiting', 'with_nurse', 'with_doctor', 'completed', 'no_show');

-- CreateEnum
CREATE TYPE "PrescriptionStatus" AS ENUM ('pending', 'verified', 'ready', 'dispensed', 'held', 'rejected', 'sent_to_pharmacy', 'picked_up', 'expired');

-- CreateEnum
CREATE TYPE "LabOrderStatus" AS ENUM ('ordered', 'in_progress', 'completed', 'cancelled');

-- CreateEnum
CREATE TYPE "GranteeType" AS ENUM ('hospital', 'pharmacy', 'doctor');

-- CreateEnum
CREATE TYPE "AccessAction" AS ENUM ('view_records', 'add_record', 'view_visit', 'view_lab', 'view_prescription', 'dispense', 'scan_qr');

-- CreateEnum
CREATE TYPE "FamilyRelationship" AS ENUM ('child', 'parent', 'spouse', 'sibling', 'other');

-- CreateEnum
CREATE TYPE "FamilyAccessLevel" AS ENUM ('full', 'caregiver_only', 'read_only');

-- CreateEnum
CREATE TYPE "DisputeType" AS ENUM ('wrong_record', 'missing_refill', 'incorrect_charge', 'other');

-- CreateEnum
CREATE TYPE "DisputeStatus" AS ENUM ('open', 'investigating', 'resolved', 'rejected');

-- CreateEnum
CREATE TYPE "SyncOperation" AS ENUM ('create', 'update', 'delete');

-- CreateEnum
CREATE TYPE "SyncStatus" AS ENUM ('pending', 'synced', 'failed', 'conflict');

-- CreateEnum
CREATE TYPE "OnboardingType" AS ENUM ('hospital', 'pharmacy', 'insurer');

-- CreateEnum
CREATE TYPE "OnboardingStatus" AS ENUM ('pending', 'approved', 'rejected');

-- CreateEnum
CREATE TYPE "ClaimStatus" AS ENUM ('pending', 'flagged', 'investigating', 'cleared', 'confirmed');

-- CreateEnum
CREATE TYPE "AlertCategory" AS ENUM ('adherence', 'fraud', 'savings', 'system');

-- CreateEnum
CREATE TYPE "AlertSeverity" AS ENUM ('low', 'medium', 'high');

-- CreateEnum
CREATE TYPE "InvoiceStatus" AS ENUM ('pending', 'paid', 'overdue');

-- CreateEnum
CREATE TYPE "DosageForm" AS ENUM ('tablet', 'capsule', 'liquid', 'injection', 'cream');

-- CreateEnum
CREATE TYPE "InteractionSeverity" AS ENUM ('moderate', 'severe');

-- CreateEnum
CREATE TYPE "AiPendingClinicalActionStatus" AS ENUM ('PENDING', 'CANCELLED', 'OVERRIDDEN', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ClinicalSafetyActionType" AS ENUM ('test_order', 'medication_prescription');

-- CreateEnum
CREATE TYPE "ClinicalSafetyDecision" AS ENUM ('ALLOWED', 'BLOCKED', 'OVERRIDDEN', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "password_hash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "display_name" TEXT,
    "organization_id" UUID,
    "organization_type" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "two_factor_enabled" BOOLEAN NOT NULL DEFAULT false,
    "two_factor_secret" TEXT,
    "last_login_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "refresh_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "revoked" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "refresh_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "password_reset_tokens" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "password_reset_tokens_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "auth_challenges" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "purpose" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "payload" JSONB,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auth_challenges_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patients" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "first_name" TEXT NOT NULL,
    "last_name" TEXT NOT NULL,
    "national_id" TEXT,
    "insurance_id" TEXT,
    "date_of_birth" DATE NOT NULL,
    "gender" TEXT,
    "blood_type" TEXT,
    "emergency_contact_name" TEXT,
    "emergency_contact_phone" TEXT,
    "recovery_phrase_enc" TEXT,
    "qr_code_hash" TEXT,
    "qr_version" INTEGER NOT NULL DEFAULT 0,
    "qr_updated_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospitals" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "email_domain" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "pilot_end_date" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospitals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_staff" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "HospitalStaffRole" NOT NULL,
    "department" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacies" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "license_number" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "phone" TEXT,
    "verified" BOOLEAN NOT NULL DEFAULT false,
    "verified_by" UUID,
    "verified_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_staff" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "PharmacyStaffRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurers" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "registration_number" TEXT NOT NULL,
    "address" TEXT,
    "city" TEXT,
    "country" TEXT,
    "currency" TEXT NOT NULL DEFAULT 'KES',
    "phone" TEXT,
    "member_count" INTEGER NOT NULL DEFAULT 0,
    "contract_start_date" TIMESTAMP(3),
    "contract_end_date" TIMESTAMP(3),
    "fee_percentage" DECIMAL(5,2) NOT NULL DEFAULT 20.0,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insurers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_staff" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "role" "InsurerStaffRole" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurer_staff_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_members" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "member_number" TEXT NOT NULL,
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "insurer_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "medical_records" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID,
    "record_type" "RecordType" NOT NULL,
    "data" JSONB NOT NULL,
    "recorded_by" UUID NOT NULL,
    "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "medical_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "visits" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "checked_in_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checked_out_at" TIMESTAMP(3),
    "department" TEXT NOT NULL,
    "visit_type" TEXT NOT NULL DEFAULT 'consultation',
    "reason" TEXT,
    "priority" TEXT NOT NULL DEFAULT 'normal',
    "vitals" JSONB,
    "chief_complaint" TEXT,
    "diagnosis_codes" TEXT[],
    "notes" TEXT,
    "recorded_by" UUID NOT NULL,
    "assigned_staff_id" UUID,
    "status" "VisitStatus" NOT NULL DEFAULT 'waiting',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "visits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescriptions" (
    "id" UUID NOT NULL,
    "visit_id" UUID,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID,
    "pharmacy_id" UUID,
    "diagnosis" TEXT,
    "notes" TEXT,
    "insurance_provider" TEXT,
    "insurance_member" TEXT,
    "prescribed_by" UUID NOT NULL,
    "prescribed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "pharmacy_received_at" TIMESTAMP(3),
    "dispensed_at" TIMESTAMP(3),
    "dispensed_by" UUID,
    "status" "PrescriptionStatus" NOT NULL DEFAULT 'pending',
    "rejection_reason" TEXT,
    "hold_reason" TEXT,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "prescriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "prescription_items" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "inventory_id" UUID,
    "drug_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "strength" TEXT NOT NULL,
    "dosage_form" "DosageForm" NOT NULL DEFAULT 'tablet',
    "dose" TEXT NOT NULL,
    "duration_days" INTEGER NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "frequency" TEXT,

    CONSTRAINT "prescription_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lab_orders" (
    "id" UUID NOT NULL,
    "visit_id" UUID,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "test_name" TEXT NOT NULL,
    "test_code" TEXT,
    "ordered_by" UUID NOT NULL,
    "ordered_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "results" JSONB,
    "results_available_at" TIMESTAMP(3),
    "status" "LabOrderStatus" NOT NULL DEFAULT 'ordered',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "lab_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "visit_id" UUID,
    "from_hospital_id" UUID NOT NULL,
    "to_hospital_id" UUID NOT NULL,
    "from_department" TEXT,
    "to_department" TEXT,
    "referral_type" TEXT NOT NULL DEFAULT 'inter_hospital',
    "urgency" TEXT NOT NULL DEFAULT 'routine',
    "reason" TEXT NOT NULL,
    "notes" TEXT,
    "icd_codes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "status" TEXT NOT NULL DEFAULT 'pending',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_inventory" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "drug_name" TEXT NOT NULL,
    "generic_name" TEXT,
    "strength" TEXT NOT NULL,
    "dosage_form" "DosageForm" NOT NULL DEFAULT 'tablet',
    "barcode" TEXT,
    "category" TEXT,
    "stock" INTEGER NOT NULL DEFAULT 0,
    "reorder_point" INTEGER NOT NULL DEFAULT 10,
    "unit_price" DECIMAL(10,2) NOT NULL,
    "cost_price" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "supplier" TEXT,
    "expiry_date" DATE,
    "requires_prescription" BOOLEAN NOT NULL DEFAULT true,
    "controlled" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pharmacy_inventory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_adjustments" (
    "id" UUID NOT NULL,
    "inventory_id" UUID NOT NULL,
    "adjustment" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "prescription_id" UUID,
    "adjusted_by" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_adjustments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "dispense_events" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "dispensed_by" UUID NOT NULL,
    "items_json" JSONB NOT NULL,
    "payment_method" TEXT,
    "copay" DECIMAL(10,2),
    "receipt_url" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "dispense_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "drug_interactions" (
    "id" UUID NOT NULL,
    "drug_a" TEXT NOT NULL,
    "drug_b" TEXT NOT NULL,
    "severity" "InteractionSeverity" NOT NULL,
    "note" TEXT NOT NULL,

    CONSTRAINT "drug_interactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "interaction_overrides" (
    "id" UUID NOT NULL,
    "prescription_id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "pharmacist_id" UUID NOT NULL,
    "drugs" TEXT[],
    "reason" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "interaction_overrides_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "pharmacy_invoices" (
    "id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pharmacy_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "patient_adherence_snapshots" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "pharmacy_id" UUID NOT NULL,
    "overall_rate" DECIMAL(5,2) NOT NULL,
    "medications" JSONB NOT NULL,
    "calculated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "patient_adherence_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "claims" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "provider_name" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "fraud_score" INTEGER NOT NULL DEFAULT 0,
    "pattern" TEXT,
    "status" "ClaimStatus" NOT NULL DEFAULT 'pending',
    "notes" TEXT,
    "investigated_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "claims_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "savings_records" (
    "id" UUID NOT NULL,
    "insurer_id" UUID,
    "patient_id" UUID NOT NULL,
    "test_type" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "first_test_date" DATE NOT NULL,
    "first_provider" TEXT NOT NULL,
    "attempted_date" DATE NOT NULL,
    "attempted_provider" TEXT NOT NULL,
    "prevention_method" TEXT NOT NULL,
    "savings" DECIMAL(12,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "savings_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "provider_risk_scores" (
    "id" UUID NOT NULL,
    "hospital_id" UUID,
    "provider_name" TEXT NOT NULL,
    "total_claims" INTEGER NOT NULL DEFAULT 0,
    "anomaly_score" INTEGER NOT NULL DEFAULT 0,
    "flagged_count" INTEGER NOT NULL DEFAULT 0,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "provider_risk_scores_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_alerts" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "severity" "AlertSeverity" NOT NULL,
    "category" "AlertCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "read_at" TIMESTAMP(3),

    CONSTRAINT "insurer_alerts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_invoices" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "period" TEXT NOT NULL,
    "gross_savings" DECIMAL(14,2) NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurer_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_contracts" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "start_date" TIMESTAMP(3) NOT NULL,
    "end_date" TIMESTAMP(3) NOT NULL,
    "fee_percentage" DECIMAL(5,2) NOT NULL,
    "terms" JSONB,
    "status" TEXT NOT NULL DEFAULT 'active',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "insurer_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_grants" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "grantee_type" "GranteeType" NOT NULL,
    "grantee_id" UUID NOT NULL,
    "scope" "AccessScope" NOT NULL DEFAULT 'full',
    "granted_by" UUID NOT NULL,
    "granted_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "last_accessed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "access_grants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "access_logs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "accessor_id" UUID NOT NULL,
    "grant_id" UUID,
    "action" "AccessAction" NOT NULL,
    "ip_address" TEXT,
    "user_agent" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "access_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "family_members" (
    "id" UUID NOT NULL,
    "primary_patient_id" UUID NOT NULL,
    "dependent_patient_id" UUID NOT NULL,
    "relationship" "FamilyRelationship" NOT NULL,
    "access_level" "FamilyAccessLevel" NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "family_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "disputes" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID,
    "pharmacy_id" UUID,
    "type" "DisputeType" NOT NULL,
    "description" TEXT NOT NULL,
    "priority" TEXT NOT NULL DEFAULT 'medium',
    "status" "DisputeStatus" NOT NULL DEFAULT 'open',
    "resolved_by" UUID,
    "resolution_notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "disputes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
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
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitations" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "organization_id" UUID,
    "token_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "accepted_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sync_queue" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "operation" "SyncOperation" NOT NULL,
    "resource_type" TEXT NOT NULL,
    "resource_data" JSONB NOT NULL,
    "status" "SyncStatus" NOT NULL DEFAULT 'pending',
    "retry_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sync_queue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_requests" (
    "id" UUID NOT NULL,
    "type" "OnboardingType" NOT NULL,
    "name" TEXT NOT NULL,
    "registration_ref" TEXT NOT NULL,
    "location" TEXT,
    "submitted_by_email" TEXT NOT NULL,
    "status" "OnboardingStatus" NOT NULL DEFAULT 'pending',
    "reviewed_by" UUID,
    "reviewed_at" TIMESTAMP(3),
    "reject_reason" TEXT,
    "organization_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "network_nodes" (
    "id" UUID NOT NULL,
    "city" TEXT NOT NULL,
    "country" TEXT NOT NULL,
    "hospitals" INTEGER NOT NULL DEFAULT 0,
    "pharmacies" INTEGER NOT NULL DEFAULT 0,
    "patients" INTEGER NOT NULL DEFAULT 0,
    "map_x" DOUBLE PRECISION NOT NULL,
    "map_y" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "network_nodes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feed" (
    "id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "actor" TEXT,
    "metadata" JSONB,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_feed_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_invoices" (
    "id" UUID NOT NULL,
    "customer_type" TEXT NOT NULL,
    "customer_id" UUID NOT NULL,
    "customer_name" TEXT NOT NULL,
    "period" TEXT NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "status" "InvoiceStatus" NOT NULL DEFAULT 'pending',
    "due_date" TIMESTAMP(3) NOT NULL,
    "paid_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "platform_invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "platform_settings" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" JSONB NOT NULL,

    CONSTRAINT "platform_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hourly_metrics" (
    "id" UUID NOT NULL,
    "hour" TIMESTAMP(3) NOT NULL,
    "scans" INTEGER NOT NULL DEFAULT 0,
    "scripts" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "hourly_metrics_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "revenue_snapshots" (
    "id" UUID NOT NULL,
    "month" TEXT NOT NULL,
    "insurers_revenue" DECIMAL(14,2) NOT NULL,
    "hospitals_revenue" DECIMAL(14,2) NOT NULL,
    "pharmacies_revenue" DECIMAL(14,2) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "revenue_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "file_assets" (
    "id" UUID NOT NULL,
    "owner_user_id" UUID,
    "resource_type" TEXT NOT NULL,
    "resource_id" UUID,
    "filename" TEXT NOT NULL,
    "mime_type" TEXT NOT NULL,
    "storage_path" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "file_assets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "hospital_id" UUID,
    "scheduled_at" TIMESTAMP(3) NOT NULL,
    "department" TEXT,
    "provider" TEXT,
    "notes" TEXT,
    "status" "AppointmentStatus" NOT NULL DEFAULT 'scheduled',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL,
    "phone" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "verified_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "emergency_contacts" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "relationship" TEXT NOT NULL,
    "is_primary" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "emergency_contacts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_deletion_requests" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "status" "DeletionRequestStatus" NOT NULL DEFAULT 'pending',
    "reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),

    CONSTRAINT "data_deletion_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "departments" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "head_staff_id" UUID,
    "sla_target_minutes" INTEGER NOT NULL DEFAULT 30,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "departments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_notifications" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "user_id" UUID,
    "type" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "read" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "hospital_notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "hospital_subscriptions" (
    "id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "plan" TEXT NOT NULL DEFAULT 'standard',
    "monthly_fee" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "scripts_used" INTEGER NOT NULL DEFAULT 0,
    "scripts_limit" INTEGER NOT NULL DEFAULT 1000,
    "status" TEXT NOT NULL DEFAULT 'active',
    "pilot_end_date" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "hospital_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_history" (
    "id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "title" TEXT NOT NULL,
    "format" TEXT NOT NULL,
    "download_url" TEXT NOT NULL,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "insurer_api_keys" (
    "id" UUID NOT NULL,
    "insurer_id" UUID NOT NULL,
    "label" TEXT NOT NULL,
    "key_prefix" TEXT NOT NULL,
    "key_hash" TEXT NOT NULL,
    "last_used_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revoked_at" TIMESTAMP(3),

    CONSTRAINT "insurer_api_keys_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "icd_codes" (
    "code" TEXT NOT NULL,
    "description" TEXT NOT NULL,

    CONSTRAINT "icd_codes_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "drug_catalog" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "generic_name" TEXT,
    "strength" TEXT,
    "dosage_form" TEXT,
    "category" TEXT,

    CONSTRAINT "drug_catalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "login_attempts" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMP(3),
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "login_attempts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "report_schedules" (
    "id" UUID NOT NULL,
    "owner_type" TEXT NOT NULL,
    "owner_id" UUID NOT NULL,
    "report_type" TEXT NOT NULL,
    "frequency" TEXT NOT NULL,
    "email" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "report_schedules_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ai_pending_clinical_actions" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "hospital_id" UUID NOT NULL,
    "action_type" "ClinicalSafetyActionType" NOT NULL,
    "action_item" TEXT NOT NULL,
    "current_complaint" TEXT,
    "request_payload_json" JSONB NOT NULL,
    "ai_response_json" JSONB NOT NULL,
    "status" "AiPendingClinicalActionStatus" NOT NULL DEFAULT 'PENDING',
    "override_reason" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ai_pending_clinical_actions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "clinical_safety_audit_logs" (
    "id" UUID NOT NULL,
    "patient_id" UUID NOT NULL,
    "doctor_id" UUID NOT NULL,
    "hospital_id" UUID,
    "attempted_action" JSONB NOT NULL,
    "ai_alert" JSONB NOT NULL,
    "final_decision" "ClinicalSafetyDecision" NOT NULL,
    "override_reason" TEXT,
    "pending_action_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "clinical_safety_audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "domain_events" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "processed_at" TIMESTAMP(3),
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "last_error" TEXT,

    CONSTRAINT "domain_events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "refresh_tokens_user_id_idx" ON "refresh_tokens"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "password_reset_tokens_token_hash_key" ON "password_reset_tokens"("token_hash");

-- CreateIndex
CREATE INDEX "auth_challenges_email_purpose_created_at_idx" ON "auth_challenges"("email", "purpose", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "patients_user_id_key" ON "patients"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "patients_national_id_key" ON "patients"("national_id");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_code_key" ON "hospitals"("code");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_registration_number_key" ON "hospitals"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "hospitals_email_domain_key" ON "hospitals"("email_domain");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_staff_user_id_key" ON "hospital_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_code_key" ON "pharmacies"("code");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacies_license_number_key" ON "pharmacies"("license_number");

-- CreateIndex
CREATE UNIQUE INDEX "pharmacy_staff_user_id_key" ON "pharmacy_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurers_code_key" ON "insurers"("code");

-- CreateIndex
CREATE UNIQUE INDEX "insurers_registration_number_key" ON "insurers"("registration_number");

-- CreateIndex
CREATE UNIQUE INDEX "insurer_staff_user_id_key" ON "insurer_staff"("user_id");

-- CreateIndex
CREATE UNIQUE INDEX "insurer_members_insurer_id_patient_id_key" ON "insurer_members"("insurer_id", "patient_id");

-- CreateIndex
CREATE INDEX "medical_records_patient_id_record_type_idx" ON "medical_records"("patient_id", "record_type");

-- CreateIndex
CREATE INDEX "visits_hospital_id_status_idx" ON "visits"("hospital_id", "status");

-- CreateIndex
CREATE INDEX "prescriptions_pharmacy_id_status_idx" ON "prescriptions"("pharmacy_id", "status");

-- CreateIndex
CREATE INDEX "pharmacy_inventory_pharmacy_id_idx" ON "pharmacy_inventory"("pharmacy_id");

-- CreateIndex
CREATE UNIQUE INDEX "drug_interactions_drug_a_drug_b_key" ON "drug_interactions"("drug_a", "drug_b");

-- CreateIndex
CREATE UNIQUE INDEX "patient_adherence_snapshots_patient_id_pharmacy_id_key" ON "patient_adherence_snapshots"("patient_id", "pharmacy_id");

-- CreateIndex
CREATE INDEX "claims_insurer_id_status_idx" ON "claims"("insurer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "family_members_primary_patient_id_dependent_patient_id_key" ON "family_members"("primary_patient_id", "dependent_patient_id");

-- CreateIndex
CREATE INDEX "audit_logs_organization_id_created_at_idx" ON "audit_logs"("organization_id", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "invitations_token_hash_key" ON "invitations"("token_hash");

-- CreateIndex
CREATE UNIQUE INDEX "network_nodes_city_country_key" ON "network_nodes"("city", "country");

-- CreateIndex
CREATE INDEX "activity_feed_created_at_idx" ON "activity_feed"("created_at");

-- CreateIndex
CREATE UNIQUE INDEX "platform_settings_key_key" ON "platform_settings"("key");

-- CreateIndex
CREATE UNIQUE INDEX "hourly_metrics_hour_key" ON "hourly_metrics"("hour");

-- CreateIndex
CREATE UNIQUE INDEX "revenue_snapshots_month_key" ON "revenue_snapshots"("month");

-- CreateIndex
CREATE INDEX "appointments_patient_id_scheduled_at_idx" ON "appointments"("patient_id", "scheduled_at");

-- CreateIndex
CREATE INDEX "otp_verifications_phone_idx" ON "otp_verifications"("phone");

-- CreateIndex
CREATE UNIQUE INDEX "departments_hospital_id_code_key" ON "departments"("hospital_id", "code");

-- CreateIndex
CREATE INDEX "hospital_notifications_hospital_id_read_idx" ON "hospital_notifications"("hospital_id", "read");

-- CreateIndex
CREATE UNIQUE INDEX "hospital_subscriptions_hospital_id_key" ON "hospital_subscriptions"("hospital_id");

-- CreateIndex
CREATE INDEX "report_history_owner_type_owner_id_idx" ON "report_history"("owner_type", "owner_id");

-- CreateIndex
CREATE INDEX "drug_catalog_name_idx" ON "drug_catalog"("name");

-- CreateIndex
CREATE UNIQUE INDEX "login_attempts_email_key" ON "login_attempts"("email");

-- CreateIndex
CREATE INDEX "ai_pending_clinical_actions_doctor_id_status_idx" ON "ai_pending_clinical_actions"("doctor_id", "status");

-- CreateIndex
CREATE INDEX "ai_pending_clinical_actions_patient_id_idx" ON "ai_pending_clinical_actions"("patient_id");

-- CreateIndex
CREATE INDEX "clinical_safety_audit_logs_patient_id_created_at_idx" ON "clinical_safety_audit_logs"("patient_id", "created_at");

-- CreateIndex
CREATE INDEX "domain_events_processed_at_created_at_idx" ON "domain_events"("processed_at", "created_at");

-- AddForeignKey
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "password_reset_tokens" ADD CONSTRAINT "password_reset_tokens_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "patients" ADD CONSTRAINT "patients_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_staff" ADD CONSTRAINT "hospital_staff_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_staff" ADD CONSTRAINT "hospital_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_staff" ADD CONSTRAINT "pharmacy_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_staff" ADD CONSTRAINT "insurer_staff_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_staff" ADD CONSTRAINT "insurer_staff_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_members" ADD CONSTRAINT "insurer_members_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_members" ADD CONSTRAINT "insurer_members_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "medical_records" ADD CONSTRAINT "medical_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "visits" ADD CONSTRAINT "visits_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescriptions" ADD CONSTRAINT "prescriptions_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "prescription_items" ADD CONSTRAINT "prescription_items_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "lab_orders" ADD CONSTRAINT "lab_orders_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_visit_id_fkey" FOREIGN KEY ("visit_id") REFERENCES "visits"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_from_hospital_id_fkey" FOREIGN KEY ("from_hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "referrals" ADD CONSTRAINT "referrals_to_hospital_id_fkey" FOREIGN KEY ("to_hospital_id") REFERENCES "hospitals"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_inventory" ADD CONSTRAINT "pharmacy_inventory_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_adjustments" ADD CONSTRAINT "inventory_adjustments_inventory_id_fkey" FOREIGN KEY ("inventory_id") REFERENCES "pharmacy_inventory"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispense_events" ADD CONSTRAINT "dispense_events_prescription_id_fkey" FOREIGN KEY ("prescription_id") REFERENCES "prescriptions"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "dispense_events" ADD CONSTRAINT "dispense_events_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "interaction_overrides" ADD CONSTRAINT "interaction_overrides_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "pharmacy_invoices" ADD CONSTRAINT "pharmacy_invoices_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "claims" ADD CONSTRAINT "claims_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_records" ADD CONSTRAINT "savings_records_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "savings_records" ADD CONSTRAINT "savings_records_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "provider_risk_scores" ADD CONSTRAINT "provider_risk_scores_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_alerts" ADD CONSTRAINT "insurer_alerts_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_invoices" ADD CONSTRAINT "insurer_invoices_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_contracts" ADD CONSTRAINT "insurer_contracts_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_grants" ADD CONSTRAINT "access_grants_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_accessor_id_fkey" FOREIGN KEY ("accessor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_grant_id_fkey" FOREIGN KEY ("grant_id") REFERENCES "access_grants"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_primary_patient_id_fkey" FOREIGN KEY ("primary_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "family_members" ADD CONSTRAINT "family_members_dependent_patient_id_fkey" FOREIGN KEY ("dependent_patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "disputes" ADD CONSTRAINT "disputes_pharmacy_id_fkey" FOREIGN KEY ("pharmacy_id") REFERENCES "pharmacies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sync_queue" ADD CONSTRAINT "sync_queue_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "emergency_contacts" ADD CONSTRAINT "emergency_contacts_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_deletion_requests" ADD CONSTRAINT "data_deletion_requests_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "departments" ADD CONSTRAINT "departments_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_notifications" ADD CONSTRAINT "hospital_notifications_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "hospital_subscriptions" ADD CONSTRAINT "hospital_subscriptions_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "insurer_api_keys" ADD CONSTRAINT "insurer_api_keys_insurer_id_fkey" FOREIGN KEY ("insurer_id") REFERENCES "insurers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pending_clinical_actions" ADD CONSTRAINT "ai_pending_clinical_actions_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pending_clinical_actions" ADD CONSTRAINT "ai_pending_clinical_actions_doctor_id_fkey" FOREIGN KEY ("doctor_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ai_pending_clinical_actions" ADD CONSTRAINT "ai_pending_clinical_actions_hospital_id_fkey" FOREIGN KEY ("hospital_id") REFERENCES "hospitals"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "clinical_safety_audit_logs" ADD CONSTRAINT "clinical_safety_audit_logs_pending_action_id_fkey" FOREIGN KEY ("pending_action_id") REFERENCES "ai_pending_clinical_actions"("id") ON DELETE SET NULL ON UPDATE CASCADE;

