import crypto from "crypto";

/** Cryptographically random six-digit code (100000-999999). */
export function generateSixDigitCode(): string {
  return String(crypto.randomInt(100000, 1000000));
}
