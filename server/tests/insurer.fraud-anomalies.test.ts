import { describe, expect, it } from "vitest";
import { authed } from "./helpers/context.js";

describe("Insurer fraud anomalies windowing", () => {
  it("falls back to the latest available claim window when seeded demo data is older than the requested range", async () => {
    const res = await authed("insurer").get("/api/insurer/fraud/anomalies").query({ days: 7 });

    expect(res.status).toBe(200);
    expect(res.body.flagged_claims?.length).toBeGreaterThan(0);
    expect(typeof res.body.window_start).toBe("string");
    expect(typeof res.body.window_end).toBe("string");
    expect(res.body.used_latest_available_window).toBe(true);
  });
});
