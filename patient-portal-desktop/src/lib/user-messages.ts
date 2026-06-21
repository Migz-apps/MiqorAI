export const MESSAGES = {
  auth: {
    invalidCredentials: "We couldn't sign you in. Check your email and password.",
    signUpFailed: "We couldn't create your account. Please try again.",
    welcomeBack: "Welcome back!",
    accountCreated: "Your account is ready.",
    signedOut: "You've been signed out.",
    accountClosed: "Your account has been closed.",
  },
  form: {
    required: "Please fill in all required fields.",
    invalidEmail: "Enter a valid email address.",
    passwordRequired: "Password is required.",
    nameRequired: "Name is required.",
    nameAndOrg: "Name and organization are required.",
    nameAndPhone: "Name and phone are required.",
  },
  generic: {
    error: "Something went wrong. Please try again.",
    saved: "Your changes were saved.",
    copied: "Copied to clipboard.",
    exported: "Your data export is ready.",
    revoked: "Access revoked.",
    granted: "Access granted.",
    removed: "Removed successfully.",
    added: "Added successfully.",
    submitted: "Request submitted.",
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
