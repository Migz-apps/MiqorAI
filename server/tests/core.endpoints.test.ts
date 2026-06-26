import { describe, it, expect } from "vitest";
import request from "supertest";
import {
  app,
  PASSWORD,
  authed,
  getContext,
} from "./helpers/context.js";

describe("Health", () => {
  it("GET /health", async () => {
    const res = await request(app).get("/health");
    expect(res.status).toBe(200);
    expect(res.body.status).toBe("ok");
  });
});

describe("Auth endpoints", () => {
  let refreshToken = "";
  let newPatientRefresh = "";

  it("POST /api/auth/login — admin", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@miqorai.com",
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    refreshToken = res.body.refresh_token;
    expect(res.body.access_token).toBeTruthy();
  });

  it("POST /api/auth/login — patient", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "grace.muthoni@example.com",
      password: PASSWORD,
    });
    expect(res.status).toBe(200);
    expect(res.body.user.role).toBe("patient");
  });

  it("POST /api/auth/login — hospital with org", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "dr.kimani@example.com",
      password: PASSWORD,
      organization_code: "KMC001",
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/login — pharmacy with org", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "pharm.kevin@example.com",
      password: PASSWORD,
      organization_code: "MPH001",
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/login — insurer with org", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "claims.reviewer@nhidemo.demo",
      password: PASSWORD,
      organization_code: "NHI001",
    });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/login — rejects bad password", async () => {
    const res = await request(app).post("/api/auth/login").send({
      email: "admin@miqorai.com",
      password: "wrong-password",
    });
    expect(res.status).toBe(401);
  });

  it("POST /api/auth/refresh", async () => {
    const res = await request(app).post("/api/auth/refresh").send({ refresh_token: refreshToken });
    expect(res.status).toBe(200);
    expect(res.body.access_token).toBeTruthy();
  });

  it("GET /api/auth/me", async () => {
    const res = await authed("admin").get("/api/auth/me");
    expect(res.status).toBe(200);
    expect(res.body.email).toBe("admin@miqorai.com");
  });

  it("POST /api/auth/send-otp", async () => {
    const res = await request(app).post("/api/auth/send-otp").send({ phone: "+254799000001" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/verify-otp — invalid code", async () => {
    const res = await request(app)
      .post("/api/auth/verify-otp")
      .send({ phone: "+254799000001", otp: "000000" });
    expect([400, 401]).toContain(res.status);
  });

  it("POST /api/auth/forgot-password", async () => {
    const res = await request(app)
      .post("/api/auth/forgot-password")
      .send({ email: "grace.muthoni@example.com" });
    expect(res.status).toBe(200);
  });

  it("POST /api/auth/reset-password — invalid token", async () => {
    const res = await request(app)
      .post("/api/auth/reset-password")
      .send({ token: "invalid-token", new_password: "NewPassword123!" });
    expect([400, 401, 404]).toContain(res.status);
  });

  it("POST /api/auth/register — new patient", async () => {
    const suffix = Date.now().toString().slice(-8);
    const res = await request(app).post("/api/auth/register").send({
      phone: `+2547${suffix}`,
      password: PASSWORD,
      full_name: "Test Patient",
      date_of_birth: "1990-01-15",
      email: `test.patient.${suffix}@example.com`,
    });
    expect(res.status).toBe(201);
    newPatientRefresh = res.body.refresh_token;
  });

  it("POST /api/auth/hospital-signup — duplicate email fails", async () => {
    const res = await request(app).post("/api/auth/hospital-signup").send({
      email: "dr.kimani@example.com",
      password: PASSWORD,
      hospital_code: "KMC001",
      role: "doctor",
      department: "General Medicine",
    });
    expect([400, 409, 422]).toContain(res.status);
  });

  it("POST /api/auth/2fa/setup", async () => {
    const res = await authed("patient").post("/api/auth/2fa/setup");
    expect(res.status).toBe(200);
    expect(res.body.secret || res.body.otpauth_url).toBeTruthy();
  });

  it("POST /api/auth/change-password — wrong current password", async () => {
    const res = await authed("patient")
      .post("/api/auth/change-password")
      .send({ current_password: "wrong", new_password: "AnotherPass123!" });
    expect([400, 401]).toContain(res.status);
  });

  it("POST /api/auth/logout — new patient session", async () => {
    if (!newPatientRefresh) return;
    const res = await request(app).post("/api/auth/logout").send({ refresh_token: newPatientRefresh });
    expect([200, 204]).toContain(res.status);
  });
});

