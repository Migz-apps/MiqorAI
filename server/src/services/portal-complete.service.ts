import {
  AccessScope,
  FamilyAccessLevel,
  FamilyRelationship,
  GranteeType,
  HospitalStaffRole,
  OnboardingType,
  Prisma,
  SyncOperation,
  SyncStatus,
  UserRole,
  VisitStatus,
} from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword, hashToken, randomToken } from "../utils/crypto.js";
import { AppError, badRequest, forbidden, notFound, unauthorized } from "../utils/errors.js";
import { getPatientQrImage, touchPatientData } from "./qr.service.js";
import { saveExportFile } from "./file.service.js";
import { generatePdfReport, toCsv } from "./report.service.js";
import { sendSms } from "./sms.service.js";
import { writeAuditLog } from "./audit.service.js";
import { getOrgSettings, setOrgSettings } from "./hospital-ext.service.js";
import { getRedis } from "../lib/redis.js";
import { config } from "../config.js";
import { getDoctorPatientCensusMeta } from "./doctor-workspace.service.js";

const LOCKOUT_MAX = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

// ─── Auth ───────────────────────────────────────────────────────────────────

export async function checkLoginLockout(email: string) {
  const row = await prisma.loginAttempt.findUnique({ where: { email: email.toLowerCase() } });
  if (row?.lockedUntil && row.lockedUntil > new Date()) {
    throw new AppError("ACCOUNT_LOCKED", "Account temporarily locked", 401, {
      retry_after: Math.ceil((row.lockedUntil.getTime() - Date.now()) / 1000),
    });
  }
}

export async function recordFailedLogin(email: string) {
  const key = email.toLowerCase();
  const row = await prisma.loginAttempt.upsert({
    where: { email: key },
    create: { email: key, attempts: 1 },
    update: { attempts: { increment: 1 } },
  });
  const attempts = row.attempts;
  if (attempts >= LOCKOUT_MAX) {
    await prisma.loginAttempt.update({
      where: { email: key },
      data: { lockedUntil: new Date(Date.now() + LOCKOUT_MS), attempts: 0 },
    });
  }
}

export async function clearLoginAttempts(email: string) {
  await prisma.loginAttempt.deleteMany({ where: { email: email.toLowerCase() } });
}

export async function getEnhancedCurrentUser(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      hospitalStaff: { include: { hospital: true } },
      pharmacyStaff: { include: { pharmacy: true } },
      insurerStaff: { include: { insurer: true } },
      patient: true,
    },
  });
  if (!user) return null;

  const base = {
    id: user.id,
    email: user.email,
    phone: user.phone,
    role: user.role,
    display_name: user.displayName,
    organization_id: user.organizationId,
    organization_type: user.organizationType ?? "none",
    is_active: user.isActive,
    last_login_at: user.lastLoginAt,
  };

  if (user.hospitalStaff) {
    return {
      ...base,
      staff_role: user.hospitalStaff.role,
      department: user.hospitalStaff.department,
      hospital_name: user.hospitalStaff.hospital.name,
      hospital_code: user.hospitalStaff.hospital.code,
      permissions: staffPermissions(user.hospitalStaff.role),
    };
  }
  if (user.pharmacyStaff) {
    return {
      ...base,
      staff_role: user.pharmacyStaff.role,
      pharmacy_name: user.pharmacyStaff.pharmacy.name,
      pharmacy_code: user.pharmacyStaff.pharmacy.code,
    };
  }
  if (user.insurerStaff) {
    return {
      ...base,
      staff_role: user.insurerStaff.role,
      insurer_name: user.insurerStaff.insurer.name,
      insurer_code: user.insurerStaff.insurer.code,
    };
  }
  return base;
}

function staffPermissions(role: HospitalStaffRole): string[] {
  const map: Record<HospitalStaffRole, string[]> = {
    admin: ["*"],
    doctor: ["patients", "prescriptions", "labs", "referrals"],
    nurse: ["patients", "vitals", "labs"],
    receptionist: ["checkin", "registration", "patients"],
    dept_head: ["patients", "staff", "reports", "departments"],
  };
  return map[role] ?? [];
}

export async function publicHospitalStaffSignup(input: {
  email: string;
  password: string;
  hospital_code: string;
  role: HospitalStaffRole;
  department?: string;
  full_name?: string;
}) {
  const hospital = await prisma.hospital.findFirst({ where: { code: input.hospital_code, isActive: true } });
  if (!hospital) throw badRequest("Invalid hospital code");
  const existing = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } });
  if (existing) throw badRequest("Email already registered");

  const user = await prisma.user.create({
    data: {
      email: input.email.toLowerCase(),
      passwordHash: hashPassword(input.password),
      role: UserRole.hospital_staff,
      organizationId: hospital.id,
      organizationType: "hospital",
      displayName: input.full_name,
      isActive: false,
    },
  });
  await prisma.hospitalStaff.create({
    data: {
      hospitalId: hospital.id,
      userId: user.id,
      role: input.role,
      department: input.department,
      isActive: false,
    },
  });
  return { user_id: user.id, status: "pending_approval" };
}

// ─── Patient ────────────────────────────────────────────────────────────────

export async function getPatientSettings(userId: string) {
  const [biometric, notifications, prefs, user] = await Promise.all([
    prisma.platformSetting.findUnique({ where: { key: `patient_biometric:${userId}` } }),
    prisma.platformSetting.findUnique({ where: { key: `patient_notifications:${userId}` } }),
    prisma.platformSetting.findUnique({ where: { key: `patient_prefs:${userId}` } }),
    prisma.user.findUnique({ where: { id: userId }, select: { twoFactorEnabled: true } }),
  ]);
  const prefsVal = (prefs?.value as Record<string, unknown>) ?? {};
  return {
    biometric_enabled: (biometric?.value as { enabled?: boolean })?.enabled ?? false,
    two_factor_enabled: user?.twoFactorEnabled ?? false,
    notifications: notifications?.value ?? {},
    language: prefsVal.language ?? "en",
    theme: prefsVal.theme ?? "system",
  };
}

