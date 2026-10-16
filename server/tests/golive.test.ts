import express from "express";
import jwt from "jsonwebtoken";
import request from "supertest";
import { afterEach, describe, expect, it, vi } from "vitest";
import { app, authed, getContext } from "./helpers/context.js";
import { config, resolveAiServiceBaseUrl } from "../src/config.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { createApiRateLimiter } from "../src/shared/middleware/rateLimit.js";
import { sendSms } from "../src/shared/services/sms.service.js";
import { signAccessToken, type TokenPayload } from "../src/shared/utils/crypto.js";
import { dateKey, dayRange, dayRangeFor, monthRange, rangeEnd, weekRange } from "../src/shared/utils/day-range.js";
import { seedReferenceDataIfEmpty } from "../src/shared/services/reference.service.js";
import { processEvent } from "../src/worker.js";

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Platform timezone day boundaries", () => {
  // 22:30 UTC on Oct 15 is 00:30 on Oct 16 in Kigali (UTC+2).
  const lateUtc = new Date("2026-10-15T22:30:00Z");

  it("computes day, week and month in Africa/Kigali, not server-local time", () => {
    expect(config.platformTimezone).toBe("Africa/Kigali");
    expect(dateKey(lateUtc)).toBe("2026-10-16");
    const day = dayRange(lateUtc);
    expect(day.start.toISOString()).toBe("2026-10-15T22:00:00.000Z");
    expect(day.end.toISOString()).toBe("2026-10-16T22:00:00.000Z");
    // Oct 16 2026 is a Friday; the week starts Monday Oct 12 (Kigali midnight).
    expect(weekRange(lateUtc).start.toISOString()).toBe("2026-10-11T22:00:00.000Z");
    expect(monthRange(lateUtc).start.toISOString()).toBe("2026-09-30T22:00:00.000Z");
    expect(monthRange(lateUtc).end.toISOString()).toBe("2026-10-31T22:00:00.000Z");
  });

  it("treats date-only query values as platform-timezone calendar days", () => {
    expect(dayRangeFor("2026-10-16").start.toISOString()).toBe("2026-10-15T22:00:00.000Z");
    expect(rangeEnd("2026-10-16").toISOString()).toBe("2026-10-16T21:59:59.999Z");
  });

  it("puts a check-in just after 22:00 UTC into the next Kigali day", async () => {
    const ctx = getContext();
    const hospitalToken = jwt.decode(ctx.tokens.hospital) as TokenPayload & { iat?: number; exp?: number };
    const { iat: _iat, exp: _exp, ...payload } = hospitalToken;

    const now = new Date("2031-03-10T22:30:00Z"); // 00:30 on Mar 11 in Kigali
    const today = await prisma.visit.create({
      data: {
        hospitalId: ctx.hospitalId,
        patientId: ctx.patientId,
        department: "General",
        checkedInAt: new Date("2031-03-10T22:10:00Z"), // 00:10 Mar 11 Kigali
      },
    });
    const yesterday = await prisma.visit.create({
      data: {
        hospitalId: ctx.hospitalId,
        patientId: ctx.patientId,
        department: "General",
        checkedInAt: new Date("2031-03-10T21:50:00Z"), // 23:50 Mar 10 Kigali
      },
    });
    try {
      vi.useFakeTimers({ toFake: ["Date"], now });
      const token = signAccessToken(payload as TokenPayload);
      const res = await request(app).get("/api/hospital/checkins/today").set("Authorization", `Bearer ${token}`);
      expect(res.status).toBe(200);
      const ids = (res.body.patients as Array<{ visit_id: string }>).map((p) => p.visit_id);
      expect(ids).toContain(today.id);
      expect(ids).not.toContain(yesterday.id);
    } finally {
      vi.useRealTimers();
      await prisma.visit.deleteMany({ where: { id: { in: [today.id, yesterday.id] } } });
    }
  });
});

