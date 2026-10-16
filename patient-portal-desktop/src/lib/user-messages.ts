import { BASE_MESSAGES, createToUserMessage } from "@miqorai/api-client/messages";

export const MESSAGES = {
  auth: {
    ...BASE_MESSAGES.auth,
    signUpFailed: "We couldn't create your account. Please try again.",
    welcomeBack: "Welcome back!",
    accountCreated: "Your account is ready.",
    signedOut: "You've been signed out.",
    accountClosed: "Your account has been closed.",
  },
  form: {
    ...BASE_MESSAGES.form,
    passwordRequired: "Password is required.",
    nameRequired: "Name is required.",
    nameAndOrg: "Name and organization are required.",
    nameAndPhone: "Name and phone are required.",
  },
  generic: {
    ...BASE_MESSAGES.generic,
    exported: "Your data export is ready.",
    revoked: "Access revoked.",
    granted: "Access granted.",
    removed: "Removed successfully.",
    added: "Added successfully.",
    submitted: "Request submitted.",
  },
} as const;

export const toUserMessage = createToUserMessage(MESSAGES.generic.error);
