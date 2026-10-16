import { BASE_MESSAGES, createToUserMessage } from "@miqorai/api-client/messages";

export const MESSAGES = {
  ...BASE_MESSAGES,
  auth: {
    ...BASE_MESSAGES.auth,
    invalidCredentials: "We couldn't sign you in. Check your insurer code, email, and password.",
  },
} as const;

export const toUserMessage = createToUserMessage(MESSAGES.generic.error);