describe("Referral notification never fails the referral", () => {
  async function createReferral() {
    const ctx = getContext();
    const res = await authed("hospital").post("/api/hospital/referral").send({
      patient_id: ctx.patientId,
      to_department: "Cardiology",
      urgency: "urgent",
      reason: "Go-live referral SMS check",
    });
    expect(res.status).toBe(201);
    expect(res.body.notificationStatus).toBe("queued");
    const event = await prisma.domainEvent.findFirst({
      where: { type: "ReferralCreated", payload: { path: ["referral_id"], equals: res.body.id } },
    });
    expect(event).not.toBeNull();
    return { referralId: String(res.body.id), event: event! };
  }

  it("records not_sent (no error) when SMS is unconfigured in production", async () => {
    const saved = { nodeEnv: config.nodeEnv, sms: { ...config.sms } };
    const { referralId, event } = await createReferral();
    try {
      config.nodeEnv = "production";
      config.sms.provider = "twilio";
      config.sms.accountSid = "";
      await processEvent(event);
    } finally {
      config.nodeEnv = saved.nodeEnv;
      Object.assign(config.sms, saved.sms);
    }
    const referral = await prisma.referral.findUnique({ where: { id: referralId } });
    expect(referral?.notificationStatus).toBe("not_sent");
    const processed = await prisma.domainEvent.findUnique({ where: { id: event.id } });
    expect(processed?.processedAt).not.toBeNull();
    expect(processed?.lastError).toBeNull();
  });

  it("records a provider failure on the referral and the outbox event", async () => {
    const saved = { ...config.sms };
    const { referralId, event } = await createReferral();
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("network down")));
    try {
      Object.assign(config.sms, { provider: "twilio", accountSid: "AC_test", authToken: "t", fromNumber: "+1000" });
      await processEvent(event);
    } finally {
      Object.assign(config.sms, saved);
    }
    const referral = await prisma.referral.findUnique({ where: { id: referralId } });
    expect(referral?.notificationStatus).toBe("failed");
    const failed = await prisma.domainEvent.findUnique({ where: { id: event.id } });
    expect(failed?.attempts).toBe(1);
    expect(failed?.processedAt).toBeNull();
    expect(failed?.lastError).toContain("SMS delivery failed");
    await prisma.domainEvent.update({ where: { id: event.id }, data: { processedAt: new Date() } });
  });

  it("aborts a hanging Twilio request after the timeout", async () => {
    const saved = { ...config.sms };
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) =>
        new Promise((_resolve, reject) => {
          init.signal?.addEventListener("abort", () => reject(new Error("aborted")));
        }),
      ),
    );
    try {
      Object.assign(config.sms, { provider: "twilio", accountSid: "AC_test", authToken: "t", fromNumber: "+1000" });
      await expect(sendSms("+250700000000", "hello", { timeoutMs: 50 })).rejects.toMatchObject({
        code: "SERVICE_UNAVAILABLE",
        message: "SMS delivery timed out",
      });
    } finally {
      Object.assign(config.sms, saved);
    }
  });
});

describe("Global rate limiter keying", () => {
  function limitedApp() {
    const testApp = express();
    testApp.use(createApiRateLimiter({ perUserPerMinute: 3, perIpPerMinute: 2 }, `test-${Date.now()}-${Math.random()}`));
    testApp.get("/ping", (_req, res) => res.json({ ok: true }));
    return testApp;
  }

  it("limits unauthenticated requests per IP", async () => {
    const testApp = limitedApp();
    expect((await request(testApp).get("/ping")).status).toBe(200);
    expect((await request(testApp).get("/ping")).status).toBe(200);
    const blocked = await request(testApp).get("/ping");
    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe("RATE_LIMIT");
    expect(blocked.headers["retry-after"]).toBeDefined();
    // An invalid token is not an identity: it still counts against the IP.
    expect((await request(testApp).get("/ping").set("Authorization", "Bearer nope")).status).toBe(429);
  });

  it("limits authenticated requests per user, so users behind one NAT do not share a bucket", async () => {
    const ctx = getContext();
    const testApp = limitedApp();
    const asAdmin = () => request(testApp).get("/ping").set("Authorization", `Bearer ${ctx.tokens.admin}`);
    const asPatient = () => request(testApp).get("/ping").set("Authorization", `Bearer ${ctx.tokens.patient}`);
    for (let i = 0; i < 3; i++) expect((await asAdmin()).status).toBe(200);
    expect((await asAdmin()).status).toBe(429);
    expect((await asPatient()).status).toBe(200);
    // Unauthenticated traffic from the same IP has its own bucket.
    expect((await request(testApp).get("/ping")).status).toBe(200);
  });
});

describe("JSON errors", () => {
  it("returns JSON 404 for unknown API routes", async () => {
    const res = await request(app).get("/api/does-not-exist");
    expect(res.status).toBe(404);
    expect(res.headers["content-type"]).toContain("application/json");
    expect(res.body.error.code).toBe("NOT_FOUND");
  });

  it("maps malformed JSON to 400 INVALID_JSON", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send('{"email": "x"');
    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe("INVALID_JSON");
  });

  it("maps oversized bodies to 413 PAYLOAD_TOO_LARGE", async () => {
    const res = await request(app)
      .post("/api/auth/login")
      .set("Content-Type", "application/json")
      .send(JSON.stringify({ email: "a".repeat(3 * 1024 * 1024) }));
    expect(res.status).toBe(413);
    expect(res.body.error.code).toBe("PAYLOAD_TOO_LARGE");
  });
});

