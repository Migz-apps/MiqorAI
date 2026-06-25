import { UserRole } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import {
  hashPassword,
  hashToken,
  randomToken,
  signAccessToken,
  signRefreshToken,
  verifyPassword,
  verifyRefreshToken,
} from "../utils/crypto.js";
import { badRequest, unauthorized } from "../utils/errors.js";
import { getPatientQrImage, regeneratePatientQr } from "./qr.service.js";
import { getRedis } from "../lib/redis.js";
import { sendPasswordResetEmail } from "./notification.service.js";
import { config } from "../config.js";
import { assertTwoFactorIfEnabled } from "./twofa.service.js";
import { sendOtp } from "./otp.service.js";
import { checkLoginLockout, clearLoginAttempts, recordFailedLogin } from "./portal-complete.service.js";

async function resolveOrganization(code?: string) {
  if (!code) return null;
  const hospital = await prisma.hospital.findFirst({ where: { code, isActive: true } });
  if (hospital) return { id: hospital.id, type: "hospital" as const };
  const pharmacy = await prisma.pharmacy.findFirst({ where: { code, isActive: true } });
  if (pharmacy) return { id: pharmacy.id, type: "pharmacy" as const };
  const insurer = await prisma.insurer.findFirst({ where: { code, isActive: true } });
  if (insurer) return { id: insurer.id, type: "insurer" as const };
  return null;
}

export async function loginUser(
  email: string,
  password: string,
  organizationCode?: string,
  totpCode?: string,
) {
  await checkLoginLockout(email);
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user || !user.isActive) {
    await recordFailedLogin(email);
    throw unauthorized("Invalid credentials");
  }
  if (!verifyPassword(password, user.passwordHash)) {
    await recordFailedLogin(email);
    throw unauthorized("Invalid credentials");
  }

  if (organizationCode && user.role !== "patient" && user.role !== "super_admin") {
    const org = await resolveOrganization(organizationCode);
    if (!org || org.id !== user.organizationId) {
      await recordFailedLogin(email);
      throw unauthorized("Invalid organization code");
    }
  }

  await assertTwoFactorIfEnabled(user.id, totpCode);
  await clearLoginAttempts(email);

  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role,
    organizationId: user.organizationId,
    organizationType: user.organizationType,
  });
  const refreshToken = signRefreshToken(user.id);

  await prisma.refreshToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(refreshToken),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  });

  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });

  return {
    access_token: accessToken,
    refresh_token: refreshToken,
    user: {
      id: user.id,
      email: user.email,
      role: user.role,
      organization_id: user.organizationId,
      organization_type: user.organizationType ?? "none",
    },
  };
}

export async function refreshAccessToken(refreshToken: string) {
  const { sub } = verifyRefreshToken(refreshToken);
  const stored = await prisma.refreshToken.findFirst({
    where: { userId: sub, tokenHash: hashToken(refreshToken), revoked: false },
  });
  if (!stored || stored.expiresAt < new Date()) throw unauthorized("Invalid refresh token");

  const user = await prisma.user.findUnique({ where: { id: sub } });
  if (!user || !user.isActive) throw unauthorized("User inactive");

  return {
    access_token: signAccessToken({
      sub: user.id,
      email: user.email,
      role: user.role,
      organizationId: user.organizationId,
      organizationType: user.organizationType,
    }),
  };
}

export async function logoutUser(refreshToken: string, accessToken?: string) {
  await prisma.refreshToken.updateMany({
    where: { tokenHash: hashToken(refreshToken) },
    data: { revoked: true },
  });
  const redis = getRedis();
  if (accessToken && redis.status === "ready") {
    await redis.setex(`bl:${hashToken(accessToken)}`, 900, "1");
  }
}

export async function registerPatient(input: {
  phone: string;
  password: string;
  full_name: string;
  date_of_birth: string;
  email?: string;
}) {
  const email = (input.email ?? `${input.phone.replace(/\D/g, "")}@patients.miqorai.local`).toLowerCase();
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone: input.phone }] },
  });
  if (existing) throw badRequest("User already exists");

  const parts = input.full_name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || firstName;

  const user = await prisma.user.create({
    data: {
      email,
      phone: input.phone,
      passwordHash: hashPassword(input.password),
      role: UserRole.patient,
      organizationType: "none",
    },
  });

  const patient = await prisma.patient.create({
    data: {
      userId: user.id,
      firstName,
      lastName,
      dateOfBirth: new Date(input.date_of_birth),
    },
  });

  await regeneratePatientQr(patient.id);
  const qr = await getPatientQrImage(patient.id);
  await sendOtp(input.phone);

  return { user_id: user.id, patient_id: patient.id, qr_code: qr.qr_code, otp_sent: true };
}

export async function forgotPassword(email: string) {
  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) return;
  const token = randomToken();
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + 3600_000),
    },
  });
  await sendPasswordResetEmail(user.email, `${config.corsOrigins[0]}/reset?token=${token}`);
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw badRequest("User not found");
  if (!verifyPassword(currentPassword, user.passwordHash)) {
    throw badRequest("Current password is incorrect");
  }
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  return { changed: true };
}

export async function resetPassword(token: string, newPassword: string) {
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) throw badRequest("Invalid or expired token");
  await prisma.user.update({
    where: { id: row.userId },
    data: { passwordHash: hashPassword(newPassword) },
  });
  await prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } });
}

export async function getCurrentUser(userId: string) {
  return prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      phone: true,
      role: true,
      organizationId: true,
      organizationType: true,
      isActive: true,
      lastLoginAt: true,
    },
  });
}
