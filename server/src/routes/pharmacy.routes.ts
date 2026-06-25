import { Router } from "express";
import { z } from "zod";
import { DosageForm } from "@prisma/client";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import {
  deactivatePharmacyStaff,
  invitePharmacyStaff,
  listPharmacyStaff,
  updatePharmacyStaffRole,
} from "../services/staff.service.js";
import { getPharmacySettings, updatePharmacySettings } from "../services/insurer-ext.service.js";
import { param } from "../utils/param.js";
import {
  adjustPharmacyStock,
  createPharmacyInventory,
  dispensePrescription,
  getPharmacyDashboard,
  getPharmacyPatient,
  getPharmacyPatientAdherence,
  getPharmacyPrescription,
  getPharmacyReports,
  holdPrescription,
  listPharmacyAuditLogs,
  listPharmacyInventory,
  listPharmacyInvoices,
  listPharmacyPrescriptions,
  logInteractionOverride,
  markPrescriptionPickup,
  pharmacyContextFromRequest,
  readyPrescription,
  rejectPrescription,
  resolvePharmacyQr,
  searchPharmacyPatients,
  sendAdherenceReminder,
  updatePharmacyInventory,
  verifyPrescription,
} from "../services/pharmacy.service.js";
import {
  deactivateInventoryItem,
  exportPharmacyBilling,
  exportPharmacyReport,
  getPatientAdherenceHistory,
  getPharmacyAdherenceAggregate,
  getPharmacyReceipt,
  listPharmacyPatients,
  listPharmacyReceipts,
  lookupInventoryBarcode,
  notifyDoctorOnHold,
} from "../services/portal-complete.service.js";

const router = Router();
const pharmacyRoles = ["pharmacy_manager", "pharmacy_staff", "super_admin"] as const;

router.use(authenticate, requireRoles(...pharmacyRoles));

router.get("/dashboard", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyDashboard(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.get("/prescriptions", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    const result = await listPharmacyPrescriptions(ctx.organizationId, {
      status: req.query.status ? String(req.query.status) : undefined,
      date: req.query.date ? String(req.query.date) : undefined,
      patientId: req.query.patient_id ? String(req.query.patient_id) : undefined,
      limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
      offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/prescription/:id", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyPrescription(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/:id/verify", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await verifyPrescription(ctx.organizationId, param(req.params.id), ctx));
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/:id/ready", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await readyPrescription(ctx.organizationId, param(req.params.id), ctx));
  } catch (err) {
    next(err);
  }
});

const holdSchema = z.object({ reason: z.string().min(1), notes: z.string().optional() });
router.post("/prescription/:id/hold", validateBody(holdSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await holdPrescription(ctx.organizationId, param(req.params.id), req.body.reason, req.body.notes, ctx),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/:id/reject", validateBody(holdSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await rejectPrescription(ctx.organizationId, param(req.params.id), req.body.reason, req.body.notes, ctx),
    );
  } catch (err) {
    next(err);
  }
});

const dispenseSchema = z.object({
  dispensed_by: z.string().uuid(),
  items: z.array(
    z.object({
      drug_id: z.string().uuid(),
      quantity: z.number().int().positive(),
      batch_number: z.string().optional(),
    }),
  ).min(1),
  payment: z
    .object({
      method: z.enum(["cash", "insurance", "credit"]).optional(),
      insurance_id: z.string().optional(),
      copay: z.number().optional(),
    })
    .optional(),
  override_interactions: z
    .object({ drugs: z.array(z.string()), reason: z.string().min(1) })
    .optional(),
});

router.post("/dispense", validateBody(dispenseSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    const prescriptionId = String(req.query.prescription_id ?? req.body.prescription_id);
    if (!prescriptionId) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "prescription_id required" } });
      return;
    }
    if (req.body.override_interactions) {
      await logInteractionOverride(
        ctx.organizationId,
        prescriptionId,
        req.body.dispensed_by,
        req.body.override_interactions.drugs,
        req.body.override_interactions.reason,
        ctx,
      );
    }
    res.json(
      await dispensePrescription(ctx.organizationId, prescriptionId, req.body, ctx),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/:id/dispense", validateBody(dispenseSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    if (req.body.override_interactions) {
      await logInteractionOverride(
        ctx.organizationId,
        param(req.params.id),
        req.body.dispensed_by,
        req.body.override_interactions.drugs,
        req.body.override_interactions.reason,
        ctx,
      );
    }
    res.json(await dispensePrescription(ctx.organizationId, param(req.params.id), req.body, ctx));
  } catch (err) {
    next(err);
  }
});