describe("Health probes", () => {
  it("readiness probes the database and reports Redis", async () => {
    for (const path of ["/health/ready", "/health"]) {
      const res = await request(app).get(path);
      expect(res.status).toBe(200);
      expect(res.body.checks.database.status).toBe("up");
      expect(["up", "down", "disabled"]).toContain(res.body.checks.redis.status);
    }
  });

  it("liveness never touches dependencies", async () => {
    const spy = vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("must not be called"));
    const res = await request(app).get("/health/live");
    spy.mockRestore();
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
    expect(spy).not.toHaveBeenCalled();
  });

  it("readiness returns 503 when the database is down", async () => {
    const spy = vi.spyOn(prisma, "$queryRaw").mockRejectedValue(new Error("connection refused"));
    const res = await request(app).get("/health/ready");
    spy.mockRestore();
    expect(res.status).toBe(503);
    expect(res.body.status).toBe("down");
    expect(res.body.checks.database.status).toBe("down");
    expect(JSON.stringify(res.body)).not.toContain("connection refused");
  });
});

describe("Reference catalog search", () => {
  it("keeps the bare-array response with pagination headers", async () => {
    const res = await authed("hospital").get("/api/reference/icd");
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(Number(res.headers["x-total-count"])).toBeGreaterThanOrEqual(res.body.length);
    expect(res.headers["x-limit"]).toBe("50");
  });

  it("searches case-insensitively with paging and a total count", async () => {
    await seedReferenceDataIfEmpty();
    const all = await authed("hospital").get("/api/reference/icd?paged=true&limit=100");
    expect(all.status).toBe(200);
    expect(all.body.limit).toBe(100);
    const total = all.body.total as number;
    expect(total).toBeGreaterThan(0);

    const first = await authed("hospital").get("/api/reference/icd?paged=true&limit=1&offset=0");
    expect(first.body.items).toHaveLength(1);
    expect(first.body.has_more).toBe(total > 1);
    if (total > 1) {
      const second = await authed("hospital").get("/api/reference/icd?paged=true&limit=1&offset=1");
      expect(second.body.items[0].code).not.toBe(first.body.items[0].code);
    }

    const sample = all.body.items[0] as { code: string; description: string };
    const term = sample.description.slice(0, 4).toUpperCase();
    const hit = await authed("hospital").get(`/api/reference/icd?paged=true&q=${encodeURIComponent(term)}`);
    expect(hit.body.items.map((i: { code: string }) => i.code)).toContain(sample.code);

    const capped = await authed("hospital").get("/api/reference/drugs?paged=true&limit=500");
    expect(capped.body.limit).toBe(100);
  });
});

describe("Sync conflicts", () => {
  it("parks a stale visit update as a conflict, returns it, and resolves it", async () => {
    const ctx = getContext();
    const staff = await prisma.hospitalStaff.findUniqueOrThrow({ where: { userId: ctx.userIds.hospital } });
    const visit = await prisma.visit.create({
      data: { hospitalId: staff.hospitalId, patientId: ctx.patientId, department: "General" },
    });
    const push = await authed("hospital")
      .post("/api/sync/push")
      .send({
        items: [
          {
            operation: "update",
            resource_type: "visit",
            resource_data: { id: visit.id, updated_at: "2000-01-01T00:00:00Z", patient_name: "Sync Check" },
          },
        ],
      });
    expect(push.status).toBe(200);
    const result = push.body.results[0];
    expect(result.status).toBe("conflict");
    expect(result.code).toBe("SYNC_CONFLICT");

    const queue = await authed("hospital").get("/api/sync/queue");
    const queued = (queue.body.items as Array<{ id: string; status: string }>).find((i) => i.id === result.id);
    expect(queued?.status).toBe("conflict");

    // Re-processing reports the conflict as a result (the client counts it), not an error.
    const reprocess = await authed("hospital").post(`/api/sync/queue/${result.id}/process`);
    expect(reprocess.status).toBe(200);
    expect(reprocess.body.status).toBe("conflict");

    const resolved = await authed("hospital").post(`/api/sync/queue/${result.id}/resolve`).send({ resolution: "client" });
    expect(resolved.status).toBe(200);
    expect(resolved.body.status).toBe("synced");
    const row = await prisma.syncQueue.findUnique({ where: { id: result.id } });
    expect(row?.status).toBe("synced");
    await prisma.syncQueue.delete({ where: { id: result.id } });
    await prisma.visit.delete({ where: { id: visit.id } });
  });
});

describe("AI service URL env", () => {
  it("prefers AI_SERVICE_BASE_URL and warns about the deprecated alias", () => {
    expect(resolveAiServiceBaseUrl({ AI_SERVICE_BASE_URL: "https://a.example/" })).toEqual({ url: "https://a.example" });
    const differing = resolveAiServiceBaseUrl({ AI_SERVICE_BASE_URL: "https://a.example", AI_SERVICE_URL: "https://b.example" });
    expect(differing.url).toBe("https://a.example");
    expect(differing.warning).toContain("differs");
    const legacy = resolveAiServiceBaseUrl({ AI_SERVICE_URL: "https://b.example" });
    expect(legacy.url).toBe("https://b.example");
    expect(legacy.warning).toContain("deprecated");
    expect(resolveAiServiceBaseUrl({})).toEqual({ url: "" });
  });
});
