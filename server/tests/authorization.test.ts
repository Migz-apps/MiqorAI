import { beforeAll, describe, expect, it } from "vitest";
import request from "supertest";
import { app, authed, getContext, PASSWORD } from "./helpers/context.js";
import { prisma } from "../src/shared/lib/prisma.js";
import { hashPassword } from "../src/shared/utils/crypto.js";
import { assertAccessGrant } from "../src/modules/patient/access.service.js";

const suffix = Date.now().toString().slice(-8);

async function createHospitalStaff(
  hospitalId: string,
  role: "receptionist" | "dept_head",
  tag: string,
): Promise<string> {
  const email = `${role}.${tag}.${suffix}@example.com`;
  const user = await prisma.user.create({
    data: {
      email,
      phone: `+2547${suffix}${tag.length}`,
      passwordHash: hashPassword(PASSWORD),
      role: "hospital_staff",
      organizationId: hospitalId,
      organizationType: "hospital",
      isActive: true,
    },
  });
  await prisma.hospitalStaff.create({
    data: { hospitalId, userId: user.id, role, isActive: true },
  });
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password: PASSWORD, organization_code: "KMC001" });
  expect(res.status).toBe(200);
  return res.body.access_token as string;
}

describe("Staff sub-role and consent authorization", () => {
  let receptionistToken = "";
  let deptHeadToken = "";
  let receptionistUserId = "";
  let consentPatientId = "";
  let consentPatientUserId = "";

  beforeAll(async () => {
    const c = getContext();
    receptionistToken = await createHospitalStaff(c.hospitalId, "receptionist", "a");
    deptHeadToken = await createHospitalStaff(c.hospitalId, "dept_head", "bb");

    const receptionist = await prisma.user.findFirstOrThrow({
      where: { email: `receptionist.a.${suffix}@example.com` },
    });
    receptionistUserId = receptionist.id;

    const patientUser = await prisma.user.create({
      data: {
        email: `consent.patient.${suffix}@example.com`,
        phone: `+2546${suffix}`,
        passwordHash: hashPassword(PASSWORD),
        role: "patient",
        organizationType: "none",
        isActive: true,
      },
    });
    consentPatientUserId = patientUser.id;
    const patient = await prisma.patient.create({
      data: {
        userId: patientUser.id,
        firstName: "Consent",
        lastName: "Case",
        dateOfBirth: new Date("1990-01-01"),
      },
    });
    consentPatientId = patient.id;
  });

  it("forbids a receptionist from creating a prescription", async () => {
    const c = getContext();
    const res = await request(app)
      .post("/api/hospital/prescription")
      .set("Authorization", `Bearer ${receptionistToken}`)
      .send({
        patient_id: c.patientId,
        diagnosis: "Test diagnosis",
        drug_name: "Amlodipine",
        strength: "5mg",
        dosage: "1 tablet",
        quantity: 30,
        frequency: "once daily",
        duration_days: 30,
      });
    expect(res.status).toBe(403);
  });

  it("allows a doctor to create a prescription", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/prescription").send({
      patient_id: c.patientId,
      pharmacy_id: c.pharmacyId,
      diagnosis: "Test diagnosis",
      drug_name: "Amlodipine",
      strength: "5mg",
      dosage: "1 tablet",
      quantity: 30,
      frequency: "once daily",
      duration_days: 30,
    });
    // 409 means the clinical safety gate held the order, which still proves
    // the doctor passed authorization.
    expect([200, 201, 409]).toContain(res.status);
  });

  it("forbids non-dept_head staff from changing staff roles", async () => {
    const res = await authed("hospital")
      .put(`/api/hospital/staff/${receptionistUserId}/role`)
      .send({ role: "nurse" });
    expect(res.status).toBe(403);
  });

  it("allows a dept_head to change staff roles", async () => {
    const res = await request(app)
      .put(`/api/hospital/staff/${receptionistUserId}/role`)
      .set("Authorization", `Bearer ${deptHeadToken}`)
      .send({ role: "receptionist" });
    expect(res.status).toBe(200);
  });

  it("denies a pharmacy patient profile read without a grant", async () => {
    const res = await authed("pharmacy").get(`/api/pharmacy/patient/${consentPatientId}`);
    expect(res.status).toBe(403);
  });

  it("allows the read with a medications-scope grant and records lastAccessedAt", async () => {
    const c = getContext();
    const grant = await prisma.accessGrant.create({
      data: {
        patientId: consentPatientId,
        granteeType: "pharmacy",
        granteeId: c.pharmacyId,
        scope: "medications",
        grantedBy: consentPatientUserId,
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      },
    });
    expect(grant.lastAccessedAt).toBeNull();

    const res = await authed("pharmacy").get(`/api/pharmacy/patient/${consentPatientId}`);
    expect(res.status).toBe(200);

    // The lastAccessedAt write is intentionally non-blocking, so poll briefly.
    let updated = grant;
    for (let i = 0; i < 20 && !updated.lastAccessedAt; i++) {
      await new Promise((resolve) => setTimeout(resolve, 100));
      updated = await prisma.accessGrant.findUniqueOrThrow({ where: { id: grant.id } });
    }
    expect(updated.lastAccessedAt).not.toBeNull();
  });

  it("does not let a medications-scope grant open lab results", async () => {
    const c = getContext();
    await expect(
      assertAccessGrant(consentPatientId, "pharmacy", c.pharmacyId, "lab_results"),
    ).rejects.toMatchObject({ statusCode: 403 });
  });
});
