import { describe, it, expect } from "vitest";
import {
  authed,
  getContext,
} from "./helpers/context.js";

describe("Patient endpoints", () => {
  let recordId = "";
  let newGrantId = "";
  let newContactId = "";
  let createdRecordId = "";

  it("GET /api/patient/profile", async () => {
    const res = await authed("patient").get("/api/patient/profile");
    expect(res.status).toBe(200);
    expect(res.body.id).toBe(getContext().patientId);
  });

  it("PUT /api/patient/profile", async () => {
    const res = await authed("patient").put("/api/patient/profile").send({
      emergency_contact_name: "Updated Contact",
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/qr-code", async () => {
    const res = await authed("patient").get("/api/patient/qr-code");
    expect(res.status).toBe(200);
    expect(res.body.qr_code).toMatch(/^data:image/);
  });

  it("GET /api/patient/dashboard", async () => {
    const res = await authed("patient").get("/api/patient/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.quick_stats).toBeTruthy();
  });

  it("GET /api/patient/records", async () => {
    const res = await authed("patient").get("/api/patient/records");
    expect(res.status).toBe(200);
    recordId = res.body.items?.[0]?.id ?? getContext().recordId;
  });

  it("POST /api/patient/records", async () => {
    const res = await authed("patient").post("/api/patient/records").send({
      record_type: "allergy",
      data: { name: "Test Allergy", severity: "mild" },
    });
    expect(res.status).toBe(201);
    createdRecordId = res.body.id;
  });

  it("GET /api/patient/records/:id", async () => {
    const res = await authed("patient").get(`/api/patient/records/${recordId}`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/patient/records/:id", async () => {
    const res = await authed("patient")
      .put(`/api/patient/records/${recordId}`)
      .send({ data: { name: "Updated record", severity: "moderate" } });
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/visits", async () => {
    const res = await authed("patient").get("/api/patient/visits");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/prescriptions", async () => {
    const res = await authed("patient").get("/api/patient/prescriptions");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/labs", async () => {
    const res = await authed("patient").get("/api/patient/labs");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/allergies", async () => {
    const res = await authed("patient").get("/api/patient/allergies");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/access-grants", async () => {
    const res = await authed("patient").get("/api/patient/access-grants");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/providers/search", async () => {
    const res = await authed("patient").get("/api/patient/providers/search").query({ q: "St" });
    expect(res.status).toBe(200);
  });

  it("POST /api/patient/access-grants", async () => {
    const c = getContext();
    const res = await authed("patient").post("/api/patient/access-grants").send({
      grantee_type: "hospital",
      grantee_id: c.hospitalIdAlt,
      expires_at: "2027-12-31",
      scope: "lab_results",
    });
    expect([200, 201]).toContain(res.status);
    newGrantId = res.body.id ?? "";
  });

  it("GET /api/patient/access-logs", async () => {
    const res = await authed("patient").get("/api/patient/access-logs");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/family", async () => {
    const res = await authed("patient").get("/api/patient/family");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/family/:id/profile", async () => {
    const c = getContext();
    if (!c.dependentPatientId) return;
    const res = await authed("patient").get(`/api/patient/family/${c.dependentPatientId}/profile`);
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/family/:id/dashboard", async () => {
    const c = getContext();
    if (!c.dependentPatientId) return;
    const res = await authed("patient").get(`/api/patient/family/${c.dependentPatientId}/dashboard`);
    expect(res.status).toBe(200);
  });

  it("POST /api/patient/family/dependents", async () => {
    const suffix = Date.now().toString().slice(-6);
    const res = await authed("patient").post("/api/patient/family/dependents").send({
      name: `Test Child ${suffix}`,
      date_of_birth: "2020-05-01",
      relationship: "child",
      access_level: "read_only",
    });
    expect([200, 201, 400]).toContain(res.status);
  });

  it("GET /api/patient/settings", async () => {
    const res = await authed("patient").get("/api/patient/settings");
    expect(res.status).toBe(200);
  });

  it("PUT /api/patient/settings", async () => {
    const res = await authed("patient").put("/api/patient/settings").send({
      language: "en",
      theme: "light",
      notifications: { email: true },
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/health-insights", async () => {
    const res = await authed("patient").get("/api/patient/health-insights");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/recovery-phrase", async () => {
    const res = await authed("patient").get("/api/patient/recovery-phrase");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/emergency-contacts", async () => {
    const res = await authed("patient").get("/api/patient/emergency-contacts");
    expect(res.status).toBe(200);
  });

  it("POST /api/patient/emergency-contacts", async () => {
    const res = await authed("patient").post("/api/patient/emergency-contacts").send({
      name: "API Test Contact",
      phone: "+254700111222",
      relationship: "Friend",
    });
    expect([200, 201]).toContain(res.status);
    newContactId = res.body.id ?? "";
  });

  it("PUT /api/patient/emergency-contacts/:id", async () => {
    const c = getContext();
    const id = newContactId || c.emergencyContactId;
    const res = await authed("patient").put(`/api/patient/emergency-contacts/${id}`).send({
      name: "Updated Emergency Contact",
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/patient/export-data", async () => {
    const res = await authed("patient").post("/api/patient/export-data");
    expect(res.status).toBe(200);
  });

  it("GET /api/patient/deletion-request", async () => {
    const res = await authed("patient").get("/api/patient/deletion-request");
    expect([200, 404]).toContain(res.status);
  });

  it("POST /api/patient/deletion-request", async () => {
    const res = await authed("patient").post("/api/patient/deletion-request").send({
      reason: "Testing deletion request endpoint",
    });
    expect([200, 201, 409]).toContain(res.status);
  });

  it("DELETE /api/patient/access-grants/:id", async () => {
    if (!newGrantId) return;
    const res = await authed("patient").delete(`/api/patient/access-grants/${newGrantId}`);
    expect([200, 204]).toContain(res.status);
  });

  it("DELETE /api/patient/emergency-contacts/:id", async () => {
    if (!newContactId) return;
    const res = await authed("patient").delete(`/api/patient/emergency-contacts/${newContactId}`);
    expect([200, 204]).toContain(res.status);
  });

  it("DELETE /api/patient/records/:id", async () => {
    if (!createdRecordId) return;
    const res = await authed("patient").delete(`/api/patient/records/${createdRecordId}`);
    expect([200, 204]).toContain(res.status);
  });
});
