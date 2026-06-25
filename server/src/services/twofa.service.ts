import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { prisma } from "../lib/prisma.js";
import { decryptText, encryptText } from "../utils/crypto.js";
import { badRequest, unauthorized } from "../utils/errors.js";

export async function setupTwoFactor(userId: string, email: string) {
  const secret = generateSecret();
  const otpauth = generateURI({ issuer: "MiqorAI", label: email, secret });
  const qr_code = await QRCode.toDataURL(otpauth);

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: encryptText(secret), twoFactorEnabled: false },
  });

  return { secret, qr_code, manual_entry_key: secret };
}

export async function enableTwoFactor(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorSecret) throw badRequest("Run 2FA setup first");

  const secret = decryptText(user.twoFactorSecret);
  const result = await verify({ secret, token });
  if (!result.valid) throw badRequest("Invalid authenticator code");

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: true },
  });

  return { enabled: true };
}

export async function disableTwoFactor(userId: string, token: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) throw badRequest("2FA is not enabled");

  const secret = decryptText(user.twoFactorSecret);
  const result = await verify({ secret, token });
  if (!result.valid) throw badRequest("Invalid authenticator code");

  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorEnabled: false, twoFactorSecret: null },
  });

  return { disabled: true };
}

export async function verifyTwoFactorToken(secretEnc: string, token: string): Promise<boolean> {
  try {
    const secret = decryptText(secretEnc);
    const result = await verify({ secret, token });
    return result.valid;
  } catch {
    return false;
  }
}

export async function assertTwoFactorIfEnabled(userId: string, totpCode?: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user?.twoFactorEnabled || !user.twoFactorSecret) return;
  if (!totpCode) throw unauthorized("2FA code required", "REQUIRES_2FA");
  if (!(await verifyTwoFactorToken(user.twoFactorSecret, totpCode))) {
    throw unauthorized("Invalid 2FA code");
  }
}