const pickupSchema = z.object({ picked_up_by: z.string().min(1) });
router.put("/prescription/:id/pickup", validateBody(pickupSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await markPrescriptionPickup(ctx.organizationId, param(req.params.id), req.body.picked_up_by, ctx),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/inventory", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await listPharmacyInventory(ctx.organizationId, {
        search: req.query.search ? String(req.query.search) : undefined,
        lowStock: req.query.low_stock === "true",
        expiringSoon: req.query.expiring_soon === "true",
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const inventoryCreateSchema = z.object({
  drug_name: z.string().min(1),
  generic_name: z.string().optional(),
  strength: z.string().min(1),
  dosage_form: z.nativeEnum(DosageForm),
  barcode: z.string().optional(),
  stock: z.number().int().nonnegative(),
  reorder_point: z.number().int().nonnegative(),
  unit_price: z.number().nonnegative(),
  cost_price: z.number().nonnegative(),
  supplier: z.string().optional(),
  expiry_date: z.string().optional(),
  requires_prescription: z.boolean(),
  category: z.string().optional(),
  controlled: z.boolean().optional(),
});

router.post("/inventory", validateBody(inventoryCreateSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.status(201).json(await createPharmacyInventory(ctx.organizationId, req.body, ctx));
  } catch (err) {
    next(err);
  }
});

router.put("/inventory/:id", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await updatePharmacyInventory(ctx.organizationId, param(req.params.id), req.body, ctx));
  } catch (err) {
    next(err);
  }
});

const adjustSchema = z.object({
  drug_id: z.string().uuid(),
  adjustment: z.number().int(),
  reason: z.string().min(1),
  prescription_id: z.string().uuid().optional(),
});

router.post("/inventory/adjust", validateBody(adjustSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await adjustPharmacyStock(
        ctx.organizationId,
        req.body.drug_id,
        req.body.adjustment,
        req.body.reason,
        req.body.prescription_id,
        ctx.userId,
        ctx,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/patients/search", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await searchPharmacyPatients(ctx.organizationId, String(req.query.q ?? "")));
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyPatient(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id/adherence", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyPatientAdherence(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

const remindSchema = z.object({
  patient_id: z.string().uuid(),
  medication_id: z.string().uuid().optional(),
  message: z.string().min(1),
});

router.post("/adherence/remind", validateBody(remindSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await sendAdherenceReminder(
        ctx.organizationId,
        req.body.patient_id,
        req.body.medication_id,
        req.body.message,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/reports", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await getPharmacyReports(
        ctx.organizationId,
        String(req.query.type ?? "monthly"),
        req.query.start_date ? String(req.query.start_date) : undefined,
        req.query.end_date ? String(req.query.end_date) : undefined,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await listPharmacyInvoices(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await listPharmacyAuditLogs(ctx.organizationId, {
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const qrResolveSchema = z.object({ patient_id: z.string().uuid(), hash: z.string().min(1) });
router.post("/scan/qr", validateBody(qrResolveSchema), async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(
      await resolvePharmacyQr(
        req.body.patient_id,
        req.body.hash,
        ctx.userId,
        ctx.ipAddress,
        ctx.userAgent,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/staff", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await listPharmacyStaff(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.post("/staff/invite", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.status(201).json(await invitePharmacyStaff(ctx.organizationId, req.body));
  } catch (err) {
    next(err);
  }
});

router.delete("/staff/:userId", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    await deactivatePharmacyStaff(ctx.organizationId, param(req.params.userId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/staff/:userId/role", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await updatePharmacyStaffRole(ctx.organizationId, param(req.params.userId), req.body.role));
  } catch (err) {
    next(err);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacySettings(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await updatePharmacySettings(ctx.organizationId, req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/patients", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await listPharmacyPatients(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.get("/adherence", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyAdherenceAggregate(ctx.organizationId));
  } catch (err) {
    next(err);
  }
});

router.get("/patient/:id/adherence/history", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPatientAdherenceHistory(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/billing/receipts", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await listPharmacyReceipts(ctx.organizationId, req.query.date ? String(req.query.date) : undefined));
  } catch (err) {
    next(err);
  }
});

router.get("/billing/receipts/:id", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await getPharmacyReceipt(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/billing/export", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await exportPharmacyBilling(ctx.organizationId, ctx.userId, req.body.format === "pdf" ? "pdf" : "csv"));
  } catch (err) {
    next(err);
  }
});

router.post("/reports/export", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await exportPharmacyReport(ctx.organizationId, ctx.userId, String(req.body.type ?? "summary"), req.body.format === "pdf" ? "pdf" : "csv"));
  } catch (err) {
    next(err);
  }
});

router.post("/prescription/:id/notify-doctor", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await notifyDoctorOnHold(ctx.organizationId, param(req.params.id), req.body.reason ?? "Review required"));
  } catch (err) {
    next(err);
  }
});

router.get("/inventory/barcode/:barcode", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await lookupInventoryBarcode(ctx.organizationId, param(req.params.barcode)));
  } catch (err) {
    next(err);
  }
});

router.delete("/inventory/:id", async (req, res, next) => {
  try {
    const ctx = pharmacyContextFromRequest(req);
    res.json(await deactivateInventoryItem(ctx.organizationId, param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

export default router;
