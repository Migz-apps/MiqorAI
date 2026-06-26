import {
  AccessAction,
  AccessScope,
  AppointmentStatus,
  ClaimStatus,
  FamilyAccessLevel,
  FamilyRelationship,
  GranteeType,
  HospitalStaffRole,
  InsurerStaffRole,
  LabOrderStatus,
  PharmacyStaffRole,
  PrescriptionStatus,
  RecordType,
  UserRole,
  VisitStatus,
} from "@prisma/client";
import { randomUUID } from "crypto";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/utils/crypto.js";
import { regeneratePatientQr } from "../src/services/qr.service.js";
import {
  emailDomain,
  parseBool,
  parseLooseJson,
  parseOptionalDate,
  parseRequiredDate,
  readCsv,
} from "./csv-utils.js";

const PASSWORD = "MiqorAI123!";
const passwordHash = hashPassword(PASSWORD);

const ids = new Map<string, string>();
function idFor(seedKey: string): string {
  if (!ids.has(seedKey)) ids.set(seedKey, randomUUID());
  return ids.get(seedKey)!;
}

function mapUserRole(csvRole: string, staffRole?: string): UserRole {
  switch (csvRole) {
    case "patient":
      return UserRole.patient;
    case "doctor":
    case "nurse":
    case "lab_technician":
      return UserRole.hospital_staff;
    case "pharmacist":
      return UserRole.pharmacy_staff;
    case "admin":
      return staffRole === "admin" ? UserRole.hospital_admin : UserRole.hospital_staff;
    default:
      throw new Error(`Unsupported user role: ${csvRole}`);
  }
}

function mapHospitalStaffRole(role: string): HospitalStaffRole {
  switch (role) {
    case "doctor":
      return HospitalStaffRole.doctor;
    case "nurse":
      return HospitalStaffRole.nurse;
    case "admin":
      return HospitalStaffRole.admin;
    case "lab_technician":
      return HospitalStaffRole.nurse;
    default:
      return HospitalStaffRole.receptionist;
  }
}

function mapVisitStatus(value: string): VisitStatus {
  switch (value) {
    case "completed":
      return VisitStatus.completed;
    case "waiting":
      return VisitStatus.waiting;
    case "with_nurse":
      return VisitStatus.with_nurse;
    case "with_doctor":
      return VisitStatus.with_doctor;
    case "no_show":
      return VisitStatus.no_show;
    default:
      return VisitStatus.waiting;
  }
}

function mapPrescriptionStatus(value: string): PrescriptionStatus {
  switch (value) {
    case "dispensed":
      return PrescriptionStatus.dispensed;
    case "verified":
      return PrescriptionStatus.verified;
    case "ready":
      return PrescriptionStatus.ready;
    case "held":
      return PrescriptionStatus.held;
    case "rejected":
      return PrescriptionStatus.rejected;
    case "sent_to_pharmacy":
      return PrescriptionStatus.sent_to_pharmacy;
    case "picked_up":
      return PrescriptionStatus.picked_up;
    case "expired":
      return PrescriptionStatus.expired;
    default:
      return PrescriptionStatus.pending;
  }
}

function mapLabStatus(value: string): LabOrderStatus {
  switch (value) {
    case "completed":
      return LabOrderStatus.completed;
    case "in_progress":
      return LabOrderStatus.in_progress;
    case "cancelled":
      return LabOrderStatus.cancelled;
    default:
      return LabOrderStatus.ordered;
  }
}

function mapClaimStatus(value: string): ClaimStatus {
  switch (value) {
    case "approved":
      return ClaimStatus.cleared;
    case "under_review":
      return ClaimStatus.investigating;
    case "flagged":
      return ClaimStatus.flagged;
    case "confirmed":
      return ClaimStatus.confirmed;
    case "rejected":
      return ClaimStatus.flagged;
    case "submitted":
      return ClaimStatus.pending;
    case "cleared":
      return ClaimStatus.cleared;
    default:
      return ClaimStatus.pending;
  }
}

function mapAppointmentStatus(value: string): AppointmentStatus {
  switch (value) {
    case "completed":
      return AppointmentStatus.completed;
    case "cancelled":
      return AppointmentStatus.cancelled;
    case "no_show":
      return AppointmentStatus.no_show;
    case "confirmed":
    case "scheduled":
    default:
      return AppointmentStatus.scheduled;
  }
}

