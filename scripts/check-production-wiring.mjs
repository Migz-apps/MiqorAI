// Static production-wiring checks: API URL resolution, env templates vs code,
// and the central deployment layout (deploy/docker, deploy/k8s, Vercel, Render).
// Runs without network, Docker or Kubernetes. Every failure is collected and
// reported together; a missing file is reported, never thrown as ENOENT.
//
//   npm run test:production:wiring
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];
let checks = 0;

function fail(message) {
  failures.push(message);
}

function exists(relativePath) {
  return fs.existsSync(path.join(repoRoot, relativePath));
}

/** Returns file contents, or null after recording a clear "missing file" failure. */
function read(relativePath) {
  checks++;
  const full = path.join(repoRoot, relativePath);
  if (!fs.existsSync(full)) {
    fail(`${relativePath}: file is missing`);
    return null;
  }
  return fs.readFileSync(full, "utf8");
}

function expect(condition, message) {
  checks++;
  if (!condition) fail(message);
}

function expectIncludes(contents, snippet, label) {
  if (contents === null) return;
  expect(contents.includes(snippet), `${label} should include: ${snippet}`);
}

function expectMatches(contents, pattern, label) {
  if (contents === null) return;
  expect(pattern.test(contents), `${label} should match ${pattern}`);
}

function readJson(relativePath) {
  const contents = read(relativePath);
  if (contents === null) return null;
  try {
    return JSON.parse(contents);
  } catch (err) {
    fail(`${relativePath}: invalid JSON (${err.message})`);
    return null;
  }
}

const portals = [
  "admin-portal",
  "hospital-portal",
  "insurance-portal",
  "patient-portal-desktop",
  "pharmacy-portal",
];

// ---------------------------------------------------------------------------
// 1. Web clients resolve a production API URL (never localhost in a build).
// ---------------------------------------------------------------------------
for (const portal of portals) {
  const clientPath = `${portal}/src/lib/api/client.ts`;
  if (!exists(clientPath)) {
    // The client may live in the shared workspace package instead.
    const shared = read("packages/api-client/src/client.ts");
    expectIncludes(shared, "PROD_API_FALLBACK", `${portal} (shared api-client)`);
    continue;
  }
  const contents = read(clientPath);
  expectIncludes(contents, 'const PROD_API_FALLBACK = "https://miqorai.onrender.com";', clientPath);
  expectIncludes(contents, "const LOCAL_API_PATTERN =", clientPath);
  expectIncludes(contents, "function resolveApiUrl(): string {", clientPath);
  expectIncludes(
    contents,
    "return !rawApiUrl || LOCAL_API_PATTERN.test(rawApiUrl) ? PROD_API_FALLBACK : rawApiUrl;",
    clientPath,
  );
}

const mobileApi = read("mobile_patient/src/lib/api.ts");
expectIncludes(mobileApi, "const PROD_API_FALLBACK = 'https://miqorai.onrender.com'", "mobile api");
expectIncludes(mobileApi, "const LOCAL_API_PATTERN =", "mobile api");
expectIncludes(mobileApi, "const rawApiUrl = (process.env.EXPO_PUBLIC_API_URL ?? '').trim()", "mobile api");
expectIncludes(mobileApi, "__DEV__", "mobile api");

// ---------------------------------------------------------------------------
// 2. Env templates exist, are tracked-able, and match the code.
// ---------------------------------------------------------------------------
const mobileEnvExample = read("mobile_patient/.env.example");
expectIncludes(mobileEnvExample, "EXPO_PUBLIC_API_URL=https://miqorai.onrender.com", "mobile .env.example");
const mobileEnvLocal = read("mobile_patient/.env.local.example");
expectIncludes(mobileEnvLocal, "EXPO_PUBLIC_API_URL=http://192.168.x.x:3000", "mobile .env.local.example");
const mobileEnvProduction = read("mobile_patient/.env.production.example");
expectIncludes(mobileEnvProduction, "EXPO_PUBLIC_API_URL=https://miqorai.onrender.com", "mobile .env.production.example");
if (mobileEnvProduction !== null) {
  expect(
    !mobileEnvProduction.includes("EXPO_PUBLIC_API_PORT"),
    "mobile .env.production.example should not ship local API port hints",
  );
}

for (const portal of portals) {
  const envPath = `${portal}/.env.production.example`;
  expectMatches(read(envPath), /^VITE_API_URL=https:\/\/\S+$/m, envPath);
}
expectMatches(read("patient-portal-desktop/.env.production.example"), /^VITE_BASE=\S+$/m, "patient .env.production.example");