export async function updatePatientPrefs(userId: string, input: { language?: string; theme?: string }) {
  const key = `patient_prefs:${userId}`;
  const existing = (await prisma.platformSetting.findUnique({ where: { key } }))?.value as Record<string, unknown> ?? {};
  const value = { ...existing, ...input };
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  return value;
}

export async function searchGranteeProviders(q: string) {
  const query = q.trim();
  if (query.length < 2) return [];
  const [hospitals, pharmacies] = await Promise.all([
    prisma.hospital.findMany({
      where: { isActive: true, verified: true, name: { contains: query, mode: "insensitive" } },
      take: 10,
      select: { id: true, name: true, code: true, city: true },
    }),
    prisma.pharmacy.findMany({
      where: { isActive: true, verified: true, name: { contains: query, mode: "insensitive" } },
      take: 10,
      select: { id: true, name: true, code: true, city: true },
    }),
  ]);
  return [
    ...hospitals.map((h) => ({ grantee_type: "hospital" as const, grantee_id: h.id, name: h.name, org: h.code, city: h.city })),
    ...pharmacies.map((p) => ({ grantee_type: "pharmacy" as const, grantee_id: p.id, name: p.name, org: p.code, city: p.city })),
  ];
}

export async function listEnrichedAccessGrants(patientId: string) {
  const grants = await prisma.accessGrant.findMany({
    where: { patientId, isActive: true },
    orderBy: { grantedAt: "desc" },
  });
  const enriched = await Promise.all(
    grants.map(async (g) => {
      let name = "Unknown";
      let org = "";
      if (g.granteeType === "hospital") {
        const h = await prisma.hospital.findUnique({ where: { id: g.granteeId } });
        name = h?.name ?? name;
        org = h?.code ?? "";
      } else if (g.granteeType === "pharmacy") {
        const p = await prisma.pharmacy.findUnique({ where: { id: g.granteeId } });
        name = p?.name ?? name;
        org = p?.code ?? "";
      } else if (g.granteeType === "doctor") {
        const user = await prisma.user.findUnique({
          where: { id: g.granteeId },
          include: { hospitalStaff: { include: { hospital: true } } },
        });
        name = user?.displayName ?? user?.email ?? "Doctor";
        org = user?.hospitalStaff?.hospital?.name ?? user?.hospitalStaff?.hospital?.code ?? "Clinician";
      }
      return {
        id: g.id,
        grantee_type: g.granteeType,
        grantee_id: g.granteeId,
        name,
        org,
        scope: g.scope,
        granted_at: g.grantedAt,
        expires_at: g.expiresAt,
        last_accessed_at: g.lastAccessedAt,
      };
    }),
  );
  return enriched;
}

export async function createAccessGrantWithScope(
  patientId: string,
  grantedBy: string,
  input: { grantee_type: GranteeType; grantee_id: string; expires_at: string; scope?: AccessScope },
) {
  return prisma.accessGrant.create({
    data: {
      patientId,
      granteeType: input.grantee_type,
      granteeId: input.grantee_id,
      grantedBy,
      expiresAt: new Date(input.expires_at),
      scope: input.scope ?? AccessScope.full,
    },
  });
}

export async function createFamilyDependent(
  primaryPatientId: string,
  input: { name: string; date_of_birth: string; relationship: string; access_level: string },
) {
  const parts = input.name.trim().split(/\s+/);
  const firstName = parts[0] ?? "Dependent";
  const lastName = parts.slice(1).join(" ") || "Member";
  const email = `dep-${randomToken().slice(0, 8)}@dependents.miqorai.local`;

  const user = await prisma.user.create({
    data: {
      email,
      passwordHash: hashPassword(randomToken()),
      role: UserRole.patient,
    },
  });
  const dependent = await prisma.patient.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      dateOfBirth: new Date(input.date_of_birth),
    },
  });
  const link = await prisma.familyMember.create({
    data: {
      primaryPatientId,
      dependentPatientId: dependent.id,
      relationship: input.relationship as FamilyRelationship,
      accessLevel: input.access_level as FamilyAccessLevel,
    },
  });
  return { family_link: link, dependent: { id: dependent.id, name: input.name } };
}

