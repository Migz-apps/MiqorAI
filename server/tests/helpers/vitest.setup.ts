import { beforeAll } from "vitest";

// Env overrides live in vitest.config.ts (`test.env`): a static import here is
// hoisted, so assignments in this file would run after config.ts read env.
// The app is imported lazily so a test file's vi.mock() calls (e.g. of
// one-time-code) are registered before any app module is loaded.

beforeAll(async () => {
  const { initTestContext } = await import("./context.js");
  await initTestContext();
}, 120000);
