import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, getContext } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { getRedis, isRedisReady } from "../src/shared/lib/redis.js";
import { hashToken, randomToken } from "../src/shared/utils/crypto.js";

const suffix = Date.now().toString().slice(-8);

/** Reruns within the limiter window would otherwise trip the per-IP limit. */
async function clearRateLimitKeys(prefix: string) {
  if (!isRedisReady()) return;
  const redis = getRedis();
  const keys = await redis.keys(`rl:${prefix}:*`).catch(() => [] as string[]);
  if (keys.length) await redis.del(keys).catch(() => undefined);
}

describe("Invitation acceptance", () => {
  beforeAll(async () => {
    await clearRateLimitKeys("invitation-accept");
  });

  const invitedEmail = `invitee.${suffix}@example.com`;
  const password = "InviteePass1!";
  let token = "";

  it("hospital staff invite links to /accept-invite on the hospital portal", async () => {
    const res = await authed("hospitalAdmin").post("/api/hospital/staff/invite").send({
      email: invitedEmail,
      role: "doctor",
    });
    expect(res.status).toBe(201);
    const url = new URL(res.body.invite_url);
    expect(url.pathname).toBe("/accept-invite");
    token = url.searchParams.get("invite_token") ?? "";
    expect(token).not.toBe("");
  });

  it("GET /api/auth/invitation/:token returns the invitation info", async () => {
    const res = await request(app).get(`/api/auth/invitation/${token}`);
    expect(res.status).toBe(200);
    expect(res.body.email).toBe(invitedEmail);
    expect(res.body.role).toBe("hospital_staff");
    expect(res.body.staff_role).toBe("doctor");
    expect(res.body.organization_type).toBe("hospital");
    expect(res.body.organization_name).toBeTruthy();
  });

  it("accepting creates the user plus staff row and enables login", async () => {
    const c = getContext();
    const res = await request(app)
      .post(`/api/auth/invitation/${token}/accept`)
      .send({ name: "Invited Doctor", password });
    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const user = await prisma.user.findUnique({
      where: { email: invitedEmail },
      include: { hospitalStaff: true },
    });
    expect(user?.role).toBe("hospital_staff");
    expect(user?.organizationId).toBe(c.hospitalIdAlt);
    expect(user?.hospitalStaff?.role).toBe("doctor");
    expect(user?.hospitalStaff?.hospitalId).toBe(c.hospitalIdAlt);

    const invitation = await prisma.invitation.findFirst({
      where: { email: invitedEmail, acceptedUserId: user!.id },
    });
    expect(invitation?.acceptedAt).toBeTruthy();

    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: invitedEmail, password });
    expect(login.status).toBe(200);
  });

  it("an already accepted invitation 404s with a clear code", async () => {
    const res = await request(app).get(`/api/auth/invitation/${token}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INVITATION_ALREADY_ACCEPTED");
  });

  it("an unknown token 404s", async () => {
    const res = await request(app).get(`/api/auth/invitation/${randomToken()}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INVITATION_NOT_FOUND");
  });

  it("an expired invitation 404s", async () => {
    const c = getContext();
    const expiredToken = randomToken();
    await prisma.invitation.create({
      data: {
        email: `expired.${suffix}@example.com`,
        role: "nurse",
        organizationId: c.hospitalId,
        tokenHash: hashToken(expiredToken),
        expiresAt: new Date(Date.now() - 1000),
      },
    });
    const res = await request(app).get(`/api/auth/invitation/${expiredToken}`);
    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe("INVITATION_EXPIRED");
  });

  it("accepting for an email that already has a user conflicts", async () => {
    const c = getContext();
    const dupToken = randomToken();
    await prisma.invitation.create({
      data: {
        email: "grace.muthoni@example.com",
        role: "pharmacist",
        organizationId: c.pharmacyId,
        tokenHash: hashToken(dupToken),
        expiresAt: new Date(Date.now() + 86400000),
      },
    });
    const res = await request(app)
      .post(`/api/auth/invitation/${dupToken}/accept`)
      .send({ name: "Duplicate User", password });
    expect(res.status).toBe(409);
  });
});
