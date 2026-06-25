import dotenv from "dotenv";
dotenv.config();

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env ${name}`);
  return v;
}

export const config = {
  port: parseInt(process.env.PORT ?? "3000", 10),
  nodeEnv: process.env.NODE_ENV ?? "development",
  databaseUrl: required("DATABASE_URL"),
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  jwtSecret: required("JWT_SECRET"),
  jwtRefreshSecret: required("JWT_REFRESH_SECRET"),
  jwtAccessExpires: process.env.JWT_ACCESS_EXPIRES ?? "15m",
  jwtRefreshExpires: process.env.JWT_REFRESH_EXPIRES ?? "7d",
  encryptionKey: required("ENCRYPTION_KEY"),
  fileSigningSecret: required("FILE_SIGNING_SECRET"),
  qrSecret: required("QR_SECRET"),
  qrRefreshSeconds: parseInt(process.env.QR_REFRESH_SECONDS ?? "60", 10),
  smtp: {
    host: process.env.SMTP_HOST ?? "localhost",
    port: parseInt(process.env.SMTP_PORT ?? "1025", 10),
    user: process.env.SMTP_USER ?? "",
    pass: process.env.SMTP_PASS ?? "",
    from: process.env.SMTP_FROM ?? "noreply@miqorai.com",
  },
  sms: {
    provider: process.env.SMS_PROVIDER ?? "log",
    accountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
    authToken: process.env.TWILIO_AUTH_TOKEN ?? "",
    fromNumber: process.env.SMS_FROM_NUMBER ?? "",
  },
  corsOrigins: (process.env.CORS_ORIGINS ?? "http://localhost:5173")
    .split(",")
    .map((s) => s.trim()),
  uploadDir: process.env.UPLOAD_DIR ?? "./uploads",
  invitationExpiryDays: parseInt(process.env.INVITATION_EXPIRY_DAYS ?? "7", 10),
  rateLimitPerMinute: parseInt(process.env.RATE_LIMIT_PER_MINUTE ?? "100", 10),
  auditArchiveDays: parseInt(process.env.AUDIT_ARCHIVE_DAYS ?? "365", 10),
  otpExpiresMinutes: parseInt(process.env.OTP_EXPIRES_MINUTES ?? "10", 10),
  baseUrl: process.env.BASE_URL ?? "http://localhost:3000",
};
