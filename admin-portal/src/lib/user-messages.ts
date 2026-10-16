import { BASE_MESSAGES, createToUserMessage } from "@miqorai/api-client/messages";

export const MESSAGES = BASE_MESSAGES;

export const toUserMessage = createToUserMessage(MESSAGES.generic.error);
