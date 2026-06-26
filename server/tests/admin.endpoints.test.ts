import { describe, it, expect } from "vitest";
import {
  authed,
  getContext,
} from "./helpers/context.js";
import { prisma } from "../src/lib/prisma.js";

describe("Admin endpoints", () => {
  let invitationId = "";
  let syncQueueId = "";
  let newInsurerId = "";
  let disputeId = "";

  it("GET /api/admin/dashboard", async () => {
    const res = await authed("admin").get("/api/admin/dashboard");
    expect(res.status).toBe(200);
    expect(res.body.total_patients).toBeGreaterThan(0);
  });

  it("GET /api/admin/hospitals", async () => {
    const res = await authed("admin").get("/api/admin/hospitals");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/hospitals/:id", async () => {
    const c = getContext();
    const res = await authed("admin").get(`/api/admin/hospitals/${c.hospitalId}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/hospitals/stats", async () => {
    const res = await authed("admin").get("/api/admin/hospitals/stats");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/hospitals/stats/pilot-ending", async () => {
    const res = await authed("admin").get("/api/admin/hospitals/stats/pilot-ending");
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/hospitals/:id/status", async () => {
    const c = getContext();
    const res = await authed("admin")
      .put(`/api/admin/hospitals/${c.hospitalId}/status`)
      .send({ status: "active" });
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/hospitals/:id/approve", async () => {
    const c = getContext();
    const res = await authed("admin")
      .post(`/api/admin/hospitals/${c.hospitalIdAlt}/approve`)
      .send({ verified_by: c.userIds.admin });
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/admin/hospitals/:id/reject", async () => {
    const c = getContext();
    const res = await authed("admin")
      .post(`/api/admin/hospitals/${c.hospitalIdAlt}/reject`)
      .send({ reason: "API test reject path" });
    expect([200, 400]).toContain(res.status);
    await prisma.hospital.update({ where: { id: c.hospitalIdAlt }, data: { isActive: true } });
  });

  it("GET /api/admin/pharmacies", async () => {
    const res = await authed("admin").get("/api/admin/pharmacies");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/pharmacies/stats", async () => {
    const res = await authed("admin").get("/api/admin/pharmacies/stats");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/pharmacies/:id", async () => {
    const c = getContext();
    const res = await authed("admin").get(`/api/admin/pharmacies/${c.pharmacyId}`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/pharmacies/:id/status", async () => {
    const c = getContext();
    const res = await authed("admin")
      .put(`/api/admin/pharmacies/${c.pharmacyId}/status`)
      .send({ status: "active" });
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/pharmacies/:id/approve", async () => {
    const c = getContext();
    const res = await authed("admin")
      .post(`/api/admin/pharmacies/${c.pharmacyId}/approve`)
      .send({ verified_by: c.userIds.admin });
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/admin/pharmacies/:id/reject", async () => {
    const c = getContext();
    const res = await authed("admin")
      .post(`/api/admin/pharmacies/${c.pharmacyId}/reject`)
      .send({ reason: "API test pharmacy reject" });
    expect([200, 400]).toContain(res.status);
    await prisma.pharmacy.update({ where: { id: c.pharmacyId }, data: { isActive: true } });
  });

  it("GET /api/admin/insurers", async () => {
    const res = await authed("admin").get("/api/admin/insurers");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/insurers/stats", async () => {
    const res = await authed("admin").get("/api/admin/insurers/stats");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/insurers", async () => {
    const suffix = Date.now().toString().slice(-5);
    const res = await authed("admin").post("/api/admin/insurers").send({
      code: `TST${suffix}`,
      name: `Test Insurer ${suffix}`,
      registration_number: `INS-TEST-${suffix}`,
      fee_percentage: 20,
      country: "Rwanda",
    });
    expect([200, 201]).toContain(res.status);
    newInsurerId = res.body.id ?? "";
  });

  it("PUT /api/admin/insurers/:id", async () => {
    const c = getContext();
    const id = newInsurerId || c.insurerId;
    const res = await authed("admin").put(`/api/admin/insurers/${id}`).send({
      fee_percentage: 19,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/disputes", async () => {
    const res = await authed("admin").get("/api/admin/disputes");
    expect(res.status).toBe(200);
    disputeId = res.body.items?.[0]?.id ?? res.body[0]?.id ?? "";
  });

  it("GET /api/admin/disputes/:id", async () => {
    if (!disputeId) return;
    const res = await authed("admin").get(`/api/admin/disputes/${disputeId}`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/disputes/:id", async () => {
    if (!disputeId) return;
    const res = await authed("admin")
      .put(`/api/admin/disputes/${disputeId}`)
      .send({ status: "investigating", resolution_notes: "API test" });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/audit-logs", async () => {
    const res = await authed("admin").get("/api/admin/audit-logs");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/audit-logs/export", async () => {
    const res = await authed("admin").post("/api/admin/audit-logs/export").send({
      format: "csv",
      date_range: { start: "2026-01-01", end: "2026-12-31" },
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/revenue", async () => {
    const res = await authed("admin").get("/api/admin/revenue");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/invite", async () => {
    const res = await authed("admin").post("/api/admin/invite").send({
      email: `invite.${Date.now()}@example.com`,
      role: "hospital_admin",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/admin/invitations", async () => {
    const res = await authed("admin").get("/api/admin/invitations");
    expect(res.status).toBe(200);
    invitationId = res.body.items?.[0]?.id ?? res.body[0]?.id ?? "";
  });

  it("DELETE /api/admin/invitations/:id", async () => {
    if (!invitationId) return;
    const res = await authed("admin").delete(`/api/admin/invitations/${invitationId}`);
    expect([200, 204]).toContain(res.status);
  });

  it("GET /api/admin/system/health", async () => {
    const res = await authed("admin").get("/api/admin/system/health");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/system/health/extended", async () => {
    const res = await authed("admin").get("/api/admin/system/health/extended");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/system/latency", async () => {
    const res = await authed("admin").get("/api/admin/system/latency");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/system/queue", async () => {
    const res = await authed("admin").get("/api/admin/system/queue");
    expect(res.status).toBe(200);
    syncQueueId = res.body.items?.[0]?.id ?? "";
  });

  it("POST /api/admin/system/queue/retry", async () => {
    if (!syncQueueId) return;
    const res = await authed("admin")
      .post("/api/admin/system/queue/retry")
      .send({ ids: [syncQueueId] });
    expect([200, 400]).toContain(res.status);
  });

  it("DELETE /api/admin/system/queue/:id", async () => {
    if (!syncQueueId) return;
    const res = await authed("admin").delete(`/api/admin/system/queue/${syncQueueId}`);
    expect([200, 204, 404]).toContain(res.status);
  });

  it("GET /api/admin/settings", async () => {
    const res = await authed("admin").get("/api/admin/settings");
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/settings", async () => {
    const res = await authed("admin")
      .put("/api/admin/settings")
      .send({ savings_fee_percentage: 20 });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/approvals/pending", async () => {
    const res = await authed("admin").get("/api/admin/approvals/pending");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/onboarding/:id/approve", async () => {
    const c = getContext();
    if (!c.onboardingRequestId) return;
    const res = await authed("admin").post(`/api/admin/onboarding/${c.onboardingRequestId}/approve`);
    expect([200, 400]).toContain(res.status);
  });

  it("GET /api/admin/patients", async () => {
    const res = await authed("admin").get("/api/admin/patients");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/patients/enriched", async () => {
    const res = await authed("admin").get("/api/admin/patients/enriched");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/patients/search", async () => {
    const res = await authed("admin").get("/api/admin/patients/search").query({ q: "Grace" });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/patients/:id", async () => {
    const c = getContext();
    const res = await authed("admin").get(`/api/admin/patients/${c.patientId}`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/admin/patients/:id/status", async () => {
    const c = getContext();
    const res = await authed("admin")
      .put(`/api/admin/patients/${c.patientId}/status`)
      .send({ is_active: true });
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/metrics/hourly", async () => {
    const res = await authed("admin").get("/api/admin/metrics/hourly");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/invoices", async () => {
    const res = await authed("admin").get("/api/admin/invoices");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/invoices", async () => {
    const c = getContext();
    const res = await authed("admin").post("/api/admin/invoices").send({
      customer_type: "hospital",
      customer_id: c.hospitalId,
      customer_name: "Kijani Medical Centre",
      period: "2026-06",
      amount: 499,
      due_date: "2026-07-15",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/admin/network", async () => {
    const res = await authed("admin").get("/api/admin/network");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/transactions", async () => {
    const res = await authed("admin").get("/api/admin/transactions");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/transactions/ledger", async () => {
    const res = await authed("admin").get("/api/admin/transactions/ledger");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/activity", async () => {
    const res = await authed("admin").get("/api/admin/activity");
    expect(res.status).toBe(200);
  });

  it("GET /api/admin/compliance/summary", async () => {
    const res = await authed("admin").get("/api/admin/compliance/summary");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/dashboard/export", async () => {
    const res = await authed("admin").post("/api/admin/dashboard/export");
    expect(res.status).toBe(200);
  });

  it("POST /api/admin/reports/insurer", async () => {
    const c = getContext();
    const res = await authed("admin")
      .post("/api/admin/reports/insurer")
      .send({ insurer_id: c.insurerId, format: "csv" });
    expect(res.status).toBe(200);
  });
});
