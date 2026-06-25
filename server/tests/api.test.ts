import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import { createApp } from "../src/app.js";
import { connectDb, disconnectDb, prisma } from "../src/lib/prisma.js";

const app = createApp();
const PASSWORD = "MiqorAI123!";

describe("MiqorAI API integration", () => {
  let patientToken = "";
  let hospitalToken = "";
  let pharmacyToken = "";
  let insurerToken = "";
  let adminToken = "";
  let patientId = "";
  let prescriptionId = "";
  let inventoryId = "";

  beforeAll(async () => {
    await connectDb();
  });

  afterAll(async () => {
    await disconnectDb();
  });

  it("health check", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });

  it("admin login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@miqorai.com",
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    adminToken = res.body.access_token;
    expect(adminToken).toBeTruthy();
  });

  it("patient login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "grace.muthoni@example.com",
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    patientToken = res.body.access_token;
    expect(res.body.user.role).toBe("patient");
  });

  it("hospital login with org code", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "amara@stcatherine.med",
      password: PASSWORD,
      organization_code: "MP-LAGOS-001",
    });
    expect(res.status).toBe(200);
    hospitalToken = res.body.access_token;
  });

  it("pharmacy login with org code", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "brian@goodlife.co.ke",
      password: PASSWORD,
      organization_code: "MPC-GOODLIFE-001",
    });
    expect(res.status).toBe(200);
    pharmacyToken = res.body.access_token;
  });

  it("insurer login with org code", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "wanjiku@jubilee.co.ke",
      password: PASSWORD,
      organization_code: "JUBILEE_001",
    });
    expect(res.status).toBe(200);
    insurerToken = res.body.access_token;
  });

  it("patient profile and QR (read-only)", async () => {
    const profile = await request(app)
      .get("/api/patient/profile")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(profile.status).toBe(200);
    patientId = profile.body.id;

    const qr1 = await request(app)
      .get("/api/patient/qr-code")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(qr1.status).toBe(200);
    expect(qr1.body.qr_code).toMatch(/^data:image/);

    await request(app)
      .post("/api/patient/records")
      .set("Authorization", `Bearer ${patientToken}`)
      .send({
        record_type: "medication",
        data: { name: "Metformin", dose: "500mg" },
      });

    const qr2 = await request(app)
      .get("/api/patient/qr-code")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(qr2.status).toBe(200);
    expect(qr2.body.version).toBeGreaterThanOrEqual(qr1.body.version);
  });

  it("hospital dashboard and patient access", async () => {
    const dash = await request(app)
      .get("/api/hospital/dashboard")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(dash.status).toBe(200);

    const patient = await request(app)
      .get(`/api/hospital/patient/${patientId}`)
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(patient.status).toBe(200);

    const census = await request(app)
      .get("/api/hospital/patients/census")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(census.status).toBe(200);
    expect(Array.isArray(census.body)).toBe(true);

    const referrals = await request(app)
      .get("/api/hospital/referrals")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(referrals.status).toBe(200);

    const billing = await request(app)
      .get("/api/hospital/billing")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(billing.status).toBe(200);
    expect(billing.body.plan).toBeTruthy();

    const audit = await request(app)
      .get("/api/hospital/audit-logs")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(audit.status).toBe(200);

    const departments = await request(app)
      .get("/api/hospital/departments")
      .set("Authorization", `Bearer ${hospitalToken}`);
    expect(departments.status).toBe(200);
    expect(departments.body.length).toBeGreaterThan(0);

    const referral = await request(app)
      .post("/api/hospital/referral")
      .set("Authorization", `Bearer ${hospitalToken}`)
      .send({
        patient_id: patientId,
        from_department: "General",
        to_department: "Cardiology",
        urgency: "routine",
        reason: "Integration test referral",
      });
    expect(referral.status).toBe(201);
  });

  it("patient dashboard and records", async () => {
    const dash = await request(app)
      .get("/api/patient/dashboard")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.quick_stats).toBeTruthy();

    const records = await request(app)
      .get("/api/patient/records")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(records.status).toBe(200);
    expect(records.body.items).toBeDefined();

    const grants = await request(app)
      .get("/api/patient/access-grants")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(grants.status).toBe(200);
  });

  it("pharmacy dashboard and prescription workflow", async () => {
    const dash = await request(app)
      .get("/api/pharmacy/dashboard")
      .set("Authorization", `Bearer ${pharmacyToken}`);
    expect(dash.status).toBe(200);

    const rxList = await request(app)
      .get("/api/pharmacy/prescriptions")
      .set("Authorization", `Bearer ${pharmacyToken}`);
    expect(rxList.status).toBe(200);
    expect(rxList.body.items.length).toBeGreaterThan(0);
    prescriptionId = rxList.body.items[0].id;

    const inv = await request(app)
      .get("/api/pharmacy/inventory")
      .set("Authorization", `Bearer ${pharmacyToken}`);
    expect(inv.status).toBe(200);
    inventoryId = inv.body.items[0].id;

    const verify = await request(app)
      .post(`/api/pharmacy/prescription/${prescriptionId}/verify`)
      .set("Authorization", `Bearer ${pharmacyToken}`);
    expect(verify.status).toBe(200);

    const ready = await request(app)
      .post(`/api/pharmacy/prescription/${prescriptionId}/ready`)
      .set("Authorization", `Bearer ${pharmacyToken}`);
    expect(ready.status).toBe(200);
  });

  it("insurer dashboard and fraud", async () => {
    const dash = await request(app)
      .get("/api/insurer/dashboard")
      .set("Authorization", `Bearer ${insurerToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.total_savings).toBeGreaterThanOrEqual(0);

    const fraud = await request(app)
      .get("/api/insurer/fraud/anomalies")
      .set("Authorization", `Bearer ${insurerToken}`);
    expect(fraud.status).toBe(200);
    expect(fraud.body.flagged_claims.length).toBeGreaterThan(0);

    const utilization = await request(app)
      .get("/api/insurer/utilization")
      .set("Authorization", `Bearer ${insurerToken}`);
    expect(utilization.status).toBe(200);

    const members = await request(app)
      .get("/api/insurer/members/stats")
      .set("Authorization", `Bearer ${insurerToken}`);
    expect(members.status).toBe(200);
  });

  it("admin dashboard and approvals", async () => {
    const dash = await request(app)
      .get("/api/admin/dashboard")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(dash.status).toBe(200);
    expect(dash.body.total_patients).toBeGreaterThan(0);

    const pending = await request(app)
      .get("/api/admin/approvals/pending")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(pending.status).toBe(200);
    expect(pending.body.length).toBeGreaterThan(0);

    const health = await request(app)
      .get("/api/admin/system/health")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(health.status).toBe(200);
  });

  it("rejects invalid login", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@miqorai.com",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("no manual QR regenerate endpoint exists", async () => {
    const res = await request(app)
      .post("/api/patient/qr-code/regenerate")
      .set("Authorization", `Bearer ${patientToken}`);
    expect(res.status).toBe(404);
  });
});
