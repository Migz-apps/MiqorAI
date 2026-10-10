import { prisma } from "../../shared/lib/prisma.js";
import { AppError } from "../../shared/utils/errors.js";

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
