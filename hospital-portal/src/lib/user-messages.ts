import { BASE_MESSAGES, createToUserMessage } from "@miqorai/api-client/messages";

export const MESSAGES = {
  auth: {
    ...BASE_MESSAGES.auth,
    invalidCredentials: "We couldn't sign you in. Check your hospital code, email, and password.",
  },
  form: {
    ...BASE_MESSAGES.form,
    missingFields: (fields: string[]) => `Please add: ${fields.join(", ")}.`,
  },
  generic: {
    ...BASE_MESSAGES.generic,
    offline: "You're offline. Changes can't be saved until the connection returns.",
  },
} as const;

export const toUserMessage = createToUserMessage(MESSAGES.generic.error);