/** Upper-case env names referenced by a source file. */
function envNamesIn(source, patterns) {
  const names = new Set();
  for (const pattern of patterns) {
    for (const match of source.matchAll(pattern)) names.add(match[1]);
  }
  return names;
}

const serverConfig = read("server/src/config.ts");
const serverProdExample = read("server/.env.production.example");
if (serverConfig !== null && serverProdExample !== null) {
  const names = envNamesIn(serverConfig, [/process\.env\.([A-Z][A-Z0-9_]+)/g, /\benv\.([A-Z][A-Z0-9_]+)/g, /"([A-Z][A-Z0-9_]{2,})"/g]);
  for (const name of names) {
    expect(
      new RegExp(`\\b${name}\\b`).test(serverProdExample),
      `server/.env.production.example should document ${name} (read by server/src/config.ts)`,
    );
  }
  expect(
    !/^AI_SERVICE_URL=/m.test(serverProdExample),
    "server/.env.production.example should set AI_SERVICE_BASE_URL only (AI_SERVICE_URL is a legacy alias)",
  );
}

const notificationService = read("server/src/shared/services/notification.service.ts");
expectIncludes(notificationService, 'config.smtp.host !== "log"', "notification service");

const serverEnvExample = read("server/.env.example");
expectMatches(serverEnvExample, /^REDIS_URL=rediss:\/\/.+$/m, "server .env.example");
expectMatches(serverEnvExample, /^SMTP_HOST=(?!localhost).+$/m, "server .env.example");
expectIncludes(serverEnvExample, "AI_SERVICE_BASE_URL=", "server .env.example");
if (serverEnvExample !== null) expect(!serverEnvExample.includes("ngrok"), "server .env.example should not mention ngrok");

const clinicalSafetyDoc = read("server/CLINICAL_SAFETY.md");
expectIncludes(clinicalSafetyDoc, "AI_SERVICE_BASE_URL=", "CLINICAL_SAFETY.md");
if (clinicalSafetyDoc !== null) expect(!clinicalSafetyDoc.includes("ngrok"), "CLINICAL_SAFETY.md should not mention ngrok");

const aiConfig = read("miqorai-ai-service/app/config.py");
const aiEnvExample = read("miqorai-ai-service/.env.example");
if (aiConfig !== null && aiEnvExample !== null) {
  for (const match of aiConfig.matchAll(/^ {4}([a-z][a-z0-9_]*)\s*:\s*[A-Za-z]/gm)) {
    const name = match[1].toUpperCase();
    expect(
      new RegExp(`^${name}=`, "m").test(aiEnvExample),
      `miqorai-ai-service/.env.example should list ${name} (app/config.py)`,
    );
  }
}

// ---------------------------------------------------------------------------
// 3. Central deployment layout.
// ---------------------------------------------------------------------------
for (const file of [
  "deploy/docker/portal.Dockerfile",
  "deploy/docker/server.Dockerfile",
  "deploy/docker/ai-service.Dockerfile",
  "deploy/docker/nginx/portal.conf",
  "deploy/docker/nginx/security-headers.inc",
  "deploy/k8s/base/kustomization.yaml",
  "deploy/k8s/base/secret.template.yaml",
  "deploy/k8s/overlays/dev/kustomization.yaml",
  "deploy/k8s/overlays/prod/kustomization.yaml",
  "deploy/k8s/README.md",
  ".github/workflows/build-images.yml",
  ".github/workflows/validate-k8s.yml",
  ".github/workflows/ci.yml",
  "LICENSE",
]) {
  read(file);
}

const portalDockerfile = read("deploy/docker/portal.Dockerfile");
expectIncludes(portalDockerfile, "ARG VITE_API_URL", "portal.Dockerfile");
expectIncludes(portalDockerfile, "nginx-unprivileged", "portal.Dockerfile");

const securityHeaders = read("deploy/docker/nginx/security-headers.inc");
for (const header of [
  "Content-Security-Policy",
  "Strict-Transport-Security",
  "X-Frame-Options",
  "X-Content-Type-Options",
  "Referrer-Policy",
  "Permissions-Policy",
]) {
  expectIncludes(securityHeaders, header, "security-headers.inc");
}
const portalConf = read("deploy/docker/nginx/portal.conf");
expectIncludes(portalConf, "server_tokens off;", "portal.conf");
expectIncludes(portalConf, "try_files $uri $uri/ /index.html;", "portal.conf");

const dockerignore = read(".dockerignore");
expectIncludes(dockerignore, "**/.env", ".dockerignore");
expectIncludes(dockerignore, "**/node_modules", ".dockerignore");

