export const MESSAGES = {
  auth: {
    invalidCredentials: "We couldn't sign you in. Check your hospital code, email, and password.",
    tooManyAttempts: "Too many sign-in attempts. Please wait 15 minutes and try again.",
    locked: (mins: number) =>
      `Please wait ${mins} minute${mins === 1 ? "" : "s"} before trying again.`,
    attemptsRemaining: (n: number) =>
      `We couldn't sign you in. ${n} attempt${n === 1 ? "" : "s"} remaining.`,
  },
  form: {
    required: "Please fill in all required fields.",
    invalidEmail: "Enter a valid email address.",
    missingFields: (fields: string[]) => `Please add: ${fields.join(", ")}.`,
  },
  generic: {
    error: "Something went wrong. Please try again.",
    saved: "Your changes were saved.",
    copied: "Copied to clipboard.",
    offline: "You're offline. Changes will sync when you're back online.",
  },
} as const;

const TECHNICAL =
  /(\b(401|403|404|500|502|503)\b|stack|syntaxerror|typeerror|referenceerror|unhandled|rejection|fetch failed|network error|econnrefused|cors|json\.parse|undefined|null is not|sql|postgres|mongodb|firebase|supabase|axios|exception|internal server)/i;

export function toUserMessage(input: unknown): string {
  if (typeof input === "string") {
    const trimmed = input.trim();
    if (!trimmed) return MESSAGES.generic.error;
    if (TECHNICAL.test(trimmed)) return MESSAGES.generic.error;
    if (trimmed.length > 160) return MESSAGES.generic.error;
    return trimmed;
  }
  return MESSAGES.generic.error;
}
