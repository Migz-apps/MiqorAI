import { z } from "zod";

const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;
const OTP_PATTERN = /^\d{6}$/;
const NAME_PATTERN = /^[\p{L}][\p{L}\s'.-]{1,119}$/u;

function preprocessString(value: unknown) {
  return typeof value === "string" ? value.trim() : value;
}

function parseIsoDate(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date;
}

export function normalizeEmailInput(value: string) {
  return value.trim().toLowerCase();
}

export function normalizePhoneInput(value: string) {
  return value.replace(/[\s()-]/g, "");
}

export const emailSchema = z.preprocess(
  preprocessString,
  z.string().email("Enter a valid email address").max(254).transform(normalizeEmailInput),
);

export const phoneSchema = z.preprocess(
  (value) => (typeof value === "string" ? normalizePhoneInput(value.trim()) : value),
  z.string().regex(PHONE_PATTERN, "Enter a valid phone number in international format"),
);

export const optionalPhoneSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const normalized = normalizePhoneInput(value.trim());
    return normalized || undefined;
  },
  z
    .string()
    .regex(PHONE_PATTERN, "Enter a valid phone number in international format")
    .optional(),
);

export const personNameSchema = z.preprocess(
  preprocessString,
  z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long")
    .regex(NAME_PATTERN, "Enter a valid name"),
);

export const optionalPersonNameSchema = z.preprocess(
  (value) => {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    return trimmed || undefined;
  },
  z
    .string()
    .min(2, "Name must be at least 2 characters")
    .max(120, "Name is too long")
    .regex(NAME_PATTERN, "Enter a valid name")
    .optional(),
);

export const strongPasswordSchema = z
  .string()
  .min(10, "Password must be at least 10 characters")
  .max(128, "Password is too long")
  .regex(/[a-z]/, "Password must include a lowercase letter")
  .regex(/[A-Z]/, "Password must include an uppercase letter")
  .regex(/\d/, "Password must include a number")
  .regex(/[^A-Za-z0-9]/, "Password must include a special character");

export const otpCodeSchema = z.preprocess(
  preprocessString,
  z.string().regex(OTP_PATTERN, "Enter the 6-digit code"),
);

export const dateStringSchema = z.preprocess(
  preprocessString,
  z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the YYYY-MM-DD date format")
    .refine((value) => parseIsoDate(value) !== null, "Enter a valid calendar date")
    .refine((value) => {
      const parsed = parseIsoDate(value);
      return parsed !== null && parsed.getTime() <= Date.now();
    }, "Date cannot be in the future")
    .refine((value) => {
      const parsed = parseIsoDate(value);
      if (!parsed) return false;
      const oldestAllowed = new Date();
      oldestAllowed.setUTCFullYear(oldestAllowed.getUTCFullYear() - 130);
      return parsed >= oldestAllowed;
    }, "Date is outside the supported range"),
);

