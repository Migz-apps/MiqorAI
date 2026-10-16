export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }

  /** Machine-readable error code from the server envelope, when present. */
  get code(): string | undefined {
    const code = (this.body as { error?: { code?: unknown } } | undefined)?.error?.code;
    return typeof code === "string" ? code : undefined;
  }
}

const MAX_PLAIN_TEXT_MESSAGE = 300;

/** Pulls a human-readable message out of the server's error envelope or a plain-text body. */
export function extractErrorMessage(body: unknown): string | undefined {
  if (typeof body === "string") {
    const text = body.trim();
    // HTML error pages and stack dumps are not messages.
    if (!text || text.startsWith("<") || text.length > MAX_PLAIN_TEXT_MESSAGE) return undefined;
    return text;
  }
  if (!body || typeof body !== "object") return undefined;
  const envelope = body as { error?: unknown; message?: unknown };
  if (envelope.error && typeof envelope.error === "object") {
    const message = (envelope.error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  if (typeof envelope.error === "string" && envelope.error.trim()) return envelope.error;
  if (typeof envelope.message === "string" && envelope.message.trim()) return envelope.message;
  return undefined;
}

/** Builds an ApiError from any failed response, JSON or not. */
export async function toApiError(res: Response): Promise<ApiError> {
  const text = await res.text().catch(() => "");
  let body: unknown = {};
  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }
  const message = extractErrorMessage(body) || res.statusText || `Request failed with status ${res.status}`;
  return new ApiError(res.status, message, body);
}