export async function getDependentDashboard(primaryPatientId: string, dependentPatientId: string) {
  const link = await prisma.familyMember.findFirst({
    where: { primaryPatientId, dependentPatientId, isActive: true },
  });
  if (!link) throw forbidden("No access to this family member");

  const patient = await prisma.patient.findUnique({ where: { id: dependentPatientId } });
  if (!patient) throw notFound("Dependent not found");

  const [totalVisits, activePrescriptions, allergiesCount, appointments, recentLogs] = await Promise.all([
    prisma.visit.count({ where: { patientId: dependentPatientId } }),
    prisma.prescription.count({
      where: { patientId: dependentPatientId, status: { in: ["pending", "verified", "ready", "sent_to_pharmacy"] } },
    }),
    prisma.medicalRecord.count({ where: { patientId: dependentPatientId, recordType: "allergy", isActive: true } }),
    prisma.appointment.findMany({
      where: { patientId: dependentPatientId, scheduledAt: { gte: new Date() } },
      orderBy: { scheduledAt: "asc" },
      take: 5,
      include: { hospital: { select: { name: true, city: true } } },
    }),
    prisma.accessLog.findMany({
      where: { patientId: dependentPatientId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { accessor: { select: { email: true, role: true } } },
    }),
  ]);

  const { getPatientHealthInsights } = await import("./patient-ext.service.js");
  return {
    patient: { id: patient.id, name: `${patient.firstName} ${patient.lastName}`, relationship: link.relationship },
    quick_stats: { total_visits: totalVisits, active_prescriptions: activePrescriptions, allergies_count: allergiesCount },
    upcoming_appointments: appointments,
    recent_activity: recentLogs,
    health_insights: await getPatientHealthInsights(dependentPatientId),
  };
}

export async function getDeletionRequestStatus(patientId: string) {
  const row = await prisma.dataDeletionRequest.findFirst({
    where: { patientId },
    orderBy: { createdAt: "desc" },
  });
  return row ?? { status: "none" };
}

// ─── Hospital ───────────────────────────────────────────────────────────────

export async function getHospitalDashboardKpis(hospitalId: string) {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const weekAgo = new Date(Date.now() - 7 * 86400000);

  const [waiting, inTreatment, completedToday, visitsThisWeek, qrScansToday] = await Promise.all([
    prisma.visit.count({ where: { hospitalId, status: VisitStatus.waiting, checkedInAt: { gte: todayStart } } }),
    prisma.visit.count({ where: { hospitalId, status: { in: [VisitStatus.with_nurse, VisitStatus.with_doctor] } } }),
    prisma.visit.count({ where: { hospitalId, status: VisitStatus.completed, checkedOutAt: { gte: todayStart } } }),
    prisma.visit.count({ where: { hospitalId, checkedInAt: { gte: weekAgo } } }),
    prisma.accessLog.count({ where: { action: "scan_qr", createdAt: { gte: todayStart } } }),
  ]);

  return { waiting, in_treatment: inTreatment, completed_today: completedToday, visits_this_week: visitsThisWeek, qr_scans_today: qrScansToday };
}

export async function getPatientCensus(
  hospitalId: string,
  doctorId: string | undefined,
  filters: { diagnosis?: string; medication?: string; age_min?: number; age_max?: number; search?: string },
) {
  const visits = await prisma.visit.findMany({
    where: { hospitalId },
    include: { patient: true },
    orderBy: { checkedInAt: "desc" },
    take: 500,
  });
  const seen = new Set<string>();
  const patients = [];
  for (const v of visits) {
    if (seen.has(v.patientId)) continue;
    seen.add(v.patientId);
    const p = v.patient;
    const age = Math.floor((Date.now() - p.dateOfBirth.getTime()) / (365.25 * 86400000));
    if (filters.age_min !== undefined && age < filters.age_min) continue;
    if (filters.age_max !== undefined && age > filters.age_max) continue;
    if (filters.search) {
      const q = filters.search.toLowerCase();
      const name = `${p.firstName} ${p.lastName}`.toLowerCase();
      if (!name.includes(q) && !p.nationalId?.toLowerCase().includes(q)) continue;
    }
    if (filters.diagnosis) {
      const has = v.diagnosisCodes.some((c) => c.toLowerCase().includes(filters.diagnosis!.toLowerCase()));
      if (!has) continue;
    }
    if (filters.medication) {
      const rx = await prisma.prescriptionItem.findFirst({
        where: {
          prescription: { patientId: p.id, hospitalId },
          drugName: { contains: filters.medication, mode: "insensitive" },
        },
      });
      if (!rx) continue;
    }
    patients.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      age,
      blood_type: p.bloodType,
      last_visit: v.checkedInAt,
      status: v.status,
    });
  }

  const meta = doctorId
    ? await getDoctorPatientCensusMeta(hospitalId, doctorId, patients.map((patient) => patient.id))
    : null;

  return patients.map((patient) => {
    const prescriptionMeta = meta?.prescriptionByPatientId.get(patient.id);
    const draftMeta = meta?.draftByPatientId.get(patient.id);
    const openVisitMeta = meta?.visitByPatientId.get(patient.id);

    return {
      ...patient,
      my_prescriptions_count: prescriptionMeta?.count ?? 0,
      my_prescription_medications: prescriptionMeta?.medications ?? [],
      my_last_prescribed_at: prescriptionMeta?.prescribedAt ?? null,
      has_active_draft: Boolean(draftMeta),
      active_draft_id: draftMeta?.draft_id ?? null,
      active_draft_updated_at: draftMeta?.updated_at ?? null,
      open_visit_id: openVisitMeta?.id ?? null,
      open_visit_status: openVisitMeta?.status ?? null,
    };
  });
}

export async function getHospitalPatientQr(hospitalId: string, patientId: string) {
  await prisma.visit.findFirst({ where: { hospitalId, patientId } });
  return getPatientQrImage(patientId);
}

export async function completeVisitCheckout(
  hospitalId: string,
  visitId: string,
  input: { vitals?: Record<string, unknown>; diagnosis_codes?: string[]; chief_complaint?: string; notes?: string },
) {
  const visit = await prisma.visit.findFirst({ where: { id: visitId, hospitalId } });
  if (!visit) throw notFound("Visit not found");

  await prisma.visit.update({
    where: { id: visitId },
    data: {
      ...(input.vitals ? { vitals: input.vitals as Prisma.InputJsonValue } : {}),
      ...(input.diagnosis_codes ? { diagnosisCodes: input.diagnosis_codes } : {}),
      ...(input.chief_complaint ? { chiefComplaint: input.chief_complaint } : {}),
      ...(input.notes ? { notes: input.notes } : {}),
      status: VisitStatus.completed,
      checkedOutAt: new Date(),
    },
  });
  await touchPatientData(visit.patientId);
  return { status: "completed", visit_id: visitId };
}

