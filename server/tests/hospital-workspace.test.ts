import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { app, PASSWORD, initTestContext } from "./helpers/context.js";
import { prisma } from "../src/lib/prisma.js";

async function loginDoctor(email: string, hospitalCode: string) {
  const res = await request(app).post("/api/auth/login").send({
    email,
    password: PASSWORD,
    organization_code: hospitalCode,
  });

  expect(res.status).toBe(200);
  return `Bearer ${res.body.access_token as string}`;
}

describe("Doctor workspace isolation", () => {
  let drAmaraAuth = "";
  let drAdeyemiAuth = "";
  let patientId = "";

  beforeAll(async () => {
    await initTestContext();
    drAmaraAuth = await loginDoctor("dr.amara@example.com", "SCH001");
    drAdeyemiAuth = await loginDoctor("dr.adeyemi@example.com", "SCH001");

    const patient = await prisma.patient.findFirst({
      where: {
        firstName: "James",
        lastName: "Otieno",
      },
    });

    if (!patient) {
      throw new Error("Expected seeded patient James Otieno");
    }

    patientId = patient.id;
  });

  it("keeps unfinished visits and authored prescriptions scoped to the doctor", async () => {
    const checkin = await request(app)
      .post("/api/hospital/checkin")
      .set("Authorization", drAmaraAuth)
      .send({
        patient_id: patientId,
        department: "Cardiology",
        priority: "normal",
      });

    expect([200, 201]).toContain(checkin.status);
    const visitId = String(checkin.body.visit_id ?? "");
    expect(visitId).toBeTruthy();

    const saveDraft = await request(app)
      .put(`/api/hospital/patient/${patientId}/visit-draft`)
      .set("Authorization", drAmaraAuth)
      .send({
        visit_id: visitId,
        draft: {
          chief: "Chest discomfort follow-up",
          symptoms: "Intermittent chest tightness after exertion",
          assessment: "Monitor blood pressure and response to medication",
          duration: "3 days",
          severity: "Moderate",
          bp: "142/90",
          hr: "84",
          temp: "",
          spo2: "98",
          height: "175",
          weight: "82",
          diagnoses: [{ code: "BA00", label: "Essential hypertension" }],
          labs: ["Lipid Panel"],
          prescriptions: [
            {
              medication: "Amlodipine",
              strength: "5mg",
              instructions: "1 tablet",
              frequency: "1x daily",
              duration: "30 days",
              durationDays: 30,
              quantity: 30,
            },
          ],
          notes: "Continue monitoring home blood pressures.",
        },
      });

    expect(saveDraft.status).toBe(200);
    const draftId = String(saveDraft.body.draft_id ?? "");
    expect(draftId).toBeTruthy();

    const ownerWorkspace = await request(app)
      .get(`/api/hospital/patient/${patientId}/workspace`)
      .set("Authorization", drAmaraAuth);

    expect(ownerWorkspace.status).toBe(200);
    expect(ownerWorkspace.body.active_drafts).toHaveLength(1);

    const otherDoctorWorkspace = await request(app)
      .get(`/api/hospital/patient/${patientId}/workspace`)
      .set("Authorization", drAdeyemiAuth);

    expect(otherDoctorWorkspace.status).toBe(200);
    expect(otherDoctorWorkspace.body.active_drafts).toHaveLength(0);
    expect(otherDoctorWorkspace.body.open_visit ?? null).toBeNull();

    const completeDraft = await request(app)
      .post(`/api/hospital/patient/${patientId}/visit-draft/${draftId}/complete`)
      .set("Authorization", drAmaraAuth)
      .send({});

    expect(completeDraft.status).toBe(200);
    expect(completeDraft.body.completed).toBe(true);
    expect(completeDraft.body.prescriptions_created).toBe(1);
    expect(completeDraft.body.labs_created).toBe(1);

    const ownerAfterComplete = await request(app)
      .get(`/api/hospital/patient/${patientId}/workspace`)
      .set("Authorization", drAmaraAuth);

    expect(ownerAfterComplete.status).toBe(200);
    expect(ownerAfterComplete.body.active_drafts).toHaveLength(0);
    expect(ownerAfterComplete.body.doctor_prescriptions.length).toBeGreaterThan(0);

    const otherDoctorAfterComplete = await request(app)
      .get(`/api/hospital/patient/${patientId}/workspace`)
      .set("Authorization", drAdeyemiAuth);

    expect(otherDoctorAfterComplete.status).toBe(200);
    expect(otherDoctorAfterComplete.body.active_drafts).toHaveLength(0);
    expect(otherDoctorAfterComplete.body.open_visit ?? null).toBeNull();
    expect(otherDoctorAfterComplete.body.doctor_prescriptions).toHaveLength(0);
  });
});
