import { beforeAll } from "vitest";
import { initTestContext } from "./context.js";

process.env.MIQORAI_AI_MOCK = "true";
process.env.AI_SERVICE_URL = "";
process.env.SMTP_HOST = "log";
process.env.AUTH_CHALLENGE_RESEND_COOLDOWN_SECONDS = "0";

beforeAll(async () => {
  await initTestContext();
}, 120000);
