import { describe, expect, it } from "vitest";
import { config } from "../src/config.js";
import { getAiServiceConfig } from "../src/modules/clinical/ai-service.config.js";
import { prisma } from "../src/shared/lib/prisma.js";

// Guards against env overrides arriving after config.ts has been evaluated:
// each value below differs from the config.ts default and from a typical .env.
describe("Test environment", () => {
  it("loaded config reflects the vitest test.env overrides", () => {
    expect(config.nodeEnv).toBe("test");
    expect(config.authChallengeResendCooldownSeconds).toBe(0);
    expect(config.rateLimitPerMinute).toBe(10000);
    expect(config.smtp.host).toBe("log");
    expect(config.sms.provider).toBe("log");
    expect(config.aiMock).toBe(true);
    expect(config.aiServiceUrl).toBe("");
  });

  it("AI service config resolves to mock mode with no remote URL", () => {
    const ai = getAiServiceConfig();
    expect(ai.mock).toBe(true);
    expect(ai.baseUrl).toBe("");
  });

  it("runs against the dedicated test database", async () => {
    const url = new URL(config.databaseUrl);
    const explicit = process.env.TEST_DATABASE_URL?.trim();
    if (explicit) {
      expect(config.databaseUrl).toBe(explicit);
    } else {
      expect(url.pathname.replace(/^\//, "")).toMatch(/_test$/);
    }
    const rows = await prisma.$queryRaw<{ db: string }[]>`SELECT current_database() AS db`;
    expect(rows[0]?.db).toBe(decodeURIComponent(url.pathname.replace(/^\//, "")));
  });
});
