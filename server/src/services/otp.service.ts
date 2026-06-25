import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { config } from "../config.js";
import { hashToken } from "../utils/crypto.js";
import { badRequest } from "../utils/errors.js";
import { sendSms } from "./sms.service.js";

function generateOtpCode(): string {
  return String(crypto.randomInt(100000, 999999));
}

export async function sendOtp(phone: string): Promise<{ sent: boolean; expires_in_minutes: number }> {
  const normalized = phone.replace(/\s/g, "");
  const code = generateOtpCode();
  const expiresAt = new Date(Date.now() + config.otpExpiresMinutes * 60_000);

  await prisma.otpVerification.deleteMany({ where: { phone: normalized, verifiedAt: null } });
  await prisma.otpVerification.create({
    data: {
      phone: normalized,
      codeHash: hashToken(code),
      expiresAt,
    },
  });

  await sendSms(normalized, `Your MiqorAI verification code is ${code}. Valid for ${config.otpExpiresMinutes} minutes.`);

  return { sent: true, expires_in_minutes: config.otpExpiresMinutes };
}

export async function verifyOtp(phone: string, otp: string): Promise<{ verified: boolean }> {
  const normalized = phone.replace(/\s/g, "");
  const row = await prisma.otpVerification.findFirst({
    where: { phone: normalized, verifiedAt: null },
    orderBy: { createdAt: "desc" },
  });

  if (!row) throw badRequest("No OTP request found for this phone");
  if (row.expiresAt < new Date()) throw badRequest("OTP expired");
  if (row.attempts >= 5) throw badRequest("Too many attempts — request a new OTP");

  const valid = row.codeHash === hashToken(otp);
  if (!valid) {
    await prisma.otpVerification.update({
      where: { id: row.id },
      data: { attempts: { increment: 1 } },
    });
    throw badRequest("Invalid OTP");
  }

  await prisma.otpVerification.update({
    where: { id: row.id },
    data: { verifiedAt: new Date() },
  });

  await prisma.user.updateMany({
    where: { phone: normalized },
    data: { isActive: true },
  });

  return { verified: true };
}

export async function isPhoneVerified(phone: string): Promise<boolean> {
  const normalized = phone.replace(/\s/g, "");
  const row = await prisma.otpVerification.findFirst({
    where: { phone: normalized, verifiedAt: { not: null } },
    orderBy: { verifiedAt: "desc" },
  });
  return Boolean(row && row.verifiedAt && row.verifiedAt > new Date(Date.now() - 24 * 3600_000));
}