const nvmrc = read(".nvmrc");
if (nvmrc !== null) expect(nvmrc.trim() === "22", ".nvmrc should pin Node 22");

const renderYaml = read("render.yaml");
expectIncludes(renderYaml, "healthCheckPath: /health", "render.yaml");
expectIncludes(renderYaml, "npm ci", "render.yaml");
expectIncludes(renderYaml, "preDeployCommand: npx prisma migrate deploy", "render.yaml");
expectIncludes(renderYaml, "WORKER_INLINE", "render.yaml");
// BASE_URL builds signed file links, so it must be the host the clients reach.
const renderBaseUrl = renderYaml?.match(/key: BASE_URL\s+value: (\S+)/)?.[1];
expect(renderBaseUrl === "https://miqorai.onrender.com", "render.yaml BASE_URL should be https://miqorai.onrender.com");
expectIncludes(serverProdExample, "BASE_URL=https://miqorai.onrender.com", "server/.env.production.example");

for (const portal of portals) {
  const vercelPath = `${portal}/vercel.json`;
  const vercel = readJson(vercelPath);
  if (vercel === null) continue;
  const rewrites = vercel.rewrites ?? [];
  expect(rewrites.length > 0, `${vercelPath} should rewrite client routes to /index.html`);
  const apiProxy = rewrites.find((rewrite) => rewrite.source === "/api/:path*");
  expect(
    apiProxy && /^https:\/\/[^/]+\/api\/:path\*$/.test(String(apiProxy.destination)),
    `${vercelPath} should proxy /api/:path* to the backend's /api/:path* (same-origin session cookie)`,
  );
  expect(
    !renderBaseUrl || String(apiProxy?.destination).startsWith(`${renderBaseUrl}/`),
    `${vercelPath} /api proxy should target render.yaml BASE_URL (${renderBaseUrl})`,
  );
  expect(rewrites[0] === apiProxy, `${vercelPath} /api proxy rewrite must come before the SPA fallback`);
  for (const rewrite of rewrites) {
    if (rewrite === apiProxy) continue;
    expect(String(rewrite.source).includes("(?!api"), `${vercelPath} rewrite ${rewrite.source} must not catch /api`);
  }
  expectIncludes(JSON.stringify(vercel.buildCommand ?? ""), "VITE_API_URL=/", `${vercelPath} buildCommand`);
  const headerKeys = (vercel.headers ?? []).flatMap((rule) => (rule.headers ?? []).map((h) => h.key));
  for (const header of ["Content-Security-Policy", "Strict-Transport-Security", "X-Frame-Options", "Cache-Control"]) {
    expect(headerKeys.includes(header), `${vercelPath} should set ${header}`);
  }
  expectIncludes(JSON.stringify(vercel.installCommand ?? ""), "npm ci", `${vercelPath} installCommand`);
}

// No per-app Docker files may come back outside deploy/ (root .dockerignore and the
// generated hf-space-publish/Dockerfile are the only exceptions).
const skipDirs = new Set(["node_modules", ".git", "dist", ".expo", "android", "ios"]);
const strayDockerFiles = [];
function walk(relativeDir) {
  for (const entry of fs.readdirSync(path.join(repoRoot, relativeDir), { withFileTypes: true })) {
    const rel = relativeDir ? `${relativeDir}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name) && rel !== "deploy") walk(rel);
      continue;
    }
    const isDockerFile =
      /^Dockerfile/i.test(entry.name) ||
      entry.name.endsWith(".Dockerfile") ||
      entry.name === ".dockerignore" ||
      /^nginx.*\.conf$/.test(entry.name) ||
      /^docker-compose.*\.ya?ml$/.test(entry.name);
    if (isDockerFile && rel !== ".dockerignore" && rel !== "hf-space-publish/Dockerfile") strayDockerFiles.push(rel);
  }
}
walk("");
checks++;
if (strayDockerFiles.length) fail(`Docker files outside deploy/: ${strayDockerFiles.join(", ")}`);

if (exists("hf-space-publish/Dockerfile")) {
  const hfDockerfile = read("hf-space-publish/Dockerfile");
  if (hfDockerfile !== null) {
    expect(
      !/^\s*COPY\s.*miqorai-ai-service\//m.test(hfDockerfile),
      "hf-space-publish/Dockerfile has root-context COPY paths; run scripts/sync-hf-space.ps1",
    );
  }
}

// ---------------------------------------------------------------------------
if (failures.length) {
  console.error(`Production wiring checks FAILED (${failures.length} of ${checks}):`);
  for (const message of failures) console.error(`  - ${message}`);
  process.exit(1);
}
console.log(`Production wiring checks passed (${checks} checks).`);
