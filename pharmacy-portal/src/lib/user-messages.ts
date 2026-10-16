import { BASE_MESSAGES, createToUserMessage } from "@miqorai/api-client/messages";

export const MESSAGES = {
  auth: {
    ...BASE_MESSAGES.auth,
    invalidCredentials: "We couldn't sign you in. Check your pharmacy code, email, and password.",
  },
  form: BASE_MESSAGES.form,
  generic: {
    ...BASE_MESSAGES.generic,
    notFound: "We couldn't find that item.",
  },
} as const;

export const toUserMessage = createToUserMessage(MESSAGES.generic.error);
