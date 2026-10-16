import { toast as raw } from "sonner";

type ToastOpts = { description?: string };

/**
 * Wraps sonner so every toast passes through the portal's user-message filter
 * (technical errors never reach the screen verbatim).
 */
export function createNotify(toUserMessage: (input: unknown) => string, genericError: string) {
  function plain(message: string, opts?: ToastOpts) {
    raw(toUserMessage(message), opts);
  }

  return Object.assign(plain, {
    success: (message: string, opts?: ToastOpts) => raw.success(toUserMessage(message), opts),
    error: (message?: unknown, opts?: ToastOpts) =>
      raw.error(message === undefined ? genericError : toUserMessage(message), opts),
    warning: (message: string, opts?: ToastOpts) => raw.warning(toUserMessage(message), opts),
    info: (message: string, opts?: ToastOpts) => raw.info(toUserMessage(message), opts),
  });
}
