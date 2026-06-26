import { describe, it, expect } from "vitest";
import {
  authed,
  getContext,
} from "./helpers/context.js";

describe("Pharmacy endpoints", () => {
  let rxId = "";
  let holdRxId = "";
  let newInventoryId = "";
  let createdInventoryId = "";

  it("GET /api/pharmacy/dashboard", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/dashboard");
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/prescriptions", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/prescriptions");
    expect(res.status).toBe(200);
    rxId = res.body.items?.[0]?.id ?? getContext().prescriptionId;
    holdRxId =
      res.body.items?.find((i: { status: string }) => i.status === "pending")?.id ??
      getContext().prescriptionIdPending;
  });

  it("GET /api/pharmacy/prescription/:id", async () => {
    const res = await authed("pharmacy").get(`/api/pharmacy/prescription/${rxId}`);
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/prescription/:id/verify", async () => {
    const id = holdRxId || rxId;
    const res = await authed("pharmacy").post(`/api/pharmacy/prescription/${id}/verify`);
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/pharmacy/prescription/:id/ready", async () => {
    const id = holdRxId || rxId;
    const res = await authed("pharmacy").post(`/api/pharmacy/prescription/${id}/ready`);
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/pharmacy/prescription/:id/hold", async () => {
    const res = await authed("pharmacy")
      .post(`/api/pharmacy/prescription/${rxId}/hold`)
      .send({ reason: "Awaiting clarification", notes: "API test hold" });
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/pharmacy/prescription/:id/notify-doctor", async () => {
    const res = await authed("pharmacy").post(`/api/pharmacy/prescription/${rxId}/notify-doctor`);
    expect([200, 400]).toContain(res.status);
  });

  it("POST /api/pharmacy/prescription/:id/reject", async () => {
    const pending = holdRxId || getContext().prescriptionIdPending;
    if (!pending) return;
    const res = await authed("pharmacy")
      .post(`/api/pharmacy/prescription/${pending}/reject`)
      .send({ reason: "Test rejection", notes: "API test" });
    expect([200, 400]).toContain(res.status);
  });

  it("GET /api/pharmacy/inventory", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/inventory");
    expect(res.status).toBe(200);
    newInventoryId = res.body.items?.[0]?.id ?? getContext().inventoryId;
  });

  it("POST /api/pharmacy/inventory", async () => {
    const res = await authed("pharmacy").post("/api/pharmacy/inventory").send({
      drug_name: "Test Drug API",
      strength: "10mg",
      stock: 50,
      reorder_point: 10,
      unit_price: 8.5,
      cost_price: 5.0,
      dosage_form: "tablet",
      requires_prescription: true,
    });
    expect([200, 201]).toContain(res.status);
    createdInventoryId = res.body.id ?? "";
  });

  it("PUT /api/pharmacy/inventory/:id", async () => {
    const id = createdInventoryId || newInventoryId;
    const res = await authed("pharmacy").put(`/api/pharmacy/inventory/${id}`).send({
      stock: 55,
      unit_price: 9.0,
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/inventory/adjust", async () => {
    const id = createdInventoryId || newInventoryId;
    const res = await authed("pharmacy").post("/api/pharmacy/inventory/adjust").send({
      drug_id: id,
      adjustment: 5,
      reason: "API test stock adjustment",
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/inventory/barcode/:barcode", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/inventory/barcode/not-found-barcode");
    expect([200, 404]).toContain(res.status);
  });

  it("GET /api/pharmacy/patients/search", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/patients/search").query({ q: "Grace" });
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/patients", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/patients");
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/patient/:id", async () => {
    const c = getContext();
    const res = await authed("pharmacy").get(`/api/pharmacy/patient/${c.patientId}`);
    expect([200, 403, 404]).toContain(res.status);
  });

  it("GET /api/pharmacy/patient/:id/adherence", async () => {
    const c = getContext();
    const res = await authed("pharmacy").get(`/api/pharmacy/patient/${c.patientId}/adherence`);
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/patient/:id/adherence/history", async () => {
    const c = getContext();
    const res = await authed("pharmacy").get(`/api/pharmacy/patient/${c.patientId}/adherence/history`);
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/adherence", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/adherence");
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/adherence/remind", async () => {
    const c = getContext();
    const res = await authed("pharmacy")
      .post("/api/pharmacy/adherence/remind")
      .send({ patient_id: c.patientId, message: "Please refill your medication" });
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/prescription/:id/dispense", async () => {
    const c = getContext();
    const invId = createdInventoryId || newInventoryId;
    const readyRx =
      (await authed("pharmacy").get("/api/pharmacy/prescriptions")).body.items?.find(
        (i: { status: string }) => i.status === "ready" || i.status === "verified",
      )?.id ?? rxId;
    const res = await authed("pharmacy")
      .post(`/api/pharmacy/prescription/${readyRx}/dispense`)
      .send({
        dispensed_by: c.pharmacyStaffUserId,
        items: [{ drug_id: invId, quantity: 1 }],
        payment: { method: "cash", copay: 5 },
      });
    expect([200, 400]).toContain(res.status);
  });

  it("PUT /api/pharmacy/prescription/:id/pickup", async () => {
    const dispensed = (await authed("pharmacy").get("/api/pharmacy/prescriptions")).body.items?.find(
      (i: { status: string }) => i.status === "dispensed" || i.status === "ready",
    )?.id;
    if (!dispensed) return;
    const res = await authed("pharmacy")
      .put(`/api/pharmacy/prescription/${dispensed}/pickup`)
      .send({ picked_up_by: "Grace Muthoni" });
    expect([200, 400]).toContain(res.status);
  });

  it("GET /api/pharmacy/reports", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/reports");
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/reports/export", async () => {
    const res = await authed("pharmacy").post("/api/pharmacy/reports/export").send({ type: "dispensing" });
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/invoices", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/invoices");
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/billing/receipts", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/billing/receipts");
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/billing/export", async () => {
    const res = await authed("pharmacy").post("/api/pharmacy/billing/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/pharmacy/audit-logs", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/audit-logs");
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/scan/qr", async () => {
    const c = getContext();
    const res = await authed("pharmacy").post("/api/pharmacy/scan/qr").send({
      patient_id: c.patientId,
      hash: c.qrHash,
    });
    expect([200, 400, 403]).toContain(res.status);
  });

  it("GET /api/pharmacy/staff", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/staff");
    expect(res.status).toBe(200);
  });

  it("POST /api/pharmacy/staff/invite", async () => {
    const res = await authed("pharmacy").post("/api/pharmacy/staff/invite").send({
      email: `pharm.staff.${Date.now()}@example.com`,
      role: "technician",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/pharmacy/settings", async () => {
    const res = await authed("pharmacy").get("/api/pharmacy/settings");
    expect(res.status).toBe(200);
  });

  it("PUT /api/pharmacy/settings", async () => {
    const res = await authed("pharmacy").put("/api/pharmacy/settings").send({
      auto_verify: false,
    });
    expect(res.status).toBe(200);
  });

  it("DELETE /api/pharmacy/inventory/:id", async () => {
    if (!createdInventoryId) return;
    const res = await authed("pharmacy").delete(`/api/pharmacy/inventory/${createdInventoryId}`);
    expect([200, 204]).toContain(res.status);
  });
});