describe("Reference endpoints", () => {
  it("GET /api/reference/icd", async () => {
    const res = await authed("patient").get("/api/reference/icd");
    expect(res.status).toBe(200);
  });

  it("GET /api/reference/icd?q=diabetes", async () => {
    const res = await authed("patient").get("/api/reference/icd").query({ q: "diabetes" });
    expect(res.status).toBe(200);
  });

  it("GET /api/reference/drugs", async () => {
    const res = await authed("patient").get("/api/reference/drugs");
    expect(res.status).toBe(200);
  });

  it("GET /api/reference/drugs?q=met", async () => {
    const res = await authed("patient").get("/api/reference/drugs").query({ q: "met" });
    expect(res.status).toBe(200);
  });

  it("POST /api/reference/drug-interactions", async () => {
    const res = await authed("patient").post("/api/reference/drug-interactions").send({
      drugs: ["Amlodipine", "Metformin"],
    });
    expect(res.status).toBe(200);
  });

  it("GET /api/reference/pharmacies", async () => {
    const res = await authed("patient").get("/api/reference/pharmacies");
    expect(res.status).toBe(200);
  });
});

describe("Onboarding endpoints", () => {
  it("POST /api/onboarding/submit", async () => {
    const res = await request(app).post("/api/onboarding/submit").send({
      type: "pharmacy",
      name: "Test Onboarding Pharmacy",
      registration_ref: `PHM-TEST-${Date.now()}`,
      location: "Kigali",
      submitted_by_email: `onboard.${Date.now()}@example.com`,
    });
    expect(res.status).toBe(201);
  });
});

describe("Sync endpoints", () => {
  let syncItemId = "";

  it("POST /api/sync/push", async () => {
    const res = await authed("patient")
      .post("/api/sync/push")
      .send({
        items: [
          {
            operation: "create",
            resource_type: "patient_note",
            resource_data: { text: "sync test note" },
          },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.results?.length).toBeGreaterThan(0);
    syncItemId = res.body.results[0]?.id ?? "";
  });

  it("GET /api/sync/queue", async () => {
    const res = await authed("patient").get("/api/sync/queue");
    expect(res.status).toBe(200);
    if (!syncItemId && res.body.items?.length) {
      syncItemId = res.body.items[0].id;
    }
  });

  it("POST /api/sync/queue/:id/process", async () => {
    const c = getContext();
    if (!syncItemId) return;
    const res = await authed("patient").post(`/api/sync/queue/${syncItemId}/process`);
    expect([200, 400, 404]).toContain(res.status);
  });

  it("POST /api/sync/queue/:id/resolve", async () => {
    if (!syncItemId) return;
    const res = await authed("patient")
      .post(`/api/sync/queue/${syncItemId}/resolve`)
      .send({ resolution: "client" });
    expect([200, 400, 404]).toContain(res.status);
  });

  it("DELETE /api/sync/queue/:id", async () => {
    if (!syncItemId) return;
    const res = await authed("patient").delete(`/api/sync/queue/${syncItemId}`);
    expect([200, 404]).toContain(res.status);
  });
});

describe("Scan endpoints", () => {
  it("POST /api/scan/qr", async () => {
    const c = getContext();
    const res = await authed("hospital").post("/api/scan/qr").send({
      patient_id: c.patientId,
      hash: c.qrHash,
      context: "hospital",
    });
    expect([200, 400, 403]).toContain(res.status);
  });
});

describe("Files endpoints", () => {
  let fileId = "";

  it("POST /api/files/upload", async () => {
    const res = await authed("patient")
      .post("/api/files/upload")
      .attach("file", Buffer.from("test file content"), "test-upload.txt");
    expect(res.status).toBe(201);
    fileId = res.body.id ?? res.body.file_id ?? "";
  });

  it("GET /api/files/:id", async () => {
    if (!fileId) return;
    const res = await authed("patient").get(`/api/files/${fileId}`);
    expect([200, 302]).toContain(res.status);
  });
});