function mapAccessAction(value: string): AccessAction {
  switch (value) {
    case "add_record":
      return AccessAction.add_record;
    case "view_visit":
      return AccessAction.view_visit;
    case "view_lab":
      return AccessAction.view_lab;
    case "view_prescription":
      return AccessAction.view_prescription;
    case "dispense":
      return AccessAction.dispense;
    case "scan_qr":
      return AccessAction.scan_qr;
    default:
      return AccessAction.view_records;
  }
}

function mapGranteeType(value: string): GranteeType {
  switch (value) {
    case "pharmacy":
      return GranteeType.pharmacy;
    case "doctor":
      return GranteeType.doctor;
    default:
      return GranteeType.hospital;
  }
}

function mapAccessScope(value: string): AccessScope {
  switch (value) {
    case "lab_results":
      return AccessScope.lab_results;
    case "medications":
      return AccessScope.medications;
    case "emergency_only":
      return AccessScope.emergency_only;
    default:
      return AccessScope.full;
  }
}

function mapFamilyRelationship(value: string): FamilyRelationship {
  switch (value) {
    case "parent":
      return FamilyRelationship.parent;
    case "spouse":
      return FamilyRelationship.spouse;
    case "sibling":
      return FamilyRelationship.sibling;
    case "other":
      return FamilyRelationship.other;
    default:
      return FamilyRelationship.child;
  }
}

function mapFamilyAccessLevel(value: string): FamilyAccessLevel {
  switch (value) {
    case "caregiver_only":
      return FamilyAccessLevel.caregiver_only;
    case "read_only":
      return FamilyAccessLevel.read_only;
    default:
      return FamilyAccessLevel.full;
  }
}

function mapRecordType(value: string): RecordType {
  switch (value) {
    case "diagnosis":
      return RecordType.diagnosis;
    case "medication":
      return RecordType.medication;
    case "lab_result":
      return RecordType.lab_result;
    case "immunization":
      return RecordType.immunization;
    case "procedure":
      return RecordType.procedure;
    case "visit":
      return RecordType.visit;
    default:
      return RecordType.allergy;
  }
}

function resolveGranteeId(granteeType: string, granteeSeedId: string): string {
  if (granteeType === "doctor") return idFor(granteeSeedId);
  if (granteeType === "hospital") return idFor(granteeSeedId);
  if (granteeType === "pharmacy") return idFor(granteeSeedId);
  return idFor(granteeSeedId);
}

function resolveAccessorId(accessorSeedId: string, accessorType: string): string {
  if (accessorSeedId.startsWith("USR")) return idFor(accessorSeedId);
  if (accessorSeedId.startsWith("PHARM")) return idFor("USR023");
  if (accessorSeedId === "HOSP001") return idFor("USR017");
  if (accessorSeedId === "HOSP002") return idFor("USR018");
  if (accessorType === "pharmacy") return idFor("USR023");
  if (accessorType === "hospital") return idFor("USR017");
  return idFor("USR017");
}

