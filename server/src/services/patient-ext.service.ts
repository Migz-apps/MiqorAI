import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { decryptText, encryptText, hashPassword, randomToken, verifyPassword } from "../utils/crypto.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw notFound("User not found");
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw badRequest("Current password is incorrect");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { changed: true };
}

export async function getOrCreateRecoveryPhrase(patientId: string) {
  const patient = await prisma.patient.findUnique({ where: { id: patientId } });
  if (!patient) throw notFound("Patient not found");
  if (patient.recoveryPhraseEnc) {
    return { recovery_phrase: decryptText(patient.recoveryPhraseEnc) };
  }
  const words = Array.from({ length: 12 }, () => randomToken().slice(0, 6));
  const phrase = words.join(" ");
  await prisma.patient.update({
    where: { id: patientId },
    data: { recoveryPhraseEnc: encryptText(phrase) },
  });
  return { recovery_phrase: phrase };
}

export async function listEmergencyContacts(patientId: string) {
  return prisma.emergencyContact.findMany({
    where: { patientId },
    orderBy: [{ isPrimary: "desc" }, { createdAt: "asc" }],
  });
}

export async function createEmergencyContact(
  patientId: string,
  input: { name: string; phone: string; relationship: string; is_primary?: boolean },
) {
  if (input.is_primary) {
    await prisma.emergencyContact.updateMany({
      where: { patientId },
      data: { isPrimary: false },
    });
  }
  return prisma.emergencyContact.create({
    data: {
      patientId,
      name: input.name,
      phone: input.phone,
      relationship: input.relationship,
      isPrimary: input.is_primary ?? false,
    },
  });
}

export async function updateEmergencyContact(
  patientId: string,
  contactId: string,
  input: Partial<{ name: string; phone: string; relationship: string; is_primary: boolean }>,
) {
  const row = await prisma.emergencyContact.findFirst({ where: { id: contactId, patientId } });
  if (!row) throw notFound("Contact not found");
  if (input.is_primary) {
    await prisma.emergencyContact.updateMany({ where: { patientId }, data: { isPrimary: false } });
  }
  return prisma.emergencyContact.update({
    where: { id: contactId },
    data: {
      ...(input.name !== undefined ? { name: input.name } : {}),
      ...(input.phone !== undefined ? { phone: input.phone } : {}),
      ...(input.relationship !== undefined ? { relationship: input.relationship } : {}),
      ...(input.is_primary !== undefined ? { isPrimary: input.is_primary } : {}),
    },
  });
}

export async function deleteEmergencyContact(patientId: string, contactId: string) {
  const row = await prisma.emergencyContact.findFirst({ where: { id: contactId, patientId } });
  if (!row) throw notFound("Contact not found");
  await prisma.emergencyContact.delete({ where: { id: contactId } });
}

export async function requestDataDeletion(patientId: string, reason?: string) {
  const existing = await prisma.dataDeletionRequest.findFirst({
    where: { patientId, status: { in: ["pending", "processing"] } },
  });
  if (existing) return existing;
  return prisma.dataDeletionRequest.create({
    data: { patientId, reason, status: "pending" },
  });
}

export async function getPatientHealthInsights(patientId: string) {
  const [conditions, allergies, activeMeds, recentLabs] = await Promise.all([
    prisma.medicalRecord.count({ where: { patientId, recordType: "diagnosis", isActive: true } }),
    prisma.medicalRecord.findMany({ where: { patientId, recordType: "allergy", isActive: true }, take: 5 }),
    prisma.prescription.count({
      where: { patientId, status: { in: ["pending", "verified", "ready", "sent_to_pharmacy"] } },
    }),
    prisma.labOrder.findMany({
      where: { patientId, status: "completed" },
      orderBy: { orderedAt: "desc" },
      take: 3,
    }),
  ]);

  const allergyNames = allergies.map((a) => (a.data as { name?: string }).name ?? "Unknown").join(", ");
  const summary =
    conditions > 0 || activeMeds > 0
      ? `You have ${conditions} active condition(s), ${activeMeds} active prescription(s)` +
        (allergyNames ? `, and documented allergies (${allergyNames}).` : ".") +
        (recentLabs.length
          ? ` Recent labs include ${recentLabs.map((l) => l.testName).join(", ")}.`
          : "")
      : "Your health record is up to date. No critical insights at this time.";

  return {
    summary,
    conditions_count: conditions,
    active_prescriptions: activeMeds,
    allergies_count: allergies.length,
    recent_labs: recentLabs.map((l) => ({ test: l.testName, date: l.orderedAt, results: l.results })),
  };
}

export async function getFamilyMemberProfile(primaryPatientId: string, dependentPatientId: string) {
  const link = await prisma.familyMember.findFirst({
    where: {
      primaryPatientId,
      dependentPatientId,
      isActive: true,
    },
  });
  if (!link) throw forbidden("No access to this family member");

  const patient = await prisma.patient.findUnique({
    where: { id: dependentPatientId, isActive: true },
    include: {
      user: { select: { email: true, phone: true } },
      medicalRecords: { where: { isActive: true }, take: 20, orderBy: { recordedAt: "desc" } },
      prescriptions: { take: 10, orderBy: { prescribedAt: "desc" }, include: { items: true } },
    },
  });
  if (!patient) throw notFound("Family member not found");

  return {
    id: patient.id,
    name: `${patient.firstName} ${patient.lastName}`,
    date_of_birth: patient.dateOfBirth,
    relationship: link.relationship,
    access_level: link.accessLevel,
    records: patient.medicalRecords,
    prescriptions: patient.prescriptions,
  };
}

export function generateStaffSignupToken(): string {
  return crypto.randomBytes(24).toString("hex");
}
