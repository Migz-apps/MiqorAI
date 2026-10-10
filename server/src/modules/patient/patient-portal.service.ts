import {
  AccessScope,
  FamilyAccessLevel,
  FamilyRelationship,
  GranteeType,
  Prisma,
  UserRole,
} from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { hashPassword, randomToken } from "../../shared/utils/crypto.js";
import { forbidden, notFound } from "../../shared/utils/errors.js";

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

  const { getPatientHealthInsights } = await import("./patient-insights.service.js");
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
