import { defineConfig } from "vitest/config";
import { resolveTestDatabaseUrl } from "./tests/helpers/test-db.js";

/**
 * Environment for every test worker. Vitest assigns these to process.env before
 * any setup file or test module is imported, so config.ts (which reads env at
 * module load) sees them. Keep env overrides here, never in setup files.
 */
const testEnv: Record<string, string> = {
  NODE_ENV: "test",
  DATABASE_URL: resolveTestDatabaseUrl(),
  RATE_LIMIT_PER_MINUTE: "10000",
  RATE_LIMIT_PER_USER_PER_MINUTE: "10000",
  MIQORAI_AI_MOCK: "true",
  // AI_SERVICE_BASE_URL takes precedence over AI_SERVICE_URL; pin both so a
  // developer's .env never routes tests to a real AI service.
  AI_SERVICE_BASE_URL: "",
  AI_SERVICE_URL: "",
  SMTP_HOST: "log",
  SMS_PROVIDER: "log",
  AUTH_CHALLENGE_RESEND_COOLDOWN_SECONDS: "0",
};

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    globalSetup: ["tests/helpers/global-setup.ts"],
    setupFiles: ["tests/helpers/vitest.setup.ts"],
    env: testEnv,
    testTimeout: 60000,
    hookTimeout: 120000,
    // Test files share one seeded database and mutate it, so they run serially.
    fileParallelism: false,
  },
});
