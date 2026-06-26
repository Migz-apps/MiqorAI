import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  PASSWORD,
  authed,
  getContext,
} from "./helpers/context.js";

describe("Hospital endpoints", () => {
  let newVisitId = "";
  let newDepartmentId = "";
  let notificationId = "";
  let invitedStaffUserId = "";
  let newPrescriptionId = "";
  let newLabOrderId = "";

  it("GET /api/hospital/dashboard", async () => {
    const res = await authed("hospital").get("/api/hospital/dashboard");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patients", async () => {
    const res = await authed("hospital").get("/api/hospital/patients");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patients/search", async () => {
    const res = await authed("hospital").get("/api/hospital/patients/search").query({ q: "Grace" });
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patients/census", async () => {
    const res = await authed("hospital").get("/api/hospital/patients/census");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patient/:id", async () => {
    const c = getContext();
    const res = await authed("hospital").get(`/api/hospital/patient/${c.patientId}`);
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patient/:id/qr", async () => {
    const c = getContext();
    const res = await authed("hospital").get(`/api/hospital/patient/${c.patientId}/qr`);
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patient/:id/summary", async () => {
    const c = getContext();
    const res = await authed("hospital").get(`/api/hospital/patient/${c.patientId}/summary`);
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/patient/:id/labs/trends", async () => {
    const c = getContext();
    const res = await authed("hospital").get(`/api/hospital/patient/${c.patientId}/labs/trends`);
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/checkin", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/checkin").send({
      patient_id: c.patientId,
      department: "General Medicine",
      priority: "normal",
    });
    expect([200, 201]).toContain(res.status);
    newVisitId = res.body.id ?? res.body.visit_id ?? "";
  });

  it("GET /api/hospital/checkins/today", async () => {
    const res = await authed("hospital").get("/api/hospital/checkins/today");
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/checkin/:visitId/status", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitIdWaiting || c.visitId;
    const res = await authed("hospital")
      .put(`/api/hospital/checkin/${visitId}/status`)
      .send({ status: "with_doctor" });
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/visit/:visitId/vitals", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitId;
    const res = await authed("hospital").post(`/api/hospital/visit/${visitId}/vitals`).send({
      bp_systolic: 120,
      bp_diastolic: 80,
      heart_rate: 72,
    });
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/visit/:visitId/diagnosis", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitId;
    const res = await authed("hospital").put(`/api/hospital/visit/${visitId}/diagnosis`).send({
      diagnosis_codes: ["BA00"],
      chief_complaint: "API test complaint",
      notes: "Integration test",
    });
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/visit/:visitId/assign", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitId;
    const res = await authed("hospital").put(`/api/hospital/visit/${visitId}/assign`).send({
      staff_id: c.hospitalDoctorUserId,
    });
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/visit/:visitId/priority", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitId;
    const res = await authed("hospital")
      .put(`/api/hospital/visit/${visitId}/priority`)
      .send({ priority: "urgent" });
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/prescription", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/prescription").send({
      patient_id: c.patientId,
      visit_id: newVisitId || c.visitId,
      pharmacy_id: c.pharmacyId,
      diagnosis: "Test diagnosis",
      drug_name: "Amlodipine",
      strength: "5mg",
      dosage: "1 tablet",
      quantity: 30,
      frequency: "once daily",
      duration_days: 30,
    });
    expect([200, 201, 409]).toContain(res.status);
    if (res.status === 409) {
      expect(res.body).toMatchObject({
        blocked: true,
        message: expect.any(String),
      });
    } else {
      newPrescriptionId = res.body.id ?? "";
    }
  });

  it("POST /api/hospital/prescription/check-allergies", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/prescription/check-allergies").send({
      patient_id: c.patientId,
      drug_names: ["Penicillin", "Amlodipine"],
    });
    expect(res.status).toBe(200);
    expect(res.body.safe).toBe(false);
    expect(res.body.conflicts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          drug_name: "Penicillin",
          allergy_name: "Penicillin",
        }),
      ]),
    );
  });

  it("POST /api/hospital/lab-order", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/lab-order").send({
      patient_id: c.patientId,
      visit_id: newVisitId || c.visitId,
      test_name: "Complete Blood Count",
      test_code: "57021-8",
    });
    expect([200, 201, 409]).toContain(res.status);
    if (res.status === 409) {
      expect(res.body).toMatchObject({
        blocked: true,
        message: expect.any(String),
      });
    } else {
      newLabOrderId = res.body.id ?? "";
    }
  });

  it("GET /api/hospital/prescriptions", async () => {
    const res = await authed("hospital").get("/api/hospital/prescriptions");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/labs", async () => {
    const res = await authed("hospital").get("/api/hospital/labs");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/labs/trends", async () => {
    const res = await authed("hospital").get("/api/hospital/labs/trends");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/referrals", async () => {
    const res = await authed("hospital").get("/api/hospital/referrals");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/referral", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/hospital/referral").send({
      patient_id: c.patientId,
      to_hospital_id: c.toHospitalId,
      from_department: "General Medicine",
      to_department: "Cardiology",
      urgency: "routine",
      reason: "API integration test referral",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("POST /api/hospital/visit/:visitId/checkout", async () => {
    const c = getContext();
    const visitId = newVisitId || c.visitId;
    const res = await authed("hospital").post(`/api/hospital/visit/${visitId}/checkout`);
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/hospital/staff", async () => {
    const res = await authed("hospital").get("/api/hospital/staff");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/staff/enriched", async () => {
    const res = await authed("hospital").get("/api/hospital/staff/enriched");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/staff/invite", async () => {
    const res = await authed("hospital").post("/api/hospital/staff/invite").send({
      email: `hospital.staff.${Date.now()}@example.com`,
      role: "nurse",
      department: "Emergency",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/hospital/departments", async () => {
    const res = await authed("hospital").get("/api/hospital/departments");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/departments", async () => {
    const res = await authed("hospital").post("/api/hospital/departments").send({
      name: "API Test Dept",
      code: `T${Date.now().toString().slice(-4)}`,
      sla_target_minutes: 25,
    });
    expect([200, 201]).toContain(res.status);
    newDepartmentId = res.body.id ?? "";
  });

  it("PUT /api/hospital/departments/:id", async () => {
    const c = getContext();
    const id = newDepartmentId || c.departmentId;
    const res = await authed("hospital").put(`/api/hospital/departments/${id}`).send({
      sla_target_minutes: 35,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/savings", async () => {
    const res = await authed("hospital").get("/api/hospital/savings");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/analytics", async () => {
    const res = await authed("hospital").get("/api/hospital/analytics");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/analytics/extended", async () => {
    const res = await authed("hospital").get("/api/hospital/analytics/extended");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/audit-logs", async () => {
    const res = await authed("hospital").get("/api/hospital/audit-logs");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/audit-logs/export", async () => {
    const res = await authed("hospital").post("/api/hospital/audit-logs/export");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/billing", async () => {
    const res = await authed("hospital").get("/api/hospital/billing");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/reports", async () => {
    const res = await authed("hospital").get("/api/hospital/reports");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/reports/generate", async () => {
    const res = await authed("hospital").post("/api/hospital/reports/generate").send({
      type: "patient_census",
      format: "csv",
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/reports/schedule", async () => {
    const res = await authed("hospital").get("/api/hospital/reports/schedule");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/reports/schedule", async () => {
    const res = await authed("hospital").post("/api/hospital/reports/schedule").send({
      report_type: "census",
      frequency: "weekly",
      email: "reports@example.com",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("GET /api/hospital/notifications", async () => {
    const res = await authed("hospital").get("/api/hospital/notifications");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/notifications", async () => {
    const res = await authed("hospital").post("/api/hospital/notifications").send({
      title: "Test notification",
      message: "API test notification body",
    });
    expect([200, 201]).toContain(res.status);
    notificationId = res.body.id ?? "";
  });

  it("PUT /api/hospital/notifications/:id/read", async () => {
    if (!notificationId) return;
    const res = await authed("hospital").put(`/api/hospital/notifications/${notificationId}/read`);
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/notifications/read-all", async () => {
    const res = await authed("hospital").put("/api/hospital/notifications/read-all");
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/settings", async () => {
    const res = await authed("hospital").get("/api/hospital/settings");
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/settings", async () => {
    const res = await authed("hospital").put("/api/hospital/settings").send({
      notifications_enabled: true,
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/hospital/system/health", async () => {
    const res = await authed("hospital").get("/api/hospital/system/health");
    expect(res.status).toBe(200);
  });

  it("POST /api/hospital/patient/register", async () => {
    const suffix = Date.now().toString().slice(-7);
    const res = await authed("hospital").post("/api/hospital/patient/register").send({
      full_name: "Walk-in Patient",
      phone: `+2547${suffix}`,
      date_of_birth: "1995-06-15",
      gender: "F",
    });
    expect([200, 201]).toContain(res.status);
  });

  it("DELETE /api/hospital/departments/:id", async () => {
    if (!newDepartmentId) return;
    const res = await authed("hospital").delete(`/api/hospital/departments/${newDepartmentId}`);
    expect([200, 204]).toContain(res.status);
  });

  it("POST /api/hospital/staff/signup — duplicate fails", async () => {
    const res = await request(app).post("/api/hospital/staff/signup").send({
      email: "dr.kimani@example.com",
      password: PASSWORD,
      hospital_code: "KMC001",
      role: "doctor",
    });
    expect([400, 409, 422]).toContain(res.status);
  });
});

describe("Hospital admin (SCH001) endpoints", () => {
  it("GET /api/hospital/dashboard — hospital admin", async () => {
    const res = await authed("hospitalAdmin").get("/api/hospital/dashboard");
    expect(res.status).toBe(200);
  });

  it("PUT /api/hospital/staff/:userId/role", async () => {
    const c = getContext();
    const res = await authed("hospitalAdmin")
      .put(`/api/hospital/staff/${c.hospitalDoctorUserId}/role`)
      .send({ role: "doctor" });
    expect([200, 403, 404]).toContain(res.status);
  });
});
