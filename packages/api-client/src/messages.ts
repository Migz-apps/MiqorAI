/** Wording shared by every portal; portals layer their own overrides on top. */
export const BASE_MESSAGES = {
  auth: {
    invalidCredentials: "We couldn't sign you in. Check your email and password.",
    tooManyAttempts: "Too many sign-in attempts. Please wait 15 minutes and try again.",
    locked: (mins: number) => `Please wait ${mins} minute${mins === 1 ? "" : "s"} before trying again.`,
    attemptsRemaining: (n: number) => `We couldn't sign you in. ${n} attempt${n === 1 ? "" : "s"} remaining.`,
  },
  form: {
    required: "Please fill in all required fields.",
    invalidEmail: "Enter a valid email address.",
  },
  generic: {
    error: "Something went wrong. Please try again.",
    saved: "Your changes were saved.",
    copied: "Copied to clipboard.",
  },
} as const;

const TECHNICAL =
  /(\b(401|403|404|500|502|503)\b|stack|syntaxerror|typeerror|referenceerror|unhandled|rejection|fetch failed|network error|econnrefused|cors|json\.parse|undefined|null is not|sql|postgres|mongodb|firebase|supabase|axios|exception|internal server)/i;

const MAX_MESSAGE_LENGTH = 160;

/**
 * Returns a function that turns anything thrown or returned by the API into
 * text safe to show a user: technical or overly long messages collapse to the
 * generic fallback.
 */
export function createToUserMessage(fallback: string = BASE_MESSAGES.generic.error) {
  return function toUserMessage(input: unknown): string {
    if (input instanceof Error) return toUserMessage(input.message);
    if (typeof input === "string") {
      const trimmed = input.trim();
      if (!trimmed) return fallback;
      if (TECHNICAL.test(trimmed)) return fallback;
      if (trimmed.length > MAX_MESSAGE_LENGTH) return fallback;
      return trimmed;
    }
    return fallback;
  };
}

export const toUserMessage = createToUserMessage();