async function clearDatabase() {
  await prisma.$transaction([
    prisma.inventoryAdjustment.deleteMany(),
    prisma.dispenseEvent.deleteMany(),
    prisma.interactionOverride.deleteMany(),
    prisma.prescriptionItem.deleteMany(),
    prisma.prescription.deleteMany(),
    prisma.labOrder.deleteMany(),
    prisma.visit.deleteMany(),
    prisma.referral.deleteMany(),
    prisma.medicalRecord.deleteMany(),
    prisma.accessLog.deleteMany(),
    prisma.accessGrant.deleteMany(),
    prisma.familyMember.deleteMany(),
    prisma.claim.deleteMany(),
    prisma.savingsRecord.deleteMany(),
    prisma.insurerMember.deleteMany(),
    prisma.insurerAlert.deleteMany(),
    prisma.insurerInvoice.deleteMany(),
    prisma.insurerContract.deleteMany(),
    prisma.pharmacyInvoice.deleteMany(),
    prisma.patientAdherenceSnapshot.deleteMany(),
    prisma.pharmacyInventory.deleteMany(),
    prisma.providerRiskScore.deleteMany(),
    prisma.dispute.deleteMany(),
    prisma.activityFeedEntry.deleteMany(),
    prisma.hourlyMetric.deleteMany(),
    prisma.revenueSnapshot.deleteMany(),
    prisma.platformInvoice.deleteMany(),
    prisma.onboardingRequest.deleteMany(),
    prisma.networkNode.deleteMany(),
    prisma.platformSetting.deleteMany(),
    prisma.syncQueue.deleteMany(),
    prisma.invitation.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.otpVerification.deleteMany(),
    prisma.emergencyContact.deleteMany(),
    prisma.dataDeletionRequest.deleteMany(),
    prisma.department.deleteMany(),
    prisma.hospitalNotification.deleteMany(),
    prisma.hospitalSubscription.deleteMany(),
    prisma.reportHistory.deleteMany(),
    prisma.insurerApiKey.deleteMany(),
    prisma.icdCode.deleteMany(),
    prisma.drugCatalog.deleteMany(),
    prisma.loginAttempt.deleteMany(),
    prisma.reportSchedule.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.refreshToken.deleteMany(),
    prisma.passwordResetToken.deleteMany(),
    prisma.hospitalStaff.deleteMany(),
    prisma.pharmacyStaff.deleteMany(),
    prisma.insurerStaff.deleteMany(),
    prisma.patient.deleteMany(),
    prisma.hospital.deleteMany(),
    prisma.pharmacy.deleteMany(),
    prisma.insurer.deleteMany(),
    prisma.user.deleteMany(),
    prisma.drugInteraction.deleteMany(),
  ]);
}

async function seedOrganizations() {
  const rows = readCsv("organizations.csv");
  const superAdminId = idFor("SUPER_ADMIN");

  await prisma.user.create({
    data: {
      id: superAdminId,
      email: "admin@miqorai.com",
      passwordHash,
      role: UserRole.super_admin,
      displayName: "MiqorAI Platform Admin",
      organizationType: "none",
      isActive: true,
    },
  });

  for (const row of rows) {
    const orgId = idFor(row.organization_id!);
    const orgType = row.organization_type!;
    if (orgType === "hospital") {
      await prisma.hospital.create({
        data: {
          id: orgId,
          code: row.code!,
          name: row.name!,
          registrationNumber: row.license_number!,
          emailDomain: emailDomain(row.email!),
          address: row.address,
          city: row.city,
          country: row.country,
          phone: row.phone,
          verified: true,
          verifiedBy: superAdminId,
          verifiedAt: parseOptionalDate(row.created_at) ?? new Date(),
          isActive: row.status === "active",
        },
      });
      await prisma.department.createMany({
        data: [
          { hospitalId: orgId, name: "General Medicine", code: "GEN", slaTargetMinutes: 30 },
          { hospitalId: orgId, name: "Cardiology", code: "CARD", slaTargetMinutes: 45 },
          { hospitalId: orgId, name: "Emergency", code: "ER", slaTargetMinutes: 15 },
          { hospitalId: orgId, name: "Laboratory", code: "LAB", slaTargetMinutes: 20 },
        ],
      });
    } else if (orgType === "pharmacy") {
      await prisma.pharmacy.create({
        data: {
          id: orgId,
          code: row.code!,
          name: row.name!,
          licenseNumber: row.license_number!,
          address: row.address,
          city: row.city,
          country: row.country,
          phone: row.phone,
          verified: true,
          verifiedBy: superAdminId,
          verifiedAt: parseOptionalDate(row.created_at) ?? new Date(),
          isActive: row.status === "active",
        },
      });
    } else if (orgType === "insurer") {
      await prisma.insurer.create({
        data: {
          id: orgId,
          code: row.code!,
          name: row.name!,
          registrationNumber: row.license_number!,
          address: row.address,
          city: row.city,
          country: row.country,
          phone: row.phone,
          isActive: row.status === "active",
        },
      });
    }
  }

  const insurerId = idFor("INS001");
  const insurerStaffUserId = idFor("INSURER_STAFF");
  await prisma.user.create({
    data: {
      id: insurerStaffUserId,
      email: "claims.reviewer@nhidemo.demo",
      phone: "+250788100099",
      passwordHash,
      role: UserRole.insurer_admin,
      displayName: "Claims Reviewer",
      organizationId: insurerId,
      organizationType: "insurer",
      isActive: true,
    },
  });
  await prisma.insurerStaff.create({
    data: {
      insurerId,
      userId: insurerStaffUserId,
      role: InsurerStaffRole.admin,
      isActive: true,
    },
  });
}

