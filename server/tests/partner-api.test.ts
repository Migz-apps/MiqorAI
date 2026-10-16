import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, getContext } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import {
  createInsurerApiKey,
  revokeInsurerApiKey,
} from "../src/modules/financing/insurer-enrichment.service.js";
import { rotateInsurerApiKey } from "../src/modules/financing/insurer-portal.service.js";

const suffix = Date.now().toString().slice(-8);

describe("Partner API (/api/partner/v1)", () => {
  let apiKey = "";
  let apiKeyId = "";
  let otherInsurerId = "";
  let otherClaimId = "";

  beforeAll(async () => {
    const c = getContext();
    const created = await createInsurerApiKey(c.insurerId, `partner-test-${suffix}`);
    apiKey = created.api_key;
    apiKeyId = created.id;

    // A second insurer with its own claim proves the key only sees its own data.
    const otherInsurer = await prisma.insurer.create({
      data: {
        code: `PARTNER_${suffix}`,
        name: `Partner Test Insurer ${suffix}`,
        registrationNumber: `PARTNER-REG-${suffix}`,
      },
    });
    otherInsurerId = otherInsurer.id;
    const claim = await prisma.claim.create({
      data: {
        insurerId: otherInsurer.id,
        patientId: c.patientId,
        providerName: "Other Provider",
        amount: 42,
      },
    });
    otherClaimId = claim.id;
  });

  it("rejects a missing API key", async () => {
    const res = await request(app).get("/api/partner/v1/claims");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("API_KEY_REQUIRED");
  });

  it("rejects an invalid API key", async () => {
    const res = await request(app)
      .get("/api/partner/v1/claims")
      .set("X-Api-Key", "miq_definitely_not_a_key");
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("API_KEY_INVALID");
  });

  it("lists only the key owner's claims", async () => {
    const c = getContext();
    const res = await request(app).get("/api/partner/v1/claims").set("X-Api-Key", apiKey);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.items)).toBe(true);
    const ownTotal = await prisma.claim.count({ where: { insurerId: c.insurerId } });
    expect(res.body.total).toBe(ownTotal);
    expect(res.body.items.map((i: { id: string }) => i.id)).not.toContain(otherClaimId);
  });

  it("filters claims by status and paginates", async () => {
    const res = await request(app)
      .get("/api/partner/v1/claims")
      .query({ status: "flagged", limit: 5, offset: 0 })
      .set("X-Api-Key", apiKey);
    expect(res.status).toBe(200);
    expect(res.body.limit).toBe(5);
    for (const item of res.body.items) expect(item.status).toBe("flagged");
  });

  it("accepts the Authorization: ApiKey scheme and lists members", async () => {
    const c = getContext();
    const res = await request(app)
      .get("/api/partner/v1/members")
      .set("Authorization", `ApiKey ${apiKey}`);
    expect(res.status).toBe(200);
    const ownTotal = await prisma.insurerMember.count({ where: { insurerId: c.insurerId } });
    expect(res.body.total).toBe(ownTotal);
    if (res.body.items.length) {
      expect(res.body.items[0]).toHaveProperty("member_number");
      expect(res.body.items[0]).toHaveProperty("name");
    }
  });

  it("a rotated key stops working while the new key works", async () => {
    const c = getContext();
    const rotated = await rotateInsurerApiKey(c.insurerId, apiKeyId);

    const oldRes = await request(app).get("/api/partner/v1/claims").set("X-Api-Key", apiKey);
    expect(oldRes.status).toBe(401);

    const newRes = await request(app)
      .get("/api/partner/v1/claims")
      .set("X-Api-Key", rotated.api_key);
    expect(newRes.status).toBe(200);

    apiKey = rotated.api_key;
    apiKeyId = rotated.id;
  });

  it("a revoked key is rejected", async () => {
    const c = getContext();
    await revokeInsurerApiKey(c.insurerId, apiKeyId);
    const res = await request(app).get("/api/partner/v1/claims").set("X-Api-Key", apiKey);
    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe("API_KEY_INVALID");
  });
});
