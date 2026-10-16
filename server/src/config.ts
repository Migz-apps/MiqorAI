import dotenv from "dotenv";
dotenv.config();

const nodeEnv = process.env.NODE_ENV ?? "development";
const isProduction = nodeEnv === "production";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

function requiredInProduction(name: string, fallback: string): string {
  const value = process.env[name]?.trim();
  if (value) return value;
  if (isProduction) throw new Error(`Missing env ${name} in production`);
  return fallback;
}

function normalizeUrl(value: string): string {
  return value.trim().replace(/\/$/, "");
}

const rawCorsOrigins = requiredInProduction("CORS_ORIGINS", "http://localhost:5173");
const corsOrigins = rawCorsOrigins
  .split(",")
  .map((s) => normalizeUrl(s))
  .filter(Boolean);

const baseUrl = normalizeUrl(requiredInProduction("BASE_URL", "http://localhost:3000"));

type PortalTarget = "patient" | "hospital" | "insurance" | "pharmacy" | "admin";

const portalOriginHints: Record<PortalTarget, string[]> = {
  patient: ["patient"],
  hospital: ["hospital"],
  insurance: ["insurance", "insurer"],
  pharmacy: ["pharmacy"],
  admin: ["admin"],
};

function inferPortalUrl(target: PortalTarget): string | undefined {
  const hints = portalOriginHints[target];
  return corsOrigins.find((origin) => hints.some((hint) => origin.toLowerCase().includes(hint)));
}

function resolvePortalUrl(target: PortalTarget, envName: string, localFallback: string): string {
  const explicit = process.env[envName]?.trim();
  if (explicit) return normalizeUrl(explicit);

  const inferred = inferPortalUrl(target);
  if (inferred) return inferred;

  if (!isProduction) return normalizeUrl(localFallback);

  return baseUrl;
}

/** Non-fatal configuration problems, logged once at startup (src/index.ts). */
export const configWarnings: string[] = [];

/** AI_SERVICE_BASE_URL is canonical; AI_SERVICE_URL is a deprecated fallback.
 * Read at call time too (getAiServiceConfig), so it takes the env explicitly. */
export function resolveAiServiceBaseUrl(env: NodeJS.ProcessEnv = process.env): {
  url: string;
  warning?: string;
} {
  const canonical = normalizeUrl(env.AI_SERVICE_BASE_URL ?? "");
  const legacy = normalizeUrl(env.AI_SERVICE_URL ?? "");
  if (canonical) {
    return legacy && legacy !== canonical
      ? {
          url: canonical,
          warning: "AI_SERVICE_URL (deprecated) differs from AI_SERVICE_BASE_URL and is ignored; remove AI_SERVICE_URL",
        }
      : { url: canonical };
  }
  if (legacy) {
    return { url: legacy, warning: "AI_SERVICE_URL is deprecated; rename it to AI_SERVICE_BASE_URL" };
  }
  return { url: "" };
}

const aiServiceBase = resolveAiServiceBaseUrl();
if (aiServiceBase.warning) configWarnings.push(aiServiceBase.warning);

function resolvePlatformTimezone(): string {
  const tz = process.env.PLATFORM_TIMEZONE?.trim() || "Africa/Kigali";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
  } catch {
    throw new Error(`Invalid PLATFORM_TIMEZONE "${tz}" (expected an IANA zone such as Africa/Kigali)`);
  }
  return tz;
}

/** Express `trust proxy`: "true"/"false", a hop count, or a comma list of
 * addresses/subnets. Defaults to 1 hop (Render router / ingress-nginx) in
 * production and off elsewhere, so req.ip is the real client IP. */
function resolveTrustProxy(): boolean | number | string {
  const raw = process.env.TRUST_PROXY?.trim();
  if (!raw) return isProduction ? 1 : false;
  if (raw === "true") return true;
  if (raw === "false") return false;
  if (/^\d+$/.test(raw)) return parseInt(raw, 10);
  return raw;
}