async function seedUsersAndPatients() {
  const staffRows = readCsv("staff_users.csv");
  const staffByUserId = new Map(staffRows.map((row) => [row.user_id!, row]));
  const userRows = readCsv("users.csv");

  for (const row of userRows) {
    const userId = idFor(row.user_id!);
    const staff = staffByUserId.get(row.user_id!);
    const csvRole = row.role!;
    const userRole = mapUserRole(csvRole, staff?.role);

    let organizationId: string | undefined;
    let organizationType: string | undefined;
    if (staff?.organization_id) {
      const orgType = staff.organization_id.startsWith("HOSP")
        ? "hospital"
        : staff.organization_id.startsWith("PHARM")
          ? "pharmacy"
          : staff.organization_id.startsWith("LAB")
            ? "hospital"
            : undefined;
      if (orgType === "hospital") {
        organizationId = idFor(staff.organization_id.startsWith("LAB") ? "HOSP001" : staff.organization_id);
        organizationType = "hospital";
      } else if (orgType === "pharmacy") {
        organizationId = idFor(staff.organization_id);
        organizationType = "pharmacy";
      }
    }

    await prisma.user.create({
      data: {
        id: userId,
        email: row.email!.toLowerCase(),
        phone: row.phone || null,
        passwordHash,
        role: userRole,
        displayName: row.display_name,
        organizationId,
        organizationType,
        isActive: parseBool(row.is_active),
      },
    });

    if (staff) {
      if (organizationType === "hospital") {
        await prisma.hospitalStaff.create({
          data: {
            hospitalId: organizationId!,
            userId,
            role: mapHospitalStaffRole(staff.role!),
            department: staff.department,
            isActive: staff.status === "active",
          },
        });
      } else if (organizationType === "pharmacy") {
        await prisma.pharmacyStaff.create({
          data: {
            pharmacyId: organizationId!,
            userId,
            role:
              staff.role === "pharmacist"
                ? PharmacyStaffRole.pharmacist
                : PharmacyStaffRole.manager,
            isActive: staff.status === "active",
          },
        });
      }
    }
  }

  const patientRows = readCsv("patients.csv");
  for (const row of patientRows) {
    await prisma.patient.create({
      data: {
        id: idFor(row.patient_id!),
        userId: idFor(row.user_id!),
        firstName: row.first_name!,
        lastName: row.last_name!,
        nationalId: row.national_id || null,
        insuranceId: row.insurance_id || null,
        dateOfBirth: parseRequiredDate(row.date_of_birth, row.patient_id!),
        gender: row.gender || null,
        bloodType: row.blood_type || null,
        emergencyContactName: row.emergency_contact_name || null,
        emergencyContactPhone: row.emergency_contact_phone || null,
        recoveryPhraseEnc: row.recovery_phrase_enc || null,
        qrCodeHash: row.qr_code_hash || null,
        qrVersion: Number(row.qr_version || "0"),
        isActive: parseBool(row.is_active),
      },
    });
  }

  for (const row of readCsv("emergency_contacts.csv")) {
    await prisma.emergencyContact.create({
      data: {
        patientId: idFor(row.patient_id!),
        name: row.name!,
        phone: row.phone!,
        relationship: row.relationship!,
        isPrimary: parseBool(row.is_primary),
      },
    });
  }

  for (const row of readCsv("family_members.csv")) {
    await prisma.familyMember.create({
      data: {
        primaryPatientId: idFor(row.primary_patient_id!),
        dependentPatientId: idFor(row.dependent_patient_id!),
        relationship: mapFamilyRelationship(row.relationship!),
        accessLevel: mapFamilyAccessLevel(row.access_level!),
        isActive: parseBool(row.is_active),
      },
    });
  }

  await regeneratePatientQr(idFor("PAT001"));
}