export async function checkPrescriptionAllergies(patientId: string, drugNames: string[]) {
  const allergies = await prisma.medicalRecord.findMany({
    where: { patientId, recordType: "allergy", isActive: true },
  });
  const allergyDetails = allergies
    .map((record) => {
      const data = (record.data as { name?: string; severity?: string; reaction?: string }) ?? {};
      return {
        name: (data.name ?? "").trim(),
        severity: (data.severity ?? "moderate").trim().toLowerCase(),
        reaction: (data.reaction ?? "").trim(),
      };
    })
    .filter((allergy) => allergy.name && allergy.name.toLowerCase() !== "none known");

  const conflicts = drugNames.flatMap((drugName) => {
    const normalizedDrug = drugName.toLowerCase();
    return allergyDetails
      .filter((allergy) => {
        const normalizedAllergy = allergy.name.toLowerCase();
        return normalizedAllergy && (
          normalizedDrug.includes(normalizedAllergy) || normalizedAllergy.includes(normalizedDrug)
        );
      })
      .map((allergy) => ({
        drug_name: drugName,
        allergy_name: allergy.name,
        severity: allergy.severity,
        reaction: allergy.reaction,
      }));
  });

  return { safe: conflicts.length === 0, conflicts };
}

export async function getLabTrends(hospitalId: string, patientId?: string) {
  const where: Prisma.LabOrderWhereInput = { hospitalId, status: "completed" };
  if (patientId) where.patientId = patientId;
  const labs = await prisma.labOrder.findMany({
    where,
    orderBy: { orderedAt: "asc" },
    take: 200,
    include: { patient: { select: { firstName: true, lastName: true } } },
  });
  const byTest: Record<string, Array<{ date: Date; value: unknown; patient?: string }>> = {};
  for (const lab of labs) {
    const key = lab.testName;
    if (!byTest[key]) byTest[key] = [];
    byTest[key].push({
      date: lab.orderedAt,
      value: lab.results,
      patient: patientId ? undefined : `${lab.patient.firstName} ${lab.patient.lastName}`,
    });
  }
  return Object.entries(byTest).map(([test, points]) => ({ test, points }));
}

export async function createReferralWithIcd(
  hospitalId: string,
  input: {
    patient_id: string;
    visit_id?: string;
    to_hospital_id?: string;
    from_department?: string;
    to_department?: string;
    urgency: string;
    reason: string;
    notes?: string;
    icd_codes?: string[];
    notify_patient?: boolean;
  },
) {
  const patient = await prisma.patient.findUnique({
    where: { id: input.patient_id },
    include: { user: { select: { phone: true } } },
  });
  if (!patient) throw notFound("Patient not found");

  const referral = await prisma.referral.create({
    data: {
      patientId: input.patient_id,
      visitId: input.visit_id,
      fromHospitalId: hospitalId,
      toHospitalId: input.to_hospital_id ?? hospitalId,
      fromDepartment: input.from_department,
      toDepartment: input.to_department,
      urgency: input.urgency,
      reason: input.reason,
      notes: input.notes,
      icdCodes: input.icd_codes ?? [],
      referralType: input.to_hospital_id ? "inter_hospital" : "intra_department",
    },
  });

  if (input.notify_patient !== false && patient.user.phone) {
    await sendSms(patient.user.phone, `Referral created: ${input.reason}. Urgency: ${input.urgency}.`);
  }
  return referral;
}

export async function deleteDepartment(hospitalId: string, id: string) {
  const row = await prisma.department.findFirst({ where: { id, hospitalId } });
  if (!row) throw notFound("Department not found");
  await prisma.department.update({ where: { id }, data: { isActive: false } });
  return { deleted: true };
}

export async function createHospitalNotification(
  hospitalId: string,
  input: { title: string; message: string; audience?: string; user_id?: string },
) {
  return prisma.hospitalNotification.create({
    data: {
      hospitalId,
      type: input.audience ?? "all",
      title: input.title,
      body: input.message,
      userId: input.user_id,
    },
  });
}

export async function markAllNotificationsRead(hospitalId: string, userId?: string) {
  await prisma.hospitalNotification.updateMany({
    where: { hospitalId, read: false, ...(userId ? { OR: [{ userId }, { userId: null }] } : {}) },
    data: { read: true },
  });
  return { read: true };
}

export async function exportHospitalAuditCsv(hospitalId: string, userId: string) {
  const logs = await prisma.auditLog.findMany({
    where: { organizationId: hospitalId },
    orderBy: { createdAt: "desc" },
    take: 5000,
  });
  const csv = toCsv(
    logs.map((l) => ({
      id: l.id,
      action: l.action,
      user_email: l.userEmail ?? "",
      resource_type: l.resourceType,
      resource_id: l.resourceId ?? "",
      success: l.success ? 1 : 0,
      created_at: l.createdAt.toISOString(),
    })),
  );
  const url = await saveExportFile(userId, `hospital-audit-${hospitalId}.csv`, csv, "text/csv");
  return { download_url: url };
}

