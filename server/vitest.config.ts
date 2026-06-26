import { defineConfig } from "vitest/config";

process.env.NODE_ENV = "test";
process.env.RATE_LIMIT_PER_MINUTE = "10000";

export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["tests/**/*.test.ts"],
    setupFiles: ["tests/helpers/vitest.setup.ts"],
    testTimeout: 60000,
    hookTimeout: 120000,
    fileParallelism: false,
  },
});
