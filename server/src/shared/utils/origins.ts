import { config } from "../../config.js";

const allowedOrigins = new Set(config.corsOrigins.filter(Boolean));

function isLocalDevOrigin(origin: string): boolean {
  try {
    const host = new URL(origin).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1";
  } catch {
    return false;
  }
}

/** Production: exactly the origins listed in CORS_ORIGINS.
 * Development: those plus localhost/127.0.0.1 on any port. */
export function isAllowedOrigin(origin: string): boolean {
  if (allowedOrigins.has(origin)) return true;
  return config.nodeEnv !== "production" && isLocalDevOrigin(origin);
}
