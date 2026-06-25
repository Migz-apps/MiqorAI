import {
  DosageForm,
  HospitalStaffRole,
  InsurerStaffRole,
  PharmacyStaffRole,
  UserRole,
} from "@prisma/client";
import { prisma } from "../src/lib/prisma.js";
import { hashPassword } from "../src/utils/crypto.js";
import { regeneratePatientQr } from "../src/services/qr.service.js";

const PASSWORD = "MiqorAI123!";

async function main() {
  console.log("Seeding MiqorAI database...");

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

  const admin = await prisma.user.create({
    data: {
      email: "admin@miqorai.com",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.super_admin,
      organizationType: "none",
    },
  });

  const hospital = await prisma.hospital.create({
    data: {
      code: "MP-LAGOS-001",
      name: "St. Catherine General Hospital",
      registrationNumber: "MOH-2024-0892",
      emailDomain: "stcatherine.med",
      address: "Lagos, Nigeria",
      city: "Lagos",
      country: "Nigeria",
      phone: "+234800000001",
      verified: true,
      verifiedBy: admin.id,
      verifiedAt: new Date(),
      pilotEndDate: new Date(Date.now() + 90 * 86400000),
    },
  });

  const hospitalAdmin = await prisma.user.create({
    data: {
      email: "tunde@stcatherine.med",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.hospital_admin,
      organizationId: hospital.id,
      organizationType: "hospital",
      displayName: "Tunde Adeyemi",
    },
  });

  const hospitalDoctor = await prisma.user.create({
    data: {
      email: "amara@stcatherine.med",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.hospital_staff,
      organizationId: hospital.id,
      organizationType: "hospital",
      displayName: "Dr. Amara Eze",
    },
  });

  async function addHospitalStaff(
    email: string,
    displayName: string,
    role: HospitalStaffRole,
    department?: string,
  ) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(PASSWORD),
        role: UserRole.hospital_staff,
        organizationId: hospital.id,
        organizationType: "hospital",
        displayName,
      },
    });
    await prisma.hospitalStaff.create({
      data: { hospitalId: hospital.id, userId: user.id, role, department },
    });
    return user;
  }

  await prisma.hospitalStaff.createMany({
    data: [
      { hospitalId: hospital.id, userId: hospitalAdmin.id, role: HospitalStaffRole.admin },
      { hospitalId: hospital.id, userId: hospitalDoctor.id, role: HospitalStaffRole.doctor, department: "General" },
    ],
  });

  await addHospitalStaff("adaeze@stcatherine.med", "Adaeze Okafor", HospitalStaffRole.receptionist, "General");
  await addHospitalStaff("joseph@stcatherine.med", "Joseph Mensah", HospitalStaffRole.nurse, "General");
  await addHospitalStaff("ibrahim@stcatherine.med", "Dr. Ibrahim Musa", HospitalStaffRole.doctor, "Cardiology");
  const chikaUser = await addHospitalStaff("chika@stcatherine.med", "Dr. Chika Nwosu", HospitalStaffRole.dept_head, "Cardiology");
  const chikaStaff = await prisma.hospitalStaff.findFirst({ where: { userId: chikaUser.id } });

  await prisma.department.createMany({
    data: [
      { hospitalId: hospital.id, name: "General", code: "GEN", slaTargetMinutes: 30, isActive: true },
      { hospitalId: hospital.id, name: "Cardiology", code: "CARD", headStaffId: chikaStaff?.id, slaTargetMinutes: 45, isActive: true },
      { hospitalId: hospital.id, name: "Pediatrics", code: "PED", slaTargetMinutes: 25, isActive: true },
      { hospitalId: hospital.id, name: "Emergency", code: "ER", slaTargetMinutes: 15, isActive: true },
      { hospitalId: hospital.id, name: "Maternity", code: "MAT", slaTargetMinutes: 35, isActive: true },
      { hospitalId: hospital.id, name: "Lab", code: "LAB", slaTargetMinutes: 20, isActive: true },
    ],
  });

  const pharmacy = await prisma.pharmacy.create({
    data: {
      code: "MPC-GOODLIFE-001",
      name: "GoodLife Pharmacy — Westlands",
      licenseNumber: "PC-2023-1140",
      address: "Waiyaki Way, Nairobi",
      city: "Nairobi",
      country: "Kenya",
      phone: "+254711000000",
      verified: true,
      verifiedBy: admin.id,
      verifiedAt: new Date(),
    },
  });

  const pharmacyManager = await prisma.user.create({
    data: {
      email: "wanjiku@goodlife.co.ke",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.pharmacy_manager,
      organizationId: pharmacy.id,
      organizationType: "pharmacy",
      displayName: "Wanjiku Mwangi",
    },
  });

  const pharmacyStaff = await prisma.user.create({
    data: {
      email: "brian@goodlife.co.ke",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.pharmacy_staff,
      organizationId: pharmacy.id,
      organizationType: "pharmacy",
      displayName: "Brian Otieno",
    },
  });

  async function addPharmacyStaff(email: string, displayName: string, role: PharmacyStaffRole) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(PASSWORD),
        role: role === PharmacyStaffRole.manager ? UserRole.pharmacy_manager : UserRole.pharmacy_staff,
        organizationId: pharmacy.id,
        organizationType: "pharmacy",
        displayName,
      },
    });
    await prisma.pharmacyStaff.create({ data: { pharmacyId: pharmacy.id, userId: user.id, role } });
  }

  await prisma.pharmacyStaff.createMany({
    data: [
      { pharmacyId: pharmacy.id, userId: pharmacyManager.id, role: PharmacyStaffRole.manager },
      { pharmacyId: pharmacy.id, userId: pharmacyStaff.id, role: PharmacyStaffRole.pharmacist },
    ],
  });

  await addPharmacyStaff("aisha@goodlife.co.ke", "Aisha Hassan", PharmacyStaffRole.pharmacist);
  await addPharmacyStaff("david@goodlife.co.ke", "David Kamau", PharmacyStaffRole.technician);
  await addPharmacyStaff("grace@goodlife.co.ke", "Grace Njeri", PharmacyStaffRole.cashier);

  const insurer = await prisma.insurer.create({
    data: {
      code: "JUBILEE_001",
      name: "Jubilee Insurance",
      registrationNumber: "INS-JUB-001",
      country: "Kenya",
      currency: "KES",
      memberCount: 3,
      feePercentage: 20,
      contractStartDate: new Date("2025-01-01"),
      contractEndDate: new Date("2027-12-31"),
    },
  });

  const insurerAdmin = await prisma.user.create({
    data: {
      email: "fatima@jubilee.co.ke",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.insurer_admin,
      organizationId: insurer.id,
      organizationType: "insurer",
      displayName: "Fatima Hassan",
    },
  });

  async function addInsurerStaff(email: string, displayName: string, role: InsurerStaffRole) {
    const user = await prisma.user.create({
      data: {
        email,
        passwordHash: hashPassword(PASSWORD),
        role: role === InsurerStaffRole.admin ? UserRole.insurer_admin : UserRole.insurer_analyst,
        organizationId: insurer.id,
        organizationType: "insurer",
        displayName,
      },
    });
    await prisma.insurerStaff.create({ data: { insurerId: insurer.id, userId: user.id, role } });
  }

  await prisma.insurerStaff.create({
    data: { insurerId: insurer.id, userId: insurerAdmin.id, role: InsurerStaffRole.admin },
  });

  await addInsurerStaff("wanjiku@jubilee.co.ke", "Wanjiku Mwangi", InsurerStaffRole.analyst);
  await addInsurerStaff("brian@jubilee.co.ke", "Brian Otieno", InsurerStaffRole.fraud_investigator);
  await addInsurerStaff("grace@jubilee.co.ke", "Grace Kamau", InsurerStaffRole.contracts_manager);
  await addInsurerStaff("daniel@jubilee.co.ke", "Daniel Njoroge", InsurerStaffRole.executive);

  await prisma.insurerContract.create({
    data: {
      insurerId: insurer.id,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2027-12-31"),
      feePercentage: 20,
      status: "active",
    },
  });

  const patientUser = await prisma.user.create({
    data: {
      email: "grace.muthoni@example.com",
      phone: "+254712345678",
      passwordHash: hashPassword(PASSWORD),
      role: UserRole.patient,
      organizationType: "none",
      displayName: "Grace Muthoni",
    },
  });

  const patient = await prisma.patient.create({
    data: {
      userId: patientUser.id,
      firstName: "Grace",
      lastName: "Muthoni",
      nationalId: "1199887766554433",
      insuranceId: "NHIF-87654321",
      dateOfBirth: new Date("1985-03-12"),
      emergencyContactName: "John Muthoni",
      emergencyContactPhone: "+254722111222",
    },
  });

  await regeneratePatientQr(patient.id);

  await prisma.appointment.create({
    data: {
      patientId: patient.id,
      hospitalId: hospital.id,
      scheduledAt: new Date(Date.now() + 7 * 86400000),
      department: "Cardiology",
      provider: "Dr. Amara Okafor",
      status: "scheduled",
      notes: "BP follow-up review",
    },
  });

  await prisma.insurerMember.create({
    data: {
      insurerId: insurer.id,
      patientId: patient.id,
      memberNumber: "JB-554211",
    },
  });

  await prisma.accessGrant.create({
    data: {
      patientId: patient.id,
      granteeType: "hospital",
      granteeId: hospital.id,
      grantedBy: patientUser.id,
      expiresAt: new Date(Date.now() + 180 * 86400000),
    },
  });

  await prisma.medicalRecord.create({
    data: {
      patientId: patient.id,
      hospitalId: hospital.id,
      recordType: "allergy",
      data: { name: "Penicillin", severity: "severe", reaction: "Anaphylaxis" },
      recordedBy: hospitalDoctor.id,
    },
  });

  const visit = await prisma.visit.create({
    data: {
      patientId: patient.id,
      hospitalId: hospital.id,
      department: "General",
      priority: "normal",
      recordedBy: hospitalDoctor.id,
      status: "completed",
      chiefComplaint: "BP follow-up",
      diagnosisCodes: ["BA00"],
      checkedOutAt: new Date(),
    },
  });

  const prescription = await prisma.prescription.create({
    data: {
      visitId: visit.id,
      patientId: patient.id,
      hospitalId: hospital.id,
      pharmacyId: pharmacy.id,
      prescribedBy: hospitalDoctor.id,
      status: "pending",
      diagnosis: "Hypertension",
      insuranceProvider: "Jubilee",
      insuranceMember: "JB-554211",
      totalAmount: 180,
    },
  });

  const invMetformin = await prisma.pharmacyInventory.create({
    data: {
      pharmacyId: pharmacy.id,
      drugName: "Metformin",
      strength: "500mg",
      dosageForm: DosageForm.tablet,
      barcode: "8901234567003",
      stock: 95,
      reorderPoint: 100,
      unitPrice: 5,
      costPrice: 3,
      category: "Antidiabetic",
      expiryDate: new Date("2027-12-01"),
    },
  });

  await prisma.prescriptionItem.create({
    data: {
      prescriptionId: prescription.id,
      inventoryId: invMetformin.id,
      drugName: "Metformin",
      strength: "500mg",
      dosageForm: DosageForm.tablet,
      dose: "1 tab x2/day",
      durationDays: 30,
      quantity: 60,
      unitPrice: 5,
      frequency: "twice daily",
    },
  });

  await prisma.drugInteraction.createMany({
    data: [
      {
        drugA: "lisinopril",
        drugB: "losartan",
        severity: "severe",
        note: "Combined ACEi + ARB increases AKI risk",
      },
      {
        drugA: "warfarin",
        drugB: "ibuprofen",
        severity: "severe",
        note: "Increased bleeding risk",
      },
    ],
  });

  await prisma.claim.create({
    data: {
      insurerId: insurer.id,
      patientId: patient.id,
      providerName: "Mbagathi Hospital",
      amount: 45,
      fraudScore: 98,
      pattern: "Duplicate lab (CBC)",
      status: "pending",
    },
  });

  await prisma.savingsRecord.create({
    data: {
      insurerId: insurer.id,
      patientId: patient.id,
      testType: "Complete Blood Count",
      category: "lab",
      firstTestDate: new Date("2026-04-10"),
      firstProvider: "Kenyatta National",
      attemptedDate: new Date("2026-04-12"),
      attemptedProvider: "Mbagathi Hospital",
      preventionMethod: "MiqorAI duplicate alert",
      savings: 45,
    },
  });

  await prisma.insurerAlert.create({
    data: {
      insurerId: insurer.id,
      severity: "high",
      category: "fraud",
      title: "Duplicate test spike",
      message: "Mbagathi Hospital duplicate test rate elevated",
    },
  });

  await prisma.insurerInvoice.create({
    data: {
      insurerId: insurer.id,
      period: "Apr 2026",
      grossSavings: 1247000,
      fee: 249400,
      status: "pending",
      dueDate: new Date("2026-05-15"),
    },
  });

  await prisma.pharmacyInvoice.create({
    data: {
      pharmacyId: pharmacy.id,
      period: "Apr 2026",
      amount: 8400,
      status: "pending",
      dueDate: new Date("2026-05-15"),
    },
  });

  await prisma.onboardingRequest.create({
    data: {
      type: "hospital",
      name: "Mombasa General Hospital",
      registrationRef: "MOH-2024-0999",
      location: "Mombasa, Kenya",
      submittedByEmail: "admin@mombasa.gov",
    },
  });

  await prisma.networkNode.createMany({
    data: [
      { city: "Nairobi", country: "Kenya", hospitals: 47, pharmacies: 12, patients: 12847, mapX: 62, mapY: 58 },
      { city: "Lagos", country: "Nigeria", hospitals: 23, pharmacies: 8, patients: 8234, mapX: 22, mapY: 52 },
    ],
  });

  await prisma.activityFeedEntry.createMany({
    data: [
      { kind: "checkin", text: "Grace Muthoni checked in at Kenyatta Hospital", actor: "Patient" },
      { kind: "rx", text: "Prescription queued at GoodLife Pharmacy", actor: "Pharmacy" },
    ],
  });

  await prisma.revenueSnapshot.create({
    data: {
      month: "2026-04",
      insurersRevenue: 698000,
      hospitalsRevenue: 99000,
      pharmaciesRevenue: 56000,
    },
  });

  const hour = new Date();
  hour.setMinutes(0, 0, 0);
  await prisma.hourlyMetric.create({
    data: { hour, scans: 42, scripts: 18 },
  });

  await prisma.platformSetting.createMany({
    data: [
      { key: "default_pilot_duration_days", value: 90 },
      { key: "savings_fee_percentage", value: 20 },
      { key: "invitation_expiry_days", value: 7 },
    ],
  });

  await regeneratePatientQr(patient.id);

  console.log("Seed complete.");
  console.log("");
  console.log("Test credentials (password for all: MiqorAI123!)");
  console.log("  Super admin:    admin@miqorai.com");
  console.log("  Hospital:       amara@stcatherine.med  + org MP-LAGOS-001");
  console.log("  Pharmacy:       brian@goodlife.co.ke  + org MPC-GOODLIFE-001");
  console.log("  Insurer:        wanjiku@jubilee.co.ke  + org JUBILEE_001");
  console.log("  Patient:        grace.muthoni@example.com (no org code)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
