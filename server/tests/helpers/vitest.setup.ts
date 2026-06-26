import { beforeAll } from "vitest";
import { initTestContext } from "./context.js";

process.env.MIQORAI_AI_MOCK = "true";
process.env.AI_SERVICE_URL = "";

beforeAll(async () => {
  await initTestContext();
}, 120000);