function intEnv(name: string, fallback: number): number {
  const parsed = parseInt(process.env[name] ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv,
  databaseUrl: required("DATABASE_URL"),
  supabaseUrl: (process.env.SUPABASE_URL ?? "").replace(/\/$/, ""),
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
  supabaseStorageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "miqorai-uploads",
  redisUrl: requiredInProduction("REDIS_URL", "redis://localhost:6379"),
  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  encryptionKey: required("ENCRYPTION_KEY"),
  fileSigningSecret: required("FILE_SIGNING_SECRET"),
  qrSecret: required("QR_SECRET"),
  // Validity window of a patient QR code. QR_REFRESH_SECONDS is the legacy name.
  qrTtlSeconds: parseInt(
    process.env.QR_TTL_SECONDS ?? process.env.QR_REFRESH_SECONDS ?? "300",
    10,
  ),
  smtp: {
    host: process.env.SMTP_HOST?.trim() ?? (isProduction ? "" : "localhost"),
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "noreply@miqorai.com",
    redirectAllTo: (process.env.EMAIL_REDIRECT_ALL_TO ?? "").trim(),
    secure: process.env.SMTP_SECURE === "true" || process.env.SMTP_PORT === "465",
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? "log",
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    fromNumber: process.env.SMS_FROM_NUMBER ?? "",
  },
  corsOrigins,
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  invitationExpiryDays: parseInt(process.env.INVITATION_EXPIRY_DAYS ?? "7", 10),
  rateLimit: {
    // Authenticated requests are counted per user (a clinic NAT shares one IP).
    perUserPerMinute: intEnv("RATE_LIMIT_PER_USER_PER_MINUTE", 300),
    // Unauthenticated requests are counted per client IP. RATE_LIMIT_PER_MINUTE is the legacy name.
    perIpPerMinute: intEnv(
      process.env.RATE_LIMIT_PER_IP_PER_MINUTE ? "RATE_LIMIT_PER_IP_PER_MINUTE" : "RATE_LIMIT_PER_MINUTE",
      600,
    ),
  },
  trustProxy: resolveTrustProxy(),
  // IANA zone that defines "today"/"this month" for dashboards and day filters.
  platformTimezone: resolvePlatformTimezone(),
  // Grace period for in-flight requests on SIGTERM/SIGINT before a forced exit.
  shutdownTimeoutMs: intEnv("SHUTDOWN_TIMEOUT_MS", 10_000),
  auditArchiveDays: parseInt(process.env.AUDIT_ARCHIVE_DAYS ?? "365", 10),
  otpExpiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES ?? "10", 10),
  passwordResetExpiresMinutes: parseInt(process.env.PASSWORD_RESET_EXPIRES_MINUTES ?? "60", 10),
  authChallengeResendCooldownSeconds: parseInt(process.env.AUTH_CHALLENGE_RESEND_COOLDOWN_SECONDS ?? "45", 10),
  authChallengeMaxAttempts: parseInt(process.env.AUTH_CHALLENGE_MAX_ATTEMPTS ?? "5", 10),
  baseUrl,
  portalUrls: {
    patient: resolvePortalUrl("patient", "PATIENT_PORTAL_URL", "http://localhost:5173"),
    hospital: resolvePortalUrl("hospital", "HOSPITAL_PORTAL_URL", "http://localhost:8080"),
    insurance: resolvePortalUrl("insurance", "INSURANCE_PORTAL_URL", "http://localhost:8081"),
    pharmacy: resolvePortalUrl("pharmacy", "PHARMACY_PORTAL_URL", "http://localhost:8082"),
    admin: resolvePortalUrl("admin", "ADMIN_PORTAL_URL", "http://localhost:8083"),
  },
  aiServiceUrl: aiServiceBase.url,
  aiServiceApiKey: process.env.AI_SERVICE_API_KEY ?? "",
  aiServiceTimeoutSeconds: parseInt(process.env.AI_SERVICE_TIMEOUT_SECONDS ?? "60", 10),
  aiServiceEnabled: process.env.AI_SERVICE_ENABLED !== "false",
  aiMock: process.env.MIQORAI_AI_MOCK === "true",
  // When true, prescriptions and lab orders are blocked (pending doctor action)
  // if the clinical-safety service is disabled or unconfigured, instead of
  // proceeding without a safety gate.
  clinicalSafetyRequired: process.env.CLINICAL_SAFETY_REQUIRED === "true",
};
