import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const repoRoot = process.cwd();

function read(relativePath) {
  return fs.readFileSync(path.join(repoRoot, relativePath), "utf8");
}

function expectIncludes(contents, snippet, label) {
  assert.ok(contents.includes(snippet), `${label} should include: ${snippet}`);
}

function expectMatches(contents, pattern, label) {
  assert.ok(pattern.test(contents), `${label} should match ${pattern}`);
}

const webClients = [
  "admin-portal/src/lib/api/client.ts",
  "hospital-portal/src/lib/api/client.ts",
  "insurance-portal/src/lib/api/client.ts",
  "patient-portal-desktop/src/lib/api/client.ts",
  "pharmacy-portal/src/lib/api/client.ts",
];

for (const clientPath of webClients) {
  const contents = read(clientPath);
  expectIncludes(contents, 'const PROD_API_FALLBACK = "https://miqorai.onrender.com";', clientPath);
  expectIncludes(contents, "const LOCAL_API_PATTERN =", clientPath);
  expectIncludes(contents, "function resolveApiUrl(): string {", clientPath);
  expectIncludes(contents, "if (import.meta.env.DEV) return rawApiUrl;", clientPath);
  expectIncludes(
    contents,
    "return !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl) ? PROD_API_FALLBACK : rawApiUrl;",
    clientPath,
  );
  expectIncludes(contents, 'const API_URL = resolveApiUrl().replace(/\\/$/, "");', clientPath);
}

const mobileApi = read("mobile_patient/src/lib/api.ts");
expectIncludes(mobileApi, "const PROD_API_FALLBACK = 'https://miqorai.onrender.com'", "mobile api");
expectIncludes(mobileApi, "const LOCAL_API_PATTERN =", "mobile api");
expectIncludes(mobileApi, "const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim()", "mobile api");
expectIncludes(mobileApi, "__DEV__", "mobile api");
expectIncludes(
  mobileApi,
  ": !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl)",
  "mobile api",
);

const mobileEnvExample = read("mobile_patient/.env.example");
expectIncludes(
  mobileEnvExample,
  "EXPO_PUBLIC_API_URL=https://miqorai.onrender.com",
  "mobile .env.example",
);

const mobileEnvLocal = read("mobile_patient/.env.local.example");
expectIncludes(
  mobileEnvLocal,
  "EXPO_PUBLIC_API_URL=http://192.168.x.x:3000",
  "mobile .env.local.example",
);

const mobileEnvProduction = read("mobile_patient/.env.production.example");
expectIncludes(
  mobileEnvProduction,
  "EXPO_PUBLIC_API_URL=https://miqorai.onrender.com",
  "mobile .env.production.example",
);
assert.ok(
  !mobileEnvProduction.includes("EXPO_PUBLIC_API_PORT"),
  "mobile .env.production.example should not ship local API port hints",
);

const productionEnvExamples = [
  "admin-portal/.env.production.example",
  "hospital-portal/.env.production.example",
  "insurance-portal/.env.production.example",
  "patient-portal-desktop/.env.production.example",
  "pharmacy-portal/.env.production.example",
];

for (const envPath of productionEnvExamples) {
  const contents = read(envPath).trim();
  assert.equal(
    contents,
    "VITE_API_URL=https://miqorai.onrender.com",
    `${envPath} should point at the deployed backend`,
  );
}

const serverConfig = read("server/src/config.ts");
expectIncludes(serverConfig, 'const isProduction = nodeEnv === "production";', "server config");
expectIncludes(serverConfig, "function requiredInProduction(name: string, fallback: string): string {", "server config");
expectIncludes(serverConfig, 'redisUrl: requiredInProduction("REDIS_URL", "redis://localhost:6379"),', "server config");
expectIncludes(serverConfig, 'corsOrigins: requiredInProduction("CORS_ORIGINS", "http://localhost:5173")', "server config");
expectIncludes(serverConfig, 'baseUrl: requiredInProduction("BASE_URL", "http://localhost:3000"),', "server config");
expectIncludes(
  serverConfig,
  'host: process.env.SMTP_HOST?.trim() ?? (isProduction ? "" : "localhost"),',
  "server config",
);

const notificationService = read("server/src/services/notification.service.ts");
expectIncludes(notificationService, "const smtpEnabled = Boolean(config.smtp.host) && config.smtp.host !== \"log\";", "notification service");
expectIncludes(notificationService, 'logger.info("Email (log mode)"', "notification service");

const serverEnvExample = read("server/.env.example");
expectIncludes(serverEnvExample, "NODE_ENV=production", "server .env.example");
expectMatches(serverEnvExample, /^REDIS_URL=rediss:\/\/.+$/m, "server .env.example");
expectMatches(serverEnvExample, /^SMTP_HOST=(?!localhost).+$/m, "server .env.example");
expectIncludes(serverEnvExample, "BASE_URL=https://miqorai.onrender.com", "server .env.example");
expectIncludes(serverEnvExample, "AI_SERVICE_BASE_URL=https://your-ai-service.example.com", "server .env.example");
assert.ok(!serverEnvExample.includes("ngrok"), "server .env.example should not mention ngrok");

const clinicalSafetyDoc = read("server/CLINICAL_SAFETY.md");
expectIncludes(
  clinicalSafetyDoc,
  "remote always-on FastAPI clinical-safety service over public HTTPS",
  "CLINICAL_SAFETY.md",
);
expectIncludes(
  clinicalSafetyDoc,
  "AI_SERVICE_BASE_URL=https://your-ai-service.example.com",
  "CLINICAL_SAFETY.md",
);
expectIncludes(
  clinicalSafetyDoc,
  "curl https://miqorai.onrender.com/api/v1/clinical-safety/health",
  "CLINICAL_SAFETY.md",
);
assert.ok(!clinicalSafetyDoc.includes("ngrok"), "CLINICAL_SAFETY.md should not mention ngrok");

console.log("Production wiring checks passed.");
