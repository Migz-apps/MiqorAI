import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { logPatientAccess } from "../services/access.service.js";
import { resolveQrScan } from "../services/qr.service.js";
import { auditFromRequest, writeAuditLog } from "../services/audit.service.js";

const router = Router();

const scanSchema = z.object({
  patient_id: z.string().uuid(),
  hash: z.string().min(1),
  context: z.enum(["hospital", "pharmacy"]),
});

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
