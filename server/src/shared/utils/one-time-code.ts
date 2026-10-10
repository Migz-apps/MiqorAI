import crypto from "crypto";

const TEST_CODE = "654321";

export function generateSixDigitCode(): string {
  if ((process.env.NODE_ENV ?? "").toLowerCase() === "test") {
    return TEST_CODE;
  }

  return String(crypto.randomInt(100000, 999999));
}

export function getTestSixDigitCode(): string {
  return TEST_CODE;
}
