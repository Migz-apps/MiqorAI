import { PharmacyStaffRole, InsurerStaffRole, UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { hashPassword, hashToken, randomToken } from "../utils/crypto.js";
import { badRequest, notFound } from "../utils/errors.js";
import { sendInvitationEmail } from "./notification.service.js";
import { config } from "../config.js";

export async function listPharmacyStaff(pharmacyId: string) {
  const staff = await prisma.pharmacyStaff.findMany({
    where: { pharmacyId },
    include: { user: { select: { id: true, email: true, lastLoginAt: true, isActive: true } } },
  });
  return staff.map((s) => ({
    id: s.id,
    user_id: s.userId,
    email: s.user.email,
    role: s.role,
    active: s.isActive && s.user.isActive,
    last_login: s.user.lastLoginAt,
  }));
}

export async function invitePharmacyStaff(
  pharmacyId: string,
  input: { email: string; role: PharmacyStaffRole },
) {
  const token = randomToken();
  await prisma.invitation.create({
    data: {
      email: input.email.toLowerCase(),
      role: input.role,
      organizationId: pharmacyId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.invitationExpiryDays * 86400000),
    },
  });
  await sendInvitationEmail(input.email, `${config.corsOrigins[0]}/invite?token=${token}`);
  return { invitation_sent: true };
}

export async function deactivatePharmacyStaff(pharmacyId: string, userId: string) {
  await prisma.pharmacyStaff.updateMany({
    where: { pharmacyId, userId },
    data: { isActive: false },
  });
  await prisma.user.updateMany({ where: { id: userId }, data: { isActive: false } });
}

export async function updatePharmacyStaffRole(pharmacyId: string, userId: string, role: PharmacyStaffRole) {
  const row = await prisma.pharmacyStaff.findFirst({ where: { pharmacyId, userId } });
  if (!row) throw notFound("Staff not found");
  return prisma.pharmacyStaff.update({ where: { id: row.id }, data: { role } });
}

export async function listInsurerStaff(insurerId: string) {
  const staff = await prisma.insurerStaff.findMany({
    where: { insurerId },
    include: { user: { select: { id: true, email: true, lastLoginAt: true, isActive: true } } },
  });
  return staff.map((s) => ({
    id: s.id,
    user_id: s.userId,
    email: s.user.email,
    role: s.role,
    active: s.isActive && s.user.isActive,
    last_login: s.user.lastLoginAt,
  }));
}

export async function inviteInsurerStaff(
  insurerId: string,
  input: { email: string; role: InsurerStaffRole },
) {
  const token = randomToken();
  await prisma.invitation.create({
    data: {
      email: input.email.toLowerCase(),
      role: input.role,
      organizationId: insurerId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.invitationExpiryDays * 86400000),
    },
  });
  await sendInvitationEmail(input.email, `${config.corsOrigins[0]}/invite?token=${token}`);
  return { invitation_sent: true };
}

export async function deactivateInsurerStaff(insurerId: string, userId: string) {
  await prisma.insurerStaff.updateMany({
    where: { insurerId, userId },
    data: { isActive: false },
  });
  await prisma.user.updateMany({ where: { id: userId }, data: { isActive: false } });
}

export async function updateInsurerStaffRole(insurerId: string, userId: string, role: InsurerStaffRole) {
  const row = await prisma.insurerStaff.findFirst({ where: { insurerId, userId } });
  if (!row) throw notFound("Staff not found");
  return prisma.insurerStaff.update({ where: { id: row.id }, data: { role } });
}

export async function hospitalStaffSignup(input: {
  email: string;
  password: string;
  hospital_code: string;
  role: string;
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
    },
  });
  await prisma.hospitalStaff.create({
    data: {
      hospitalId: hospital.id,
      userId: user.id,
      role: input.role as never,
      department: input.department,
    },
  });
  return { user_id: user.id, status: "pending_verification" };
}
