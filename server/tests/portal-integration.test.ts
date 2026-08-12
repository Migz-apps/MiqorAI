import { describe, expect, it } from "vitest";
import { authed, getContext } from "./helpers/context.js";

describe("Cross-portal integration flows", () => {
  const suffix = Date.now().toString();

  let visitId = "";
  let prescriptionId = "";
  let labOrderId = "";
  let inventoryId = "";
  let accessGrantId = "";

  it("propagates new hospital orders into the patient, pharmacy, and hospital workspaces", async () => {
    const c = getContext();

    const checkinRes = await authed("hospital").post("/api/hospital/checkin").send({
      patient_id: c.patientId,
      department: "General Medicine",
      priority: "normal",
    });
    expect([200, 201]).toContain(checkinRes.status);
    visitId = checkinRes.body.visit_id ?? "";
    expect(visitId).toBeTruthy();

    const prescriptionRes = await authed("hospital").post("/api/hospital/prescription").send({
      patient_id: c.patientId,
      visit_id: visitId,
      pharmacy_id: c.pharmacyId,
      diagnosis: `Portal integration diagnosis ${suffix}`,
      drug_name: `PortalSyncDrug-${suffix}`,
      strength: "25mg",
      dosage: "1 tablet",
      quantity: 14,
      frequency: "twice daily",
      duration_days: 7,
    });
    expect(prescriptionRes.status).toBe(201);
    prescriptionId = prescriptionRes.body.prescription_id ?? "";
    expect(prescriptionId).toBeTruthy();

    const labRes = await authed("hospital").post("/api/hospital/lab-order").send({
      patient_id: c.patientId,
      visit_id: visitId,
      test_name: `Portal Sync Panel ${suffix}`,
      test_code: `PSP-${suffix.slice(-6)}`,
    });
    expect(labRes.status).toBe(201);
    labOrderId = labRes.body.lab_order_id ?? "";
    expect(labOrderId).toBeTruthy();

    const patientPrescriptionsRes = await authed("patient").get("/api/patient/prescriptions");
    expect(patientPrescriptionsRes.status).toBe(200);
    expect(
      patientPrescriptionsRes.body.some((rx: { id: string }) => rx.id === prescriptionId),
    ).toBe(true);

    const patientLabsRes = await authed("patient").get("/api/patient/labs");
    expect(patientLabsRes.status).toBe(200);
    expect(
      patientLabsRes.body.some((lab: { id: string }) => lab.id === labOrderId),
    ).toBe(true);

    const pharmacyPrescriptionsRes = await authed("pharmacy")
      .get("/api/pharmacy/prescriptions")
      .query({ patient_id: c.patientId });
    expect(pharmacyPrescriptionsRes.status).toBe(200);
    expect(
      pharmacyPrescriptionsRes.body.items.some((rx: { id: string }) => rx.id === prescriptionId),
    ).toBe(true);

    const hospitalPrescriptionsRes = await authed("hospital").get("/api/hospital/prescriptions");
    expect(hospitalPrescriptionsRes.status).toBe(200);
    expect(
      hospitalPrescriptionsRes.body.some((rx: { id: string }) => rx.id === prescriptionId),
    ).toBe(true);

    const hospitalLabsRes = await authed("hospital").get("/api/hospital/labs");
    expect(hospitalLabsRes.status).toBe(200);
    expect(
      hospitalLabsRes.body.some((lab: { id: string }) => lab.id === labOrderId),
    ).toBe(true);
  });

  it("propagates pharmacy dispensing and pickup back into the patient-facing record", async () => {
    const c = getContext();

    const inventoryRes = await authed("pharmacy").post("/api/pharmacy/inventory").send({
      drug_name: `Portal Stock ${suffix}`,
      strength: "25mg",
      stock: 40,
      reorder_point: 5,
      unit_price: 6.5,
      cost_price: 4,
      dosage_form: "tablet",
      requires_prescription: true,
    });
    expect(inventoryRes.status).toBe(201);
    inventoryId = inventoryRes.body.inventory_id ?? "";
    expect(inventoryId).toBeTruthy();

    const verifyRes = await authed("pharmacy").post(`/api/pharmacy/prescription/${prescriptionId}/verify`);
    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.status).toBe("verified");

    const readyRes = await authed("pharmacy").post(`/api/pharmacy/prescription/${prescriptionId}/ready`);
    expect(readyRes.status).toBe(200);
    expect(readyRes.body.status).toBe("ready");

    const dispenseRes = await authed("pharmacy")
      .post(`/api/pharmacy/prescription/${prescriptionId}/dispense`)
      .send({
        dispensed_by: c.pharmacyStaffUserId,
        items: [{ drug_id: inventoryId, quantity: 1 }],
        payment: { method: "cash", copay: 0 },
      });
    expect(dispenseRes.status).toBe(200);
    expect(dispenseRes.body.status).toBe("dispensed");

    const pickupRes = await authed("pharmacy")
      .put(`/api/pharmacy/prescription/${prescriptionId}/pickup`)
      .send({ picked_up_by: "Grace Muthoni" });
    expect(pickupRes.status).toBe(200);
    expect(pickupRes.body.status).toBe("picked_up");

    const pharmacyPrescriptionRes = await authed("pharmacy").get(
      `/api/pharmacy/prescription/${prescriptionId}`,
    );
    expect(pharmacyPrescriptionRes.status).toBe(200);
    expect(pharmacyPrescriptionRes.body.status).toBe("picked_up");

    const patientPrescriptionsRes = await authed("patient").get("/api/patient/prescriptions");
    expect(patientPrescriptionsRes.status).toBe(200);
    const patientPrescription = patientPrescriptionsRes.body.find(
      (rx: { id: string }) => rx.id === prescriptionId,
    );
    expect(patientPrescription).toBeTruthy();
    expect(patientPrescription.status).toBe("picked_up");

    const accessLogsRes = await authed("patient").get("/api/patient/access-logs");
    expect(accessLogsRes.status).toBe(200);
    expect(
      accessLogsRes.body.items.some(
        (log: { action: string; accessor?: { email?: string } }) =>
          log.action === "dispense" && log.accessor?.email === "pharm.kevin@example.com",
      ),
    ).toBe(true);
  });

  it("honors patient-granted cross-hospital access and blocks access again after revocation", async () => {
    const c = getContext();

    const grantRes = await authed("patient").post("/api/patient/access-grants").send({
      grantee_type: "hospital",
      grantee_id: c.hospitalIdAlt,
      expires_at: "2027-12-31",
    });
    expect(grantRes.status).toBe(201);
    accessGrantId = grantRes.body.id ?? "";
    expect(accessGrantId).toBeTruthy();

    const allowedRes = await authed("hospitalAdmin").get(`/api/hospital/patient/${c.patientId}`);
    expect(allowedRes.status).toBe(200);
    expect(allowedRes.body.id).toBe(c.patientId);

    const patientLogsRes = await authed("patient").get("/api/patient/access-logs");
    expect(patientLogsRes.status).toBe(200);
    expect(
      patientLogsRes.body.items.some(
        (log: { action: string; accessor?: { email?: string } }) =>
          log.action === "view_records" && log.accessor?.email === "admin.sarah@example.com",
      ),
    ).toBe(true);

    const revokeRes = await authed("patient").delete(`/api/patient/access-grants/${accessGrantId}`);
    expect([200, 204]).toContain(revokeRes.status);

    const blockedRes = await authed("hospitalAdmin").get(`/api/hospital/patient/${c.patientId}`);
    expect(blockedRes.status).toBe(403);
  });

  it("keeps admin and insurer oversight portals aligned on shared patient identity", async () => {
    const c = getContext();

    const adminPatientRes = await authed("admin").get(`/api/admin/patients/${c.patientId}`);
    expect(adminPatientRes.status).toBe(200);
    expect(adminPatientRes.body.id).toBe(c.patientId);

    const insurerMembersRes = await authed("insurer")
      .get("/api/insurer/members/enriched")
      .query({ search: "Grace" });
    expect(insurerMembersRes.status).toBe(200);
    expect(
      insurerMembersRes.body.some((member: { patient_id: string }) => member.patient_id === c.patientId),
    ).toBe(true);
  });

  it("cleans up the temporary inventory created for the portal workflow", async () => {
    if (!inventoryId) return;
    const res = await authed("pharmacy").delete(`/api/pharmacy/inventory/${inventoryId}`);
    expect([200, 204]).toContain(res.status);
  });
});
