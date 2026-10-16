import { describe, it, expect, afterAll } from "vitest";
import { authed, currentQrHash, getContext } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { config } from "../src/config.js";

const TTL_MS = config.qrTtlSeconds * 1000;
const GRACE_MS = 90_000;

function scan(hash: string) {
  const c = getContext();
  return authed("hospital").post("/api/scan/qr").send({
    patient_id: c.patientId,
    hash,
    context: "hospital",
  });
}

describe("QR scan validation windows", () => {
  afterAll(async () => {
    // Leave the seed patient with a fresh, valid code for later suites.
    const c = getContext();
    await prisma.patient.update({
      where: { id: c.patientId },
      data: { qrUpdatedAt: new Date() },
    });
  });

  it("accepts the current hash", async () => {
    const c = getContext();
    const res = await scan(await currentQrHash());
    expect(res.status).toBe(200);
    expect(res.body.patient_id).toBe(c.patientId);
  });

  it("accepts the current hash on the pharmacy scan endpoint", async () => {
    const c = getContext();
    const res = await authed("pharmacy").post("/api/pharmacy/scan/qr").send({
      patient_id: c.patientId,
      hash: await currentQrHash(),
    });
    expect(res.status).toBe(200);
    expect(res.body.patient_id).toBe(c.patientId);
  });

  it("accepts the previous hash while it is inside its validity window", async () => {
    const c = getContext();
    const oldHash = await currentQrHash();

    // Age the current code past half its TTL (the rotation threshold) while it
    // is still well inside its validity window, then let the patient's next
    // fetch rotate it so oldHash becomes the previous hash.
    await prisma.patient.update({
      where: { id: c.patientId },
      data: { qrUpdatedAt: new Date(Date.now() - TTL_MS / 2 - 10_000) },
    });
    const newHash = await currentQrHash();
    expect(newHash).not.toBe(oldHash);

    const res = await scan(oldHash);
    expect(res.status).toBe(200);
    expect(res.body.patient_id).toBe(c.patientId);
  });

  it("rejects a known hash outside the validity window with QR_EXPIRED", async () => {
    const hash = await currentQrHash();
    await prisma.patient.update({
      where: { id: getContext().patientId },
      data: { qrUpdatedAt: new Date(Date.now() - TTL_MS - GRACE_MS - 60_000) },
    });

    const res = await scan(hash);
    expect(res.status).toBe(410);
    expect(res.body.error?.code).toBe("QR_EXPIRED");
  });

  it("rejects an unknown hash with 404", async () => {
    const res = await scan("0".repeat(64));
    expect(res.status).toBe(404);
    expect(res.body.error?.code).toBe("NOT_FOUND");
  });
});