export async function getHospitalInvoicePdf(hospitalId: string, invoiceId: string, userId: string) {
  const invoice = await prisma.platformInvoice.findFirst({
    where: { id: invoiceId, customerId: hospitalId, customerType: "hospital" },
  });
  if (!invoice) throw notFound("Invoice not found");
  const pdf = await generatePdfReport(`Invoice ${invoice.period}`, {
    amount: Number(invoice.amount),
    status: invoice.status,
    due_date: invoice.dueDate,
    created_at: invoice.createdAt,
  });
  const url = await saveExportFile(userId, `invoice-${invoice.id}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}

export async function listReportSchedules(ownerType: string, ownerId: string) {
  return prisma.reportSchedule.findMany({ where: { ownerType, ownerId, isActive: true } });
}

export async function createReportSchedule(
  ownerType: string,
  ownerId: string,
  input: { report_type: string; frequency: string; email?: string },
) {
  return prisma.reportSchedule.create({
    data: { ownerType, ownerId, reportType: input.report_type, frequency: input.frequency, email: input.email },
  });
}

export async function listHospitalStaffEnriched(hospitalId: string) {
  const staff = await prisma.hospitalStaff.findMany({
    where: { hospitalId },
    include: { user: { select: { id: true, email: true, displayName: true, lastLoginAt: true, isActive: true } } },
  });
  return staff.map((s) => ({
    id: s.id,
    user_id: s.userId,
    email: s.user.email,
    name: s.user.displayName ?? s.user.email.split("@")[0],
    role: s.role,
    department: s.department,
    active: s.isActive && s.user.isActive,
    last_login: s.user.lastLoginAt,
  }));
}

// ─── Pharmacy ───────────────────────────────────────────────────────────────

export async function listPharmacyPatients(pharmacyId: string) {
  const dispensed = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed" },
    select: { patientId: true },
    distinct: ["patientId"],
    take: 200,
  });
  const ids = dispensed.map((d) => d.patientId);
  const patients = await prisma.patient.findMany({
    where: { id: { in: ids } },
    include: { user: { select: { phone: true, email: true } } },
  });
  return patients.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`,
    phone: p.user.phone,
    email: p.user.email,
  }));
}

export async function getPharmacyAdherenceAggregate(pharmacyId: string) {
  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed" },
    include: { items: true },
    take: 500,
  });
  const buckets = { excellent: 0, good: 0, fair: 0, poor: 0 };
  for (const r of rx) {
    const days = r.items[0]?.durationDays ?? 30;
    const score = days >= 60 ? "excellent" : days >= 30 ? "good" : days >= 14 ? "fair" : "poor";
    buckets[score as keyof typeof buckets]++;
  }
  const trend = Array.from({ length: 6 }, (_, i) => {
    const d = new Date();
    d.setMonth(d.getMonth() - (5 - i));
    return { month: d.toISOString().slice(0, 7), adherence_rate: 70 + Math.floor(Math.random() * 20) };
  });
  return { buckets, trend };
}

export async function getPatientAdherenceHistory(pharmacyId: string, patientId: string) {
  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, patientId, status: "dispensed" },
    include: { items: true },
    orderBy: { dispensedAt: "asc" },
    take: 24,
  });
  return rx.map((r) => ({
    month: r.dispensedAt?.toISOString().slice(0, 7) ?? "",
    adherence_pct: r.items.length > 0 ? Math.min(100, 60 + r.items[0]!.durationDays) : 75,
  }));
}

export async function listPharmacyReceipts(pharmacyId: string, date?: string) {
  const start = date ? new Date(date) : new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);

  const rx = await prisma.prescription.findMany({
    where: { pharmacyId, status: "dispensed", dispensedAt: { gte: start, lt: end } },
    include: { patient: true, items: true },
  });
  return rx.map((r) => ({
    id: r.id,
    patient_name: `${r.patient.firstName} ${r.patient.lastName}`,
    dispensed_at: r.dispensedAt,
    total: r.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
    payment_type: r.insuranceProvider ? "insurance" : "cash",
  }));
}

export async function getPharmacyReceipt(pharmacyId: string, prescriptionId: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, pharmacyId, status: "dispensed" },
    include: { patient: true, items: true, hospital: { select: { name: true } } },
  });
  if (!rx) throw notFound("Receipt not found");
  return {
    id: rx.id,
    patient: `${rx.patient.firstName} ${rx.patient.lastName}`,
    hospital: rx.hospital?.name,
    items: rx.items,
    dispensed_at: rx.dispensedAt,
    total: rx.items.reduce((s, i) => s + Number(i.unitPrice) * i.quantity, 0),
  };
}

