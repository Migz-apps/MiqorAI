import { UserRole } from "@prisma/client";
import { config } from "../config.js";
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
import { assertTwoFactorIfEnabled } from "./twofa.service.js";
import { checkLoginLockout, clearLoginAttempts, recordFailedLogin } from "./portal-complete.service.js";
import { normalizeEmailInput, normalizePhoneInput } from "../utils/validation.js";
import {
  consumePatientPasswordResetChallenge,
  consumePatientRegistrationChallenge,
  createPatientPasswordResetChallenge,
  createPatientRegistrationChallenge,
  resendPatientPasswordResetChallenge,
  resendPatientRegistrationChallenge,
} from "./patient-auth-challenge.service.js";

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

async function createSession(user: {
  id: string;
  email: string;
  role: UserRole;
  organizationId: string | null;
  organizationType: string | null;
}) {
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

export async function loginUser(
  email: string,
  password: string,
  organizationCode?: string,
  totpCode?: string,
) {
  const normalizedEmail = normalizeEmailInput(email);
  await checkLoginLockout(normalizedEmail);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || !user.isActive) {
    await recordFailedLogin(normalizedEmail);
    throw unauthorized("Invalid credentials");
  }
  if (!verifyPassword(password, user.passwordHash)) {
    await recordFailedLogin(normalizedEmail);
    throw unauthorized("Invalid credentials");
  }

  if (organizationCode && user.role !== "patient" && user.role !== "super_admin") {
    const org = await resolveOrganization(organizationCode);
    if (!org || org.id !== user.organizationId) {
      await recordFailedLogin(normalizedEmail);
      throw unauthorized("Invalid organization code");
    }
  }

  await assertTwoFactorIfEnabled(user.id, totpCode);
  await clearLoginAttempts(normalizedEmail);

  return createSession(user);
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
  const email = normalizeEmailInput(input.email ?? "");
  const phone = normalizePhoneInput(input.phone);
  const existing = await prisma.user.findFirst({
    where: { OR: [{ email }, { phone }] },
  });
  if (existing) throw badRequest("User already exists");

  await createPatientRegistrationChallenge({
    full_name: input.full_name.trim(),
    email,
    phone,
    password_hash: hashPassword(input.password),
    date_of_birth: input.date_of_birth,
  });

  return {
    email,
    verification_required: true,
    delivery_channel: "email",
    otp_sent: true,
  };
}

export async function resendPatientRegistrationOtp(email: string) {
  return resendPatientRegistrationChallenge(email);
}

export async function verifyPatientRegistration(email: string, otp: string) {
  const pending = await consumePatientRegistrationChallenge(email, otp);

  const existing = await prisma.user.findFirst({
    where: {
      OR: [{ email: pending.email }, { phone: pending.phone }],
    },
  });
  if (existing) throw badRequest("User already exists");

  const parts = pending.full_name.trim().split(/\s+/);
  const firstName = parts[0];
  const lastName = parts.slice(1).join(" ") || firstName;

  const created = await prisma.$transaction(async (tx) => {
    const user = await tx.user.create({
      data: {
        email: pending.email,
        phone: pending.phone,
        passwordHash: pending.password_hash,
        role: UserRole.patient,
        organizationType: "none",
        isActive: true,
      },
    });

    const patient = await tx.patient.create({
      data: {
        userId: user.id,
        firstName,
        lastName,
        dateOfBirth: new Date(pending.date_of_birth),
      },
    });

    return { user, patient };
  });

  await regeneratePatientQr(created.patient.id);
  const qr = await getPatientQrImage(created.patient.id);
  const session = await createSession(created.user);

  return {
    ...session,
    user_id: created.user.id,
    patient_id: created.patient.id,
    qr_code: qr.qr_code,
  };
}

export async function forgotPassword(email: string) {
  const normalizedEmail = normalizeEmailInput(email);
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (!user || user.role !== UserRole.patient) return;
  const token = randomToken();
  await prisma.passwordResetToken.deleteMany({
    where: { userId: user.id, usedAt: null },
  });
  await prisma.passwordResetToken.create({
    data: {
      userId: user.id,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.passwordResetExpiresMinutes * 60_000),
    },
  });
  await createPatientPasswordResetChallenge(user.email, token);
}

export async function resendForgotPasswordOtp(email: string) {
  return resendPatientPasswordResetChallenge(email);
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

export async function verifyForgotPasswordOtp(email: string, otp: string) {
  const resetToken = await consumePatientPasswordResetChallenge(email, otp);
  return { reset_token: resetToken };
}

export async function resetPassword(token: string, newPassword: string) {
  const row = await prisma.passwordResetToken.findFirst({
    where: { tokenHash: hashToken(token), usedAt: null, expiresAt: { gt: new Date() } },
  });
  if (!row) throw badRequest("Invalid or expired token");
  await prisma.$transaction([
    prisma.user.update({
      where: { id: row.userId },
      data: { passwordHash: hashPassword(newPassword) },
    }),
    prisma.passwordResetToken.update({ where: { id: row.id }, data: { usedAt: new Date() } }),
    prisma.refreshToken.updateMany({
      where: { userId: row.userId, revoked: false },
      data: { revoked: true },
    }),
  ]);
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
