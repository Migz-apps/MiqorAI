import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { logPatientAccess } from "../services/access.service.js";
import { resolveQrScan, validateQrScan } from "../services/qr.service.js";
import { auditFromRequest, writeAuditLog } from "../services/audit.service.js";
import { prisma } from "../lib/prisma.js";
import { forbidden, notFound } from "../utils/errors.js";
import { param } from "../utils/param.js";
import {
  createQrAccessRequest,
  getQrAccessRequestForRequester,
} from "../services/qr-access-request.service.js";

const router = Router();

const scanSchema = z.object({
  patient_id: z.string().uuid(),
  hash: z.string().min(1),
  context: z.enum(["hospital", "pharmacy"]),
});

const requestSchema = scanSchema.extend({
  context: z.literal("hospital"),
});

router.post(
  "/qr/request-access",
  authenticate,
  requireRoles("hospital_admin", "hospital_staff", "super_admin"),
  validateBody(requestSchema),
  async (req, res, next) => {
    try {
      const { patient_id, hash, context } = req.body;
      await validateQrScan(patient_id, hash);

      if (!req.user!.organizationId || req.user!.organizationType !== "hospital") {
        throw forbidden("Hospital organization required");
      }

      const [hospital, requester] = await Promise.all([
        prisma.hospital.findUnique({ where: { id: req.user!.organizationId } }),
        prisma.user.findUnique({
          where: { id: req.user!.sub },
          select: { email: true, displayName: true },
        }),
      ]);
      if (!hospital) throw notFound("Hospital not found");
      if (!requester) throw notFound("Requester not found");

      const accessRequest = await createQrAccessRequest({
        patientId: patient_id,
        hospitalId: hospital.id,
        hospitalName: hospital.name,
        hospitalCode: hospital.code,
        requesterId: req.user!.sub,
        requesterEmail: requester.email,
        requesterName: requester.displayName,
        context,
      });

      await writeAuditLog({
        ...auditFromRequest(req),
        action: "request_qr_access",
        resourceType: "patient",
        resourceId: patient_id,
        success: true,
      });

      res.status(202).json({
        request_id: accessRequest.id,
        status: accessRequest.status,
        expires_at: accessRequest.expiresAt,
        message: "Patient approval required before records can be opened.",
      });
    } catch (err) {
      next(err);
    }
  },
);

router.get(
  "/qr/access-request/:id",
  authenticate,
  requireRoles("hospital_admin", "hospital_staff", "super_admin"),
  async (req, res, next) => {
    try {
      const request = await getQrAccessRequestForRequester(param(req.params.id), req.user!.sub);
      res.json({
        request_id: request.id,
        patient_id: request.patientId,
        status: request.status,
        expires_at: request.expiresAt,
      });
    } catch (err) {
      next(err);
    }
  },
);

router.post(
  "/qr",
  authenticate,
  requireRoles(
    "hospital_admin",
    "hospital_staff",
    "pharmacy_manager",
    "pharmacy_staff",
    "super_admin",
  ),
  validateBody(scanSchema),
  async (req, res, next) => {
    try {
      const { patient_id, hash, context } = req.body;
      const result = await resolveQrScan(patient_id, hash, context);

      await logPatientAccess({
        patientId: patient_id,
        accessorId: req.user!.sub,
        action: "scan_qr",
        ipAddress: req.ip,
        userAgent: req.get("user-agent"),
      });

      await writeAuditLog({
        ...auditFromRequest(req),
        action: "scan_qr",
        resourceType: "patient",
        resourceId: patient_id,
        success: true,
      });

      res.json(result);
    } catch (err) {
      next(err);
    }
  },
);

export default router;
