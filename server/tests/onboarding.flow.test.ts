import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { getRedis, isRedisReady } from "../src/shared/lib/redis.js";

const suffix = Date.now().toString().slice(-8);
const password = "OnboardPass1!";

async function clearRateLimitKeys(prefix: string) {
  if (!isRedisReady()) return;
  const redis = getRedis();
  const keys = await redis.keys(`rl:${prefix}:*`).catch(() => [] as string[]);
  if (keys.length) await redis.del(keys).catch(() => undefined);
}

describe("Onboarding submission and approval", () => {
  const hospitalName = `Onboard Test Hospital ${suffix}`;
  const hospitalEmail = `onboard.hospital.${suffix}@example.com`;
  let hospitalRequestId = "";
  let rejectRequestId = "";

  beforeAll(async () => {
    await clearRateLimitKeys("onboarding-submit");
  });

  it("POST /api/onboarding stores a password hash, never the plaintext", async () => {
    const res = await request(app).post("/api/onboarding").send({
      type: "hospital",
      organization_name: hospitalName,
      contact_name: "Onboard Contact",
      email: hospitalEmail,
      phone: "+250788000001",
      address: "Kigali",
      password,
    });
    expect(res.status).toBe(201);
    hospitalRequestId = res.body.id;

    const row = await prisma.onboardingRequest.findUnique({ where: { id: hospitalRequestId } });
    expect(row?.name).toBe(hospitalName);
    expect(row?.submittedByEmail).toBe(hospitalEmail);
    expect(row?.passwordHash).toBeTruthy();
    expect(row?.passwordHash).not.toContain(password);
  });

  it("approval creates the organization and a working admin login", async () => {
    const res = await authed("admin").post(`/api/admin/onboarding/${hospitalRequestId}/approve`);
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("approved");
    expect(res.body.organization_id).toBeTruthy();

    const hospital = await prisma.hospital.findUnique({ where: { id: res.body.organization_id } });
    expect(hospital?.name).toBe(hospitalName);
    expect(hospital?.verified).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email: hospitalEmail },
      include: { hospitalStaff: true },
    });
    expect(user?.role).toBe("hospital_admin");
    expect(user?.organizationId).toBe(res.body.organization_id);
    expect(user?.hospitalStaff?.role).toBe("admin");

    const row = await prisma.onboardingRequest.findUnique({ where: { id: hospitalRequestId } });
    expect(row?.status).toBe("approved");
    expect(row?.passwordHash).toBeNull();

    // Login with the originally submitted password proves hash compatibility.
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: hospitalEmail, password });
    expect(login.status).toBe(200);
    expect(login.body.user.role).toBe("hospital_admin");
  });

  it("approving a duplicate organization name conflicts", async () => {
    const res = await request(app).post("/api/onboarding").send({
      type: "hospital",
      organization_name: hospitalName,
      contact_name: "Duplicate Contact",
      email: `onboard.dup.${suffix}@example.com`,
      phone: "+250788000002",
      password,
    });
    expect(res.status).toBe(201);

    const approve = await authed("admin").post(`/api/admin/onboarding/${res.body.id}/approve`);
    expect(approve.status).toBe(409);
  });

  it("rejection clears the stored password hash", async () => {
    const res = await request(app).post("/api/onboarding").send({
      type: "insurer",
      organization_name: `Onboard Test Insurer ${suffix}`,
      contact_name: "Insurer Contact",
      email: `onboard.insurer.${suffix}@example.com`,
      phone: "+250788000003",
      password,
    });
    expect(res.status).toBe(201);
    rejectRequestId = res.body.id;

    const reject = await authed("admin")
      .post(`/api/admin/onboarding/${rejectRequestId}/reject`)
      .send({ reason: "Incomplete documents" });
    expect(reject.status).toBe(200);

    const row = await prisma.onboardingRequest.findUnique({ where: { id: rejectRequestId } });
    expect(row?.status).toBe("rejected");
    expect(row?.passwordHash).toBeNull();
  });
});