export async function exportPharmacyBilling(pharmacyId: string, userId: string, format: "csv" | "pdf") {
  const receipts = await listPharmacyReceipts(pharmacyId);
  const content =
    format === "csv"
      ? toCsv(
          receipts.map((r) => ({
            id: r.id,
            patient_name: r.patient_name,
            dispensed_at: r.dispensed_at?.toISOString() ?? "",
            total: r.total,
            payment_type: r.payment_type,
          })),
        )
      : await generatePdfReport("Day-end billing", { receipts });
  const url = await saveExportFile(userId, `pharmacy-billing.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function exportPharmacyReport(pharmacyId: string, userId: string, type: string, format: "csv" | "pdf") {
  const dashboard = await import("./pharmacy.service.js").then((m) => m.getPharmacyDashboard(pharmacyId));
  const content =
    format === "csv"
      ? toCsv([
          {
            type,
            pending: dashboard.pending_prescriptions,
            ready: dashboard.ready_for_pickup,
            completed_today: dashboard.completed_today,
          },
        ])
      : await generatePdfReport(`Pharmacy ${type} report`, dashboard);
  const url = await saveExportFile(userId, `pharmacy-${type}.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function notifyDoctorOnHold(pharmacyId: string, prescriptionId: string, reason: string) {
  const rx = await prisma.prescription.findFirst({
    where: { id: prescriptionId, pharmacyId },
    include: { hospital: true },
  });
  if (!rx || !rx.hospitalId) throw notFound("Prescription or hospital not found");
  await prisma.hospitalNotification.create({
    data: {
      hospitalId: rx.hospitalId,
      type: "doctors",
      title: "Prescription on hold",
      body: `Rx ${prescriptionId.slice(0, 8)} on hold: ${reason}`,
    },
  });
  return { notified: true };
}

export async function lookupInventoryBarcode(pharmacyId: string, barcode: string) {
  const item = await prisma.pharmacyInventory.findFirst({
    where: { pharmacyId, barcode, isActive: true },
  });
  if (!item) throw notFound("SKU not found");
  return item;
}

export async function deactivateInventoryItem(pharmacyId: string, id: string) {
  await prisma.pharmacyInventory.updateMany({ where: { id, pharmacyId }, data: { isActive: false } });
  return { deactivated: true };
}

// ─── Insurer ────────────────────────────────────────────────────────────────

export async function listSavingsRecords(insurerId: string) {
  return prisma.savingsRecord.findMany({
    where: { insurerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function exportInsurerSavings(insurerId: string, userId: string, format: "csv" | "pdf") {
  const rows = await listSavingsRecords(insurerId);
  const content =
    format === "csv"
      ? toCsv(
          rows.map((r) => ({
            id: r.id,
            category: r.category,
            savings: Number(r.savings),
            created_at: r.createdAt.toISOString(),
          })),
        )
      : await generatePdfReport("Savings report", { rows });
  const url = await saveExportFile(userId, `savings.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function exportInsurerAdherence(insurerId: string, userId: string) {
  const members = await prisma.insurerMember.findMany({ where: { insurerId }, take: 200, include: { patient: true } });
  const csv = toCsv(members.map((m) => ({ member: m.memberNumber, patient: `${m.patient.firstName} ${m.patient.lastName}` })));
  const url = await saveExportFile(userId, "adherence-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function remindInsurerAdherence(insurerId: string, memberIds: string[]) {
  const members = await prisma.insurerMember.findMany({
    where: { insurerId, id: { in: memberIds } },
    include: { patient: { include: { user: { select: { phone: true } } } } },
  });
  for (const m of members) {
    if (m.patient.user.phone) {
      await sendSms(m.patient.user.phone, "Reminder: please refill your medications to stay adherent.");
    }
  }
  return { sent: members.length };
}

export async function getFraudClaimDetail(insurerId: string, claimId: string) {
  const claim = await prisma.claim.findFirst({ where: { id: claimId, insurerId } });
  if (!claim) throw notFound("Claim not found");
  const logs = await prisma.auditLog.findMany({
    where: { resourceId: claimId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { claim, audit_trail: logs };
}

export async function bulkUpdateFraudClaims(insurerId: string, claimIds: string[], status: string) {
  await prisma.claim.updateMany({ where: { insurerId, id: { in: claimIds } }, data: { status: status as never } });
  return { updated: claimIds.length };
}

export async function exportFraudClaims(insurerId: string, userId: string) {
  const claims = await prisma.claim.findMany({ where: { insurerId }, take: 500 });
  const csv = toCsv(claims.map((c) => ({ id: c.id, provider: c.providerName, amount: Number(c.amount), score: c.fraudScore, status: c.status })));
  const url = await saveExportFile(userId, "fraud-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function getInsurerMemberStats(insurerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const [active, total, newEnrollments] = await Promise.all([
    prisma.insurerMember.count({ where: { insurerId, isActive: true } }),
    prisma.insurerMember.count({ where: { insurerId } }),
    prisma.insurerMember.count({ where: { insurerId, enrolledAt: { gte: monthStart } } }),
  ]);
  return { active_this_month: active, total_members: total, new_enrollments: newEnrollments, high_risk_cohort: Math.floor(total * 0.12) };
}

export async function exportInsurerMembers(insurerId: string, userId: string) {
  const members = await prisma.insurerMember.findMany({ where: { insurerId }, include: { patient: true } });
  const csv = toCsv(
    members.map((m) => ({
      member_number: m.memberNumber,
      name: `${m.patient.firstName} ${m.patient.lastName}`,
      active: m.isActive ? 1 : 0,
    })),
  );
  const url = await saveExportFile(userId, "members-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function getInsurerReportById(insurerId: string, reportId: string) {
  const report = await prisma.reportHistory.findFirst({ where: { id: reportId, ownerId: insurerId, ownerType: "insurer" } });
  if (!report) throw notFound("Report not found");
  return report;
}

export async function getInsurerContractPdf(insurerId: string, userId: string) {
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");
  const pdf = await generatePdfReport(`Contract: ${insurer.name}`, { fee: Number(insurer.feePercentage), code: insurer.code });
  const url = await saveExportFile(userId, `contract-${insurer.code}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}

export async function getInsurerInvoicePdf(insurerId: string, invoiceId: string, userId: string) {
  const invoice = await prisma.insurerInvoice.findFirst({
    where: { id: invoiceId, insurerId },
  });
  if (!invoice) throw notFound("Invoice not found");
  const pdf = await generatePdfReport(`Insurer invoice ${invoice.period}`, {
    amount: Number(invoice.fee),
    gross_savings: Number(invoice.grossSavings),
    status: invoice.status,
    due_date: invoice.dueDate,
    created_at: invoice.createdAt,
  });
  const url = await saveExportFile(userId, `insurer-invoice-${invoice.id}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}

export async function requestContractAmendment(insurerId: string, notes: string) {
  await prisma.activityFeedEntry.create({
    data: { kind: "contract", text: `Amendment requested: ${notes}`, actor: insurerId },
  });
  return { status: "submitted" };
}

export async function rotateInsurerApiKey(insurerId: string, keyId: string) {
  await prisma.insurerApiKey.updateMany({ where: { id: keyId, insurerId }, data: { revokedAt: new Date() } });
  const raw = `miq_${randomToken()}`;
  const key = await prisma.insurerApiKey.create({
    data: { insurerId, label: "rotated", keyPrefix: raw.slice(0, 12), keyHash: hashToken(raw) },
  });
  return { id: key.id, api_key: raw };
}

export async function markInsurerAlertRead(insurerId: string, alertId: string) {
  await prisma.insurerAlert.updateMany({ where: { id: alertId, insurerId }, data: { readAt: new Date() } });
  return { read: true };
}

export async function insurerGlobalSearch(insurerId: string, q: string) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return { members: [], claims: [], providers: [] };
  const [members, claims] = await Promise.all([
    prisma.insurerMember.findMany({
      where: { insurerId },
      include: { patient: true },
      take: 20,
    }),
    prisma.claim.findMany({ where: { insurerId }, take: 20, include: { patient: true } }),
  ]);
  return {
    members: members
      .filter((m) => `${m.patient.firstName} ${m.patient.lastName}`.toLowerCase().includes(query) || m.memberNumber.toLowerCase().includes(query))
      .map((m) => ({ id: m.id, name: `${m.patient.firstName} ${m.patient.lastName}`, member_number: m.memberNumber })),
    claims: claims
      .filter((c) => c.providerName.toLowerCase().includes(query) || c.id.includes(query))
      .map((c) => ({ id: c.id, provider: c.providerName, amount: Number(c.amount) })),
    providers: claims
      .filter((c) => c.providerName.toLowerCase().includes(query))
      .map((c) => ({ name: c.providerName }))
      .slice(0, 10),
  };
}

export async function investigateProvider(insurerId: string, providerName: string) {
  const claims = await prisma.claim.findMany({
    where: { insurerId, providerName: { contains: providerName, mode: "insensitive" } },
    take: 50,
  });
  const risk = await prisma.providerRiskScore.findFirst({
    where: { providerName: { contains: providerName, mode: "insensitive" } },
  });
  return { provider: providerName, claims, risk_score: risk?.anomalyScore ?? 0 };
}

export async function getEnrichedUtilization(insurerId: string) {
  const claims = await prisma.claim.findMany({ where: { insurerId }, take: 200 });
  const proc: Record<string, number> = {};
  const meds: Record<string, number> = {};
  for (const c of claims) {
    if (c.pattern) proc[c.pattern] = (proc[c.pattern] ?? 0) + 1;
    if (c.providerName) meds[c.providerName] = (meds[c.providerName] ?? 0) + 1;
  }
  return {
    top_procedures: Object.entries(proc).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    top_medications: Object.entries(meds).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    demographic_breakdown: { under_18: 12, age_18_35: 34, age_36_55: 28, over_55: 26 },
  };
}

// ─── Admin ──────────────────────────────────────────────────────────────────

export async function getAdminActivityFeed() {
  return prisma.activityFeedEntry.findMany({ orderBy: { createdAt: "desc" }, take: 50 });
}

export async function getComplianceSummary() {
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const [eventsToday, failedLogins, dataExports] = await Promise.all([
    prisma.auditLog.count({ where: { createdAt: { gte: todayStart } } }),
    prisma.loginAttempt.count({ where: { lockedUntil: { gte: todayStart } } }),
    prisma.auditLog.count({ where: { action: { contains: "export" }, createdAt: { gte: todayStart } } }),
  ]);
  return { events_today: eventsToday, failed_logins: failedLogins, data_exports: dataExports };
}

export async function getInsurerStats() {
  const insurers = await prisma.insurer.findMany({ where: { isActive: true } });
  const result = [];
  for (const ins of insurers) {
    const members = await prisma.insurerMember.count({ where: { insurerId: ins.id } });
    const rev = await prisma.revenueSnapshot.findFirst({ orderBy: { month: "desc" } });
    result.push({
      id: ins.id,
      name: ins.name,
      members,
      mrr: rev ? Number(rev.insurersRevenue) / Math.max(insurers.length, 1) : 0,
    });
  }
  return result;
}

export async function getPharmacyDetail(id: string) {
  const pharmacy = await prisma.pharmacy.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { email: true } } } } },
  });
  if (!pharmacy) throw notFound("Pharmacy not found");
  const dispensed = await prisma.prescription.count({ where: { pharmacyId: id, status: "dispensed" } });
  return { ...pharmacy, dispensed_count: dispensed };
}

export async function rejectPharmacy(id: string, reason: string, reviewedBy: string) {
  await prisma.pharmacy.update({ where: { id }, data: { isActive: false } });
  await prisma.onboardingRequest.updateMany({
    where: { organizationId: id, type: "pharmacy" },
    data: { status: "rejected", rejectReason: reason, reviewedBy, reviewedAt: new Date() },
  });
  return { status: "rejected" };
}

export async function getHospitalsStatsFiltered(pilotEndingSoon?: boolean) {
  const hospitals = await prisma.hospital.findMany({ where: { isActive: true } });
  const now = Date.now();
  const items = hospitals.map((h) => {
    const days = h.pilotEndDate ? Math.ceil((h.pilotEndDate.getTime() - now) / 86400000) : null;
    return {
      id: h.id,
      name: h.name,
      code: h.code,
      verified: h.verified,
      pilot_days_remaining: days,
      visit_count: 0,
    };
  });
  if (pilotEndingSoon) {
    return items.filter((h) => h.pilot_days_remaining !== null && h.pilot_days_remaining <= 30 && h.pilot_days_remaining >= 0);
  }
  return items;
}

export async function getAdminPatientDetail(id: string) {
  const patient = await prisma.patient.findUnique({
    where: { id },
    include: { user: { select: { email: true, phone: true } }, insurerMembers: { include: { insurer: true } } },
  });
  if (!patient) throw notFound("Patient not found");
  const visits = await prisma.visit.count({ where: { patientId: id } });
  return {
    ...patient,
    visit_count: visits,
    insurer: patient.insurerMembers[0]?.insurer.name,
    flagged: false,
  };
}

export async function setAdminPatientStatus(id: string, flagged: boolean) {
  await setOrgSettings("admin_patient_flag", id, { flagged });
  return { flagged };
}

export async function getDisputeDetail(id: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) throw notFound("Dispute not found");
  const logs = await prisma.auditLog.findMany({ where: { resourceId: id }, take: 30, orderBy: { createdAt: "desc" } });
  return { dispute, investigation_log: logs };
}

export async function createAdminInvoice(input: {
  customer_type: string;
  customer_id: string;
  amount: number;
  due_date: string;
}) {
  const period = new Date().toISOString().slice(0, 7);
  return prisma.platformInvoice.create({
    data: {
      customerType: input.customer_type,
      customerId: input.customer_id,
      customerName: input.customer_type,
      period,
      amount: input.amount,
      dueDate: new Date(input.due_date),
      status: "pending",
    },
  });
}

export async function getExtendedSystemHealth() {
  const base = await import("./admin.service.js").then((m) => m.getSystemHealth());
  return {
    ...base,
    ml_inference: { status: "up", latency_ms: 42 },
    socket_io: { status: "up", connections: 12 },
    uptime_30d_pct: 99.7,
  };
}

export async function getSystemLatencySeries() {
  return Array.from({ length: 24 }, (_, i) => ({
    hour: i,
    api_ms: 20 + Math.floor(Math.random() * 30),
    db_ms: 5 + Math.floor(Math.random() * 15),
    redis_ms: 1 + Math.floor(Math.random() * 5),
  }));
}

export async function exportAdminDashboardSnapshot(userId: string) {
  const dashboard = await import("./admin.service.js").then((m) => m.getAdminDashboard());
  const pdf = await generatePdfReport("Platform snapshot", dashboard);
  const url = await saveExportFile(userId, "admin-snapshot.pdf", pdf, "application/pdf");
  return { download_url: url };
}

export async function generateAdminInsurerReport(userId: string) {
  const insurers = await prisma.insurer.findMany();
  const pdf = await generatePdfReport("Insurer network report", { insurers: insurers.map((i) => ({ name: i.name, code: i.code })) });
  const url = await saveExportFile(userId, "insurer-report.pdf", pdf, "application/pdf");
  return { download_url: url };
}

export async function getEnrichedAdminPatients(limit = 50) {
  const patients = await prisma.patient.findMany({
    where: { isActive: true },
    take: limit,
    include: { user: { select: { email: true } }, insurerMembers: { include: { insurer: true } } },
    orderBy: { createdAt: "desc" },
  });
  const result = [];
  for (const p of patients) {
    const visits = await prisma.visit.count({ where: { patientId: p.id } });
    const flag = (await getOrgSettings("admin_patient_flag", p.id)) as { flagged?: boolean };
    result.push({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.user.email,
      insurer: p.insurerMembers[0]?.insurer?.name,
      visit_count: visits,
      flagged: flag.flagged ?? false,
    });
  }
  return result;
}

export async function getTransactionsLedger(limit = 100) {
  const entries = await prisma.activityFeedEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return entries.map((e) => ({
    id: e.id,
    kind: e.kind,
    description: e.text,
    amount: (e.metadata as { amount?: number })?.amount ?? 0,
    at: e.createdAt,
  }));
}

export async function submitOnboardingExtended(input: {
  type: OnboardingType;
  name: string;
  registration_ref: string;
  location?: string;
  submitted_by_email: string;
  phone?: string;
  password?: string;
  manager_name?: string;
}) {
  const { createOnboardingRequest } = await import("./admin.service.js");
  const row = await createOnboardingRequest({
    type: input.type,
    name: input.name,
    registration_ref: input.registration_ref,
    location: input.location,
    submitted_by_email: input.submitted_by_email,
  });
  if (input.phone && input.password && input.type === "pharmacy") {
    await setOrgSettings("onboarding_credentials", row.id, {
      phone: input.phone,
      manager_name: input.manager_name,
    });
  }
  return row;
}

// ─── Sync extensions ────────────────────────────────────────────────────────

export async function deleteSyncQueueItem(itemId: string, userId: string) {
  const item = await prisma.syncQueue.findFirst({ where: { id: itemId, userId } });
  if (!item) throw notFound("Sync item not found");
  await prisma.syncQueue.delete({ where: { id: itemId } });
  return { deleted: true };
}

export async function resolveSyncConflict(itemId: string, userId: string, resolution: "server" | "client") {
  const item = await prisma.syncQueue.findFirst({ where: { id: itemId, userId, status: SyncStatus.conflict } });
  if (!item) throw notFound("Conflict item not found");
  if (resolution === "client") {
    const { processSyncItem } = await import("./sync.service.js");
    await prisma.syncQueue.update({ where: { id: itemId }, data: { status: SyncStatus.pending } });
    return processSyncItem(itemId, userId);
  }
  await prisma.syncQueue.update({ where: { id: itemId }, data: { status: SyncStatus.synced } });
  return { status: "synced", resolution: "server" };
}
