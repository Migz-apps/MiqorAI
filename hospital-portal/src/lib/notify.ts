import { createNotify } from "@miqorai/ui/notify";
import { MESSAGES, toUserMessage } from "./user-messages";

export const toast = createNotify(toUserMessage, MESSAGES.generic.error);

export { MESSAGES, toUserMessage };
