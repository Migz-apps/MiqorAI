import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import {
  authed,
  getContext,
  initTestContext,
} from "./helpers/context.js";
import { checkAiServiceHealth, checkClinicalSafety } from "../src/services/ai-clinical-safety.client.js";
import type { ClinicalSafetyRequest } from "../src/types/clinical-safety.types.js";

const originalFetch = globalThis.fetch;

describe("Clinical safety integration", () => {
  beforeAll(async () => {
    await initTestContext();
    process.env.MIQORAI_AI_MOCK = "true";
    process.env.AI_SERVICE_URL = "";
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
    vi.restoreAllMocks();
    process.env.MIQORAI_AI_MOCK = "true";
    process.env.AI_SERVICE_URL = "";
  });

  it("GET /api/v1/clinical-safety/health — mock mode", async () => {
    const res = await authed("hospital").get("/api/v1/clinical-safety/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("local mock returns intervention_required for high-risk item", async () => {
    const request: ClinicalSafetyRequest = {
      patient_record: {
        patient_id: "test",
        name: "Test Patient",
        sex: "F",
        date_of_birth: "1990-01-01",
        allergies: [],
        chronic_conditions: [],
        current_medications_as_of_2026_06: [],
      },
      visit_history: [],
      current_complaint: "Chest pain",
      doctor_attempted_action: { type: "test_order", item: "CBC" },
    };

    const response = await checkClinicalSafety(request);
    expect(response.intervention_required).toBe(true);
    expect(response.alert_title).toBeTruthy();
  });

  it("POST /api/hospital/lab-order — blocks when intervention_required", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/lab-order").send({
      patient_id: c.patientId,
      visit_id: c.visitId,
      test_name: "CBC",
    });

    expect(res.status).toBe(409);
    expect(res.body.blocked).toBe(true);
    expect(res.body.pending_action_id).toBeTruthy();
    expect(res.body.ai_alert.intervention_required).toBe(true);
  });

  it("POST /api/v1/clinical-safety/:id/override — requires reason", async () => {
    const c = getContext();
    const blocked = await authed("hospital").post("/api/hospital/lab-order").send({
      patient_id: c.patientId,
      visit_id: c.visitId,
      test_name: "CBC",
    });
    const pendingId = blocked.body.pending_action_id as string;

    const missingReason = await authed("hospital")
      .post(`/api/v1/clinical-safety/${pendingId}/override`)
      .send({ override_reason: "   " });
    expect(missingReason.status).toBe(400);

    const override = await authed("hospital")
      .post(`/api/v1/clinical-safety/${pendingId}/override`)
      .send({ override_reason: "Manual review completed — proceed with CBC" });
    expect(override.status).toBe(200);
    expect(override.body.order_result.lab_order_id).toBeTruthy();
  });

  it("POST /api/v1/clinical-safety/:id/cancel — does not create order", async () => {
    const c = getContext();
    const blocked = await authed("hospital").post("/api/hospital/lab-order").send({
      patient_id: c.patientId,
      visit_id: c.visitIdWaiting || c.visitId,
      test_name: "MRI",
    });
    const pendingId = blocked.body.pending_action_id as string;

    const cancel = await authed("hospital").post(`/api/v1/clinical-safety/${pendingId}/cancel`);
    expect(cancel.status).toBe(200);
    expect(cancel.body.cancelled).toBe(true);
  });

  it("POST /api/hospital/prescription — allows low-risk mock item", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/prescription").send({
      patient_id: c.patientId,
      visit_id: c.visitId,
      pharmacy_id: c.pharmacyId,
      drug_name: "Vitamin D",
      strength: "1000IU",
      dosage: "1 tablet",
      quantity: 30,
      frequency: "daily",
      duration_days: 30,
    });
    expect([200, 201]).toContain(res.status);
    expect(res.body.prescription_id).toBeTruthy();
  });

  it("AI unavailable returns safe fallback", async () => {
    process.env.MIQORAI_AI_MOCK = "false";
    process.env.AI_SERVICE_URL = "http://127.0.0.1:9";

    globalThis.fetch = vi.fn().mockRejectedValue(new Error("connection refused"));

    const request: ClinicalSafetyRequest = {
      patient_record: {
        patient_id: "test",
        name: "Test Patient",
        sex: "M",
        date_of_birth: "1985-05-05",
        allergies: [],
        chronic_conditions: [],
        current_medications_as_of_2026_06: [],
      },
      visit_history: [],
      current_complaint: "Routine visit",
      doctor_attempted_action: { type: "medication_prescription", item: "Vitamin C" },
    };

    const response = await checkClinicalSafety(request);
    expect(response.alert_title).toBe("AI Service Unavailable");
    expect(response.intervention_required).toBe(true);

    const health = await checkAiServiceHealth();
    expect(health).toBeNull();
  });
});
