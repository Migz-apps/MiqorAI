import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { hashToken } from "../utils/crypto.js";
import { badRequest } from "../utils/errors.js";
import {
  sendPasswordResetEmail,
  sendPatientVerificationEmail,
} from "./notification.service.js";
import { buildPortalUrl } from "./portal-url.service.js";
import { generateSixDigitCode } from "../utils/one-time-code.js";
import { normalizeEmailInput, normalizePhoneInput } from "../utils/validation.js";

type PendingRegistrationPayload = {
  full_name: string;
  email: string;
  phone: string;
  password_hash: string;
  date_of_birth: string;
};

type PasswordResetPayload = {
  reset_token: string;
};

const PURPOSE_REGISTRATION = "patient_registration";
const PURPOSE_PASSWORD_RESET = "patient_password_reset";

function normalizeEmail(email: string): string {
  return normalizeEmailInput(email);
}

function normalizePhone(phone: string): string {
  return normalizePhoneInput(phone);
}

function parseRegistrationPayload(payload: unknown): PendingRegistrationPayload {
  if (!payload || typeof payload !== "object") {
    throw badRequest("Registration challenge is invalid");
  }

  const value = payload as Record<string, unknown>;
  const full_name = typeof value.full_name === "string" ? value.full_name : "";
  const email = typeof value.email === "string" ? value.email : "";
  const phone = typeof value.phone === "string" ? value.phone : "";
  const password_hash = typeof value.password_hash === "string" ? value.password_hash : "";
  const date_of_birth = typeof value.date_of_birth === "string" ? value.date_of_birth : "";

  if (!full_name || !email || !phone || !password_hash || !date_of_birth) {
    throw badRequest("Registration challenge is incomplete");
  }

  return { full_name, email, phone, password_hash, date_of_birth };
}

function parsePasswordResetPayload(payload: unknown): PasswordResetPayload {
  if (!payload || typeof payload !== "object") {
    throw badRequest("Password reset challenge is invalid");
  }

  const value = payload as Record<string, unknown>;
  const reset_token = typeof value.reset_token === "string" ? value.reset_token : "";
  if (!reset_token) throw badRequest("Password reset challenge is incomplete");
  return { reset_token };
}

async function getLatestChallenge(email: string, purpose: string) {
  return prisma.authChallenge.findFirst({
    where: {
      email,
      purpose,
      consumedAt: null,
    },
    orderBy: { createdAt: "desc" },
  });
}

async function enforceResendCooldown(email: string, purpose: string) {
  const latest = await getLatestChallenge(email, purpose);
  if (!latest) return;

  const cooldownMs = config.authChallengeResendCooldownSeconds * 1000;
  const nextAllowedAt = latest.createdAt.getTime() + cooldownMs;
  if (nextAllowedAt > Date.now()) {
    throw badRequest("Please wait before requesting another code", {
      retry_after_seconds: Math.ceil((nextAllowedAt - Date.now()) / 1000),
    });
  }
}

async function invalidateOpenChallenges(email: string, purpose: string) {
  await prisma.authChallenge.updateMany({
    where: { email, purpose, consumedAt: null },
    data: { consumedAt: new Date() },
  });
}

export async function createPatientRegistrationChallenge(input: PendingRegistrationPayload) {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);

  await enforceResendCooldown(email, PURPOSE_REGISTRATION);
  await invalidateOpenChallenges(email, PURPOSE_REGISTRATION);

  const code = generateSixDigitCode();
  await prisma.authChallenge.create({
    data: {
      email,
      purpose: PURPOSE_REGISTRATION,
      codeHash: hashToken(code),
      expiresAt: new Date(Date.now() + config.otpExpiresMinutes * 60_000),
      payload: {
        ...input,
        email,
        phone,
      },
    },
  });

  await sendPatientVerificationEmail(email, code, config.otpExpiresMinutes);
  return {
    sent: true,
    channel: "email" as const,
    expires_in_minutes: config.otpExpiresMinutes,
  };
}

export async function resendPatientRegistrationChallenge(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const latest = await getLatestChallenge(normalizedEmail, PURPOSE_REGISTRATION);
  if (!latest) throw badRequest("No pending verification found for this email");

  const payload = parseRegistrationPayload(latest.payload);
  return createPatientRegistrationChallenge(payload);
}

export async function consumePatientRegistrationChallenge(email: string, code: string) {
  const normalizedEmail = normalizeEmail(email);
  const challenge = await getLatestChallenge(normalizedEmail, PURPOSE_REGISTRATION);
  if (!challenge) throw badRequest("No pending verification found for this email");
  if (challenge.expiresAt < new Date()) throw badRequest("Verification code expired");
  if (challenge.attempts >= config.authChallengeMaxAttempts) {
    throw badRequest("Too many attempts. Request a new verification code.");
  }

  const valid = challenge.codeHash === hashToken(code.trim());
  if (!valid) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw badRequest("Invalid verification code");
  }

  const payload = parseRegistrationPayload(challenge.payload);
  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return payload;
}

export async function createPatientPasswordResetChallenge(email: string, resetToken: string) {
  const normalizedEmail = normalizeEmail(email);

  await enforceResendCooldown(normalizedEmail, PURPOSE_PASSWORD_RESET);
  await invalidateOpenChallenges(normalizedEmail, PURPOSE_PASSWORD_RESET);

  const code = generateSixDigitCode();
  const expiresAt = new Date(Date.now() + config.passwordResetExpiresMinutes * 60_000);

  await prisma.authChallenge.create({
    data: {
      email: normalizedEmail,
      purpose: PURPOSE_PASSWORD_RESET,
      codeHash: hashToken(code),
      expiresAt,
      payload: { reset_token: resetToken },
    },
  });

  const resetUrl = buildPortalUrl("patient", `/login?reset_token=${encodeURIComponent(resetToken)}`);
  await sendPasswordResetEmail(
    normalizedEmail,
    resetUrl,
    code,
    config.passwordResetExpiresMinutes,
  );

  return {
    sent: true,
    channel: "email" as const,
    expires_in_minutes: config.passwordResetExpiresMinutes,
  };
}

export async function resendPatientPasswordResetChallenge(email: string) {
  const normalizedEmail = normalizeEmail(email);
  const latest = await getLatestChallenge(normalizedEmail, PURPOSE_PASSWORD_RESET);
  if (!latest) throw badRequest("No pending password reset found for this email");

  const payload = parsePasswordResetPayload(latest.payload);
  return createPatientPasswordResetChallenge(normalizedEmail, payload.reset_token);
}

export async function consumePatientPasswordResetChallenge(email: string, code: string): Promise<string> {
  const normalizedEmail = normalizeEmail(email);
  const challenge = await getLatestChallenge(normalizedEmail, PURPOSE_PASSWORD_RESET);
  if (!challenge) throw badRequest("No pending password reset found for this email");
  if (challenge.expiresAt < new Date()) throw badRequest("Reset code expired");
  if (challenge.attempts >= config.authChallengeMaxAttempts) {
    throw badRequest("Too many attempts. Request a new password reset code.");
  }

  const valid = challenge.codeHash === hashToken(code.trim());
  if (!valid) {
    await prisma.authChallenge.update({
      where: { id: challenge.id },
      data: { attempts: { increment: 1 } },
    });
    throw badRequest("Invalid reset code");
  }

  const payload = parsePasswordResetPayload(challenge.payload);
  await prisma.authChallenge.update({
    where: { id: challenge.id },
    data: { consumedAt: new Date() },
  });

  return payload.reset_token;
}
