import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { authed } from "./helpers/context.js";
import { extractMedicalKeywords } from "../src/services/ai-visit.service.js";

describe("AI visit integration", () => {
  const prevEnabled = process.env.AI_SERVICE_ENABLED;
  const prevMock = process.env.MIQORAI_AI_MOCK;
  const prevUrl = process.env.AI_SERVICE_URL;

  beforeEach(() => {
    process.env.AI_SERVICE_ENABLED = "true";
    process.env.MIQORAI_AI_MOCK = "true";
    process.env.AI_SERVICE_URL = "";
  });

  afterEach(() => {
    process.env.AI_SERVICE_ENABLED = prevEnabled;
    process.env.MIQORAI_AI_MOCK = prevMock;
    process.env.AI_SERVICE_URL = prevUrl;
  });

  it("extractMedicalKeywords pulls clinical terms", () => {
    const keywords = extractMedicalKeywords("Patient has chest pain and shortness of breath", "Hypertension follow-up");
    expect(keywords.some((k) => k.includes("chest") || k.includes("pain") || k.includes("hypertension"))).toBe(true);
  });

  it("GET /api/ai/health", async () => {
    const res = await authed("hospital").get("/api/ai/health");
    expect(res.status).toBe(200);
    expect(res.body.enabled).toBe(true);
  });

  it("POST /api/ai/relevant-history — mock mode", async () => {
    const patients = await authed("hospital").get("/api/hospital/patients/search?q=Grace");
    const patientId = patients.body.patient_id ?? patients.body[0]?.patient_id;
    expect(patientId).toBeTruthy();

    const res = await authed("hospital").post("/api/ai/relevant-history").send({
      patientId,
      visitContext: {
        chiefComplaint: "diabetes follow-up",
        symptoms: "increased thirst",
        assessment: "type 2 diabetes",
        diagnosis: "5A11",
      },
    });
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.relevantHistory)).toBe(true);
  });

  it("POST /api/ai/check-action — duplicate lab mock", async () => {
    const patients = await authed("hospital").get("/api/hospital/patients/search?q=Grace");
    const patientId = patients.body.patient_id ?? patients.body[0]?.patient_id;

    const res = await authed("hospital").post("/api/ai/check-action").send({
      patientId,
      action: { type: "LAB_ORDER", name: "HbA1c" },
      visitContext: { chiefComplaint: "diabetes review" },
    });
    expect(res.status).toBe(200);
    expect(typeof res.body.hasAlert).toBe("boolean");
  });

  it("POST /api/ai/check-action — safe when AI disabled", async () => {
    process.env.AI_SERVICE_ENABLED = "false";
    const patients = await authed("hospital").get("/api/hospital/patients/search?q=Grace");
    const patientId = patients.body.patient_id ?? patients.body[0]?.patient_id;

    const res = await authed("hospital").post("/api/ai/check-action").send({
      patientId,
      action: { type: "LAB_ORDER", name: "CBC" },
      visitContext: { chiefComplaint: "routine" },
    });
    expect(res.status).toBe(200);
    expect(res.body.hasAlert).toBe(false);
  });

  it("POST /api/ai/override — saves override", async () => {
    const patients = await authed("hospital").get("/api/hospital/patients/search?q=Grace");
    const patientId = patients.body.patient_id ?? patients.body[0]?.patient_id;

    const res = await authed("hospital").post("/api/ai/override").send({
      patientId,
      actionType: "LAB_ORDER",
      actionName: "HbA1c",
      aiAlertType: "DUPLICATE_TEST",
      aiSeverity: "HIGH",
      aiMessage: "Duplicate test",
      overrideReason: "Clinical status changed since last test",
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
  });
});
