import { toast as raw } from "sonner";
import { MESSAGES, toUserMessage } from "./user-messages";

type ToastOpts = { description?: string };

function plain(message: string, opts?: ToastOpts) {
  raw(toUserMessage(message), opts);
}

export const toast = Object.assign(plain, {
  success: (message: string, opts?: ToastOpts) => raw.success(toUserMessage(message), opts),
  error: (message?: unknown, opts?: ToastOpts) =>
    raw.error(message === undefined ? MESSAGES.generic.error : toUserMessage(message), opts),
  warning: (message: string, opts?: ToastOpts) => raw.warning(toUserMessage(message), opts),
  info: (message: string, opts?: ToastOpts) => raw.info(toUserMessage(message), opts),
});
