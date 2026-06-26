import { describe, it, expect } from "vitest";
import {
  authed,
  getContext,
} from "./helpers/context.js";

describe("Insurer endpoints", () => {
  let apiKeyId = "";
  let reportHistoryId = "";
  let alertId = "";
  let invoiceId = "";

  it("GET /api/insurer/dashboard", async () => {
    const res = await authed("insurer").get("/api/insurer/dashboard");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/savings", async () => {
    const res = await authed("insurer").get("/api/insurer/savings");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/savings/calculator", async () => {
    const res = await authed("insurer").get("/api/insurer/savings/calculator").query({
      test_type: "CBC",
      amount: 100,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/savings/records", async () => {
    const res = await authed("insurer").get("/api/insurer/savings/records");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/savings/export", async () => {
    const res = await authed("insurer").post("/api/insurer/savings/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/adherence", async () => {
    const res = await authed("insurer").get("/api/insurer/adherence");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/adherence/remind", async () => {
    const c = getContext();
    const res = await authed("insurer")
      .post("/api/insurer/adherence/remind")
      .send({ patient_id: c.patientId });
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/adherence/export", async () => {
    const res = await authed("insurer").post("/api/insurer/adherence/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/fraud/anomalies", async () => {
    const res = await authed("insurer").get("/api/insurer/fraud/anomalies");
    expect(res.status).toBe(200);
    expect(res.body.flagged_claims?.length).toBeGreaterThan(0);
  });

  it("GET /api/insurer/fraud/claims/:claimId", async () => {
    const c = getContext();
    const res = await authed("insurer").get(`/api/insurer/fraud/claims/${c.claimId}`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/insurer/fraud/:claimId/status", async () => {
    const c = getContext();
    const res = await authed("insurer")
      .put(`/api/insurer/fraud/${c.claimId}/status`)
      .send({ status: "investigating", notes: "API test review" });
    expect(res.status).toBe(200);
  });

  it("PUT /api/insurer/fraud/bulk-status", async () => {
    const c = getContext();
    const res = await authed("insurer")
      .put("/api/insurer/fraud/bulk-status")
      .send({ claim_ids: [c.claimId], status: "investigating" });
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/fraud/export", async () => {
    const res = await authed("insurer").post("/api/insurer/fraud/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/utilization", async () => {
    const res = await authed("insurer").get("/api/insurer/utilization");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/utilization/enriched", async () => {
    const res = await authed("insurer").get("/api/insurer/utilization/enriched");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/analytics", async () => {
    const res = await authed("insurer").get("/api/insurer/analytics");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/reports/generate", async () => {
    const res = await authed("insurer")
      .post("/api/insurer/reports/generate")
      .send({
        date_range: { start: "2024-01-01", end: "2025-12-31" },
        metrics: ["savings", "fraud"],
        format: "csv",
      });
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/reports/history", async () => {
    const res = await authed("insurer").get("/api/insurer/reports/history");
    expect(res.status).toBe(200);
    reportHistoryId = res.body.items?.[0]?.id ?? res.body[0]?.id ?? "";
  });

  it("POST /api/insurer/reports/schedule", async () => {
    const res = await authed("insurer").post("/api/insurer/reports/schedule").send({
      report_type: "fraud",
      frequency: "monthly",
      email: "reports@nhidemo.demo",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/insurer/contract", async () => {
    const res = await authed("insurer").get("/api/insurer/contract");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/contract/usage", async () => {
    const res = await authed("insurer").get("/api/insurer/contract/usage");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/contract/pdf", async () => {
    const res = await authed("insurer").get("/api/insurer/contract/pdf");
    expect([200, 404]).toContain(res.status);
  });

  it("POST /api/insurer/contract/amendment", async () => {
    const res = await authed("insurer")
      .post("/api/insurer/contract/amendment")
      .send({ fee_percentage: 18, notes: "API test amendment" });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/insurer/invoices", async () => {
    const res = await authed("insurer").get("/api/insurer/invoices");
    expect(res.status).toBe(200);
    invoiceId = res.body.items?.[0]?.id ?? res.body[0]?.id ?? "";
  });

  it("POST /api/insurer/invoices/:id/pay", async () => {
    if (!invoiceId) return;
    const res = await authed("insurer").post(`/api/insurer/invoices/${invoiceId}/pay`);
    expect([200, 400, 404]).toContain(res.status);
  });

  it("GET /api/insurer/patients/list", async () => {
    const res = await authed("insurer").get("/api/insurer/patients/list");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/members/stats", async () => {
    const res = await authed("insurer").get("/api/insurer/members/stats");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/members/export", async () => {
    const res = await authed("insurer").get("/api/insurer/members/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/members/enriched", async () => {
    const res = await authed("insurer").get("/api/insurer/members/enriched");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/members", async () => {
    const c = getContext();
    const res = await authed("insurer").post("/api/insurer/members").send({
      patient_id: c.patientId,
      member_number: `NHIF-TEST-${Date.now()}`,
    });
    expect([200, 201, 400, 409]).toContain(res.status);
  });

  it("GET /api/insurer/alerts", async () => {
    const res = await authed("insurer").get("/api/insurer/alerts");
    expect(res.status).toBe(200);
    alertId = res.body.items?.[0]?.id ?? res.body[0]?.id ?? "";
  });

  it("PUT /api/insurer/alerts/:id/read", async () => {
    if (!alertId) return;
    const res = await authed("insurer").put(`/api/insurer/alerts/${alertId}/read`);
    expect([200, 404]).toContain(res.status);
  });

  it("GET /api/insurer/providers/risk", async () => {
    const res = await authed("insurer").get("/api/insurer/providers/risk");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/providers/investigate", async () => {
    const res = await authed("insurer")
      .post("/api/insurer/providers/investigate")
      .send({ provider_name: "MiqorAI Demo Hospital", reason: "API test investigation" });
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/audit-logs", async () => {
    const res = await authed("insurer").get("/api/insurer/audit-logs");
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/staff", async () => {
    const res = await authed("insurer").get("/api/insurer/staff");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/staff/invite", async () => {
    const res = await authed("insurer").post("/api/insurer/staff/invite").send({
      email: `insurer.staff.${Date.now()}@example.com`,
      role: "analyst",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/insurer/settings", async () => {
    const res = await authed("insurer").get("/api/insurer/settings");
    expect(res.status).toBe(200);
  });

  it("PUT /api/insurer/settings", async () => {
    const res = await authed("insurer").put("/api/insurer/settings").send({
      fraud_alert_threshold: 70,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/api-keys", async () => {
    const res = await authed("insurer").get("/api/insurer/api-keys");
    expect(res.status).toBe(200);
  });

  it("POST /api/insurer/api-keys", async () => {
    const res = await authed("insurer").post("/api/insurer/api-keys").send({
      label: "API test key",
    });
    expect([200, 201]).toContain(res.status);
    apiKeyId = res.body.id ?? "";
  });

  it("POST /api/insurer/api-keys/:id/rotate", async () => {
    if (!apiKeyId) return;
    const res = await authed("insurer").post(`/api/insurer/api-keys/${apiKeyId}/rotate`);
    expect([200, 404]).toContain(res.status);
  });

  it("DELETE /api/insurer/api-keys/:id", async () => {
    if (!apiKeyId) return;
    const res = await authed("insurer").delete(`/api/insurer/api-keys/${apiKeyId}`);
    expect([200, 204]).toContain(res.status);
  });

  it("GET /api/insurer/search", async () => {
    const res = await authed("insurer").get("/api/insurer/search").query({ q: "Grace" });
    expect(res.status).toBe(200);
  });

  it("GET /api/insurer/reports/history/:id", async () => {
    if (!reportHistoryId) return;
    const res = await authed("insurer").get(`/api/insurer/reports/history/${reportHistoryId}`);
    expect([200, 404]).toContain(res.status);
  });
});