async function seedClinicalAndInsuranceData() {
  for (const row of readCsv("medical-records.csv")) {
    await prisma.medicalRecord.create({
      data: {
        id: idFor(row.record_id!),
        patientId: idFor(row.patient_id!),
        hospitalId: row.hospital_id ? idFor(row.hospital_id) : null,
        recordType: mapRecordType(row.record_type!),
        data: parseLooseJson(row.data, row.record_id!) as object,
        recordedBy: idFor(row.recorded_by!),
        recordedAt: parseRequiredDate(row.recorded_at, row.record_id!),
        isActive: parseBool(row.is_active),
      },
    });
  }

  for (const row of readCsv("visits.csv")) {
    await prisma.visit.create({
      data: {
        id: idFor(row.visit_id!),
        patientId: idFor(row.patient_id!),
        hospitalId: idFor(row.hospital_id!),
        department: row.department!,
        visitType: row.visit_type || "consultation",
        reason: row.reason || null,
        priority: row.priority || "normal",
        vitals: parseLooseJson(row.vitals, row.visit_id!) as object,
        diagnosisCodes: (parseLooseJson(row.diagnosis_codes, row.visit_id!) as string[]) ?? [],
        notes: row.notes || null,
        checkedInAt: parseRequiredDate(row.checked_in_at, row.visit_id!),
        checkedOutAt: parseOptionalDate(row.checked_out_at),
        assignedStaffId: row.assigned_staff_id ? idFor(row.assigned_staff_id) : null,
        recordedBy: idFor(row.recorded_by!),
        status: mapVisitStatus(row.status!),
      },
    });
  }

  for (const row of readCsv("prescriptions.csv")) {
    await prisma.prescription.create({
      data: {
        id: idFor(row.prescription_id!),
        patientId: idFor(row.patient_id!),
        visitId: row.visit_id ? idFor(row.visit_id) : null,
        hospitalId: row.hospital_id ? idFor(row.hospital_id) : null,
        pharmacyId: row.pharmacy_id ? idFor(row.pharmacy_id) : null,
        diagnosis: row.diagnosis || null,
        notes: row.notes || null,
        insuranceProvider: row.insurance_provider || null,
        insuranceMember: row.insurance_member || null,
        prescribedBy: idFor(row.prescribed_by!),
        prescribedAt: parseRequiredDate(row.created_at, row.prescription_id!),
        pharmacyReceivedAt: parseOptionalDate(row.verified_at),
        dispensedAt: parseOptionalDate(row.dispensed_at),
        status: mapPrescriptionStatus(row.status!),
        totalAmount: row.total_amount || "0",
      },
    });
  }

  for (const row of readCsv("lab-orders.csv")) {
    await prisma.labOrder.create({
      data: {
        id: idFor(row.lab_order_id!),
        patientId: idFor(row.patient_id!),
        visitId: row.visit_id ? idFor(row.visit_id) : null,
        hospitalId: idFor(row.hospital_id!),
        testName: row.test_name!,
        testCode: row.test_code || null,
        orderedBy: idFor(row.ordered_by!),
        orderedAt: parseRequiredDate(row.ordered_at, row.lab_order_id!),
        results: parseLooseJson(row.results, row.lab_order_id!) as object,
        resultsAvailableAt: parseOptionalDate(row.completed_at),
        status: mapLabStatus(row.status!),
      },
    });
  }

  for (const row of readCsv("appointments.csv")) {
    await prisma.appointment.create({
      data: {
        id: idFor(row.appointment_id!),
        patientId: idFor(row.patient_id!),
        hospitalId: row.hospital_id ? idFor(row.hospital_id) : null,
        scheduledAt: parseRequiredDate(row.scheduled_at, row.appointment_id!),
        department: row.department || null,
        provider: row.provider || null,
        notes: row.notes || null,
        status: mapAppointmentStatus(row.status!),
      },
    });
  }

  for (const row of readCsv("insurer_members.csv")) {
    await prisma.insurerMember.create({
      data: {
        id: idFor(row.member_id!),
        insurerId: idFor(row.insurer_id!),
        patientId: idFor(row.patient_id!),
        memberNumber: row.member_number!,
        isActive: row.status === "active",
      },
    });
  }

  for (const row of readCsv("claims.csv")) {
    await prisma.claim.create({
      data: {
        id: idFor(row.claim_id!),
        insurerId: idFor("INS001"),
        patientId: idFor(row.patient_id!),
        providerName: row.provider_name!,
        amount: row.amount_claimed || "0",
        fraudScore: Math.min(100, Math.round(Number(row.fraud_score || "0") * 10)),
        pattern: row.fraud_pattern || null,
        status: mapClaimStatus(row.status!),
        notes: row.notes || null,
        createdAt: parseRequiredDate(row.submitted_at, row.claim_id!),
      },
    });
  }

  const pharmacyId = idFor("PHARM001");
  for (const row of readCsv("patients_adherence_snapshots.csv")) {
    await prisma.patientAdherenceSnapshot.create({
      data: {
        id: idFor(row.snapshot_id!),
        patientId: idFor(row.patient_id!),
        pharmacyId,
        overallRate: row.overall_rate || "0",
        medications: parseLooseJson(row.medications, row.snapshot_id!) as object,
        calculatedAt: parseRequiredDate(row.calculated_at, row.snapshot_id!),
      },
    });
  }

  for (const row of readCsv("savings_record.csv")) {
    await prisma.savingsRecord.create({
      data: {
        id: idFor(row.saving_id!),
        insurerId: idFor(row.insurer_id!),
        patientId: idFor(row.patient_id!),
        testType: row.test_type!,
        category: row.reason || "duplicate_test",
        firstTestDate: parseRequiredDate(row.recorded_at, row.saving_id!),
        firstProvider: row.first_provider!,
        attemptedDate: parseRequiredDate(row.recorded_at, row.saving_id!),
        attemptedProvider: row.attempted_provider!,
        preventionMethod: row.ai_recommendation || row.reason || "duplicate_prevention",
        savings: row.savings_amount || row.avoided_cost || "0",
      },
    });
  }

  for (const row of readCsv("access_grants.csv")) {
    await prisma.accessGrant.create({
      data: {
        id: idFor(row.grant_id!),
        patientId: idFor(row.patient_id!),
        granteeType: mapGranteeType(row.grantee_type!),
        granteeId: resolveGranteeId(row.grantee_type!, row.grantee_id!),
        scope: mapAccessScope(row.scope!),
        grantedBy: idFor(row.granted_by!),
        grantedAt: parseRequiredDate(row.granted_at, row.grant_id!),
        expiresAt: parseRequiredDate(row.expires_at, row.grant_id!),
        isActive: parseBool(row.is_active),
      },
    });
  }

  for (const row of readCsv("access_logs.csv")) {
    await prisma.accessLog.create({
      data: {
        id: idFor(row.access_log_id!),
        patientId: idFor(row.patient_id!),
        accessorId: resolveAccessorId(row.accessor_id!, row.accessor_type || "doctor"),
        grantId: row.grant_id ? idFor(row.grant_id) : null,
        action: mapAccessAction(row.action!),
        ipAddress: row.ip_address || null,
        userAgent: row.user_agent || row.device || null,
        createdAt: parseRequiredDate(row.accessed_at, row.access_log_id!),
      },
    });
  }

  await prisma.platformSetting.createMany({
    data: [
      { key: "default_pilot_duration_days", value: 90 },
      { key: "savings_fee_percentage", value: 20 },
      { key: "invitation_expiry_days", value: 7 },
    ],
  });

  await prisma.pharmacyInventory.createMany({
    data: [
      {
        pharmacyId,
        drugName: "Amlodipine",
        genericName: "Amlodipine",
        strength: "5mg",
        stock: 120,
        unitPrice: "5.50",
        costPrice: "3.20",
        category: "Cardiovascular",
      },
      {
        pharmacyId,
        drugName: "Metformin",
        genericName: "Metformin",
        strength: "500mg",
        stock: 200,
        unitPrice: "4.25",
        costPrice: "2.10",
        category: "Diabetes",
      },
    ],
  });

  await prisma.onboardingRequest.create({
    data: {
      type: "hospital",
      name: "Lakeview Community Hospital",
      registrationRef: "HSP-RW-PENDING-001",
      location: "Kigali, Rwanda",
      submittedByEmail: "onboarding@lakeview.demo",
      status: "pending",
    },
  });
}

async function main() {
  console.log("Seeding MiqorAI database from /seed_data CSV files...");
  await clearDatabase();
  await seedOrganizations();
  await seedUsersAndPatients();
  await seedClinicalAndInsuranceData();
  console.log("Seed complete.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
