import { Router } from "express";
import { z } from "zod";
import { prisma } from "../../shared/lib/prisma.js";
import { authenticate, requireRoles } from "../../shared/middleware/auth.js";
import { validateBody } from "../../shared/middleware/errorHandler.js";
import { assertAccessGrant, logPatientAccess } from "../patient/access.service.js";
import { getAiServiceConfig } from "./ai-service.config.js";
import {
  checkDoctorAction,
  getRelevantHistoryForVisit,
  saveAiOverride,
} from "./ai-visit.service.js";
import { forbidden } from "../../shared/utils/errors.js";
import type { TokenPayload } from "../../shared/utils/crypto.js";
import { param } from "../../shared/utils/param.js";

const router = Router();
const hospitalRoles = ["hospital_admin", "hospital_staff", "super_admin"] as const;

router.use(authenticate, requireRoles(...hospitalRoles));

async function requireHospitalContext(user: TokenPayload) {
  if (user.role === "super_admin" && user.organizationId) {
    const hospital = await prisma.hospital.findUnique({ where: { id: user.organizationId } });
    if (hospital) return { hospitalId: hospital.id, userId: user.sub };
  }
  if (!user.organizationId || user.organizationType !== "hospital") {
    throw forbidden("Hospital organization required");
  }
  const staff = await prisma.hospitalStaff.findUnique({ where: { userId: user.sub } });
  if (!staff?.isActive && user.role !== "super_admin") {
    throw forbidden("Hospital staff record required");
  }
  return { hospitalId: user.organizationId, userId: user.sub };
}

async function assertHospitalPatientAccess(hospitalId: string, patientId: string, accessorId: string) {
  await assertAccessGrant(patientId, "hospital", hospitalId);
  await logPatientAccess({ patientId, accessorId, action: "view_records" });
}

const visitContextSchema = z.object({
  chiefComplaint: z.string().optional(),
  symptoms: z.string().optional(),
  assessment: z.string().optional(),
  diagnosis: z.string().optional(),
});

const relevantHistorySchema = z.object({
  patientId: z.string().uuid(),
  visitContext: visitContextSchema,
});

const checkActionSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  action: z.object({
    type: z.enum(["LAB_ORDER", "IMAGING_ORDER", "PRESCRIPTION", "REFERRAL"]),
    name: z.string().min(1),
    dose: z.string().optional(),
    frequency: z.string().optional(),
    duration: z.string().optional(),
    reason: z.string().optional(),
  }),
  visitContext: visitContextSchema,
});

const overrideSchema = z.object({
  patientId: z.string().uuid(),
  visitId: z.string().uuid().optional(),
  actionType: z.enum(["LAB_ORDER", "IMAGING_ORDER", "PRESCRIPTION", "REFERRAL"]),
  actionName: z.string().min(1),
  aiAlertType: z.string().optional(),
  aiSeverity: z.string().optional(),
  aiMessage: z.string().optional(),
  overrideReason: z.string().min(1),
});

router.get("/health", async (_req, res) => {
  const cfg = getAiServiceConfig();
  res.json({
    enabled: cfg.enabled,
    configured: cfg.isConfigured,
    base_url_set: Boolean(cfg.baseUrl),
    mock: cfg.mock,
  });
});

router.post("/relevant-history", validateBody(relevantHistorySchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const { patientId, visitContext } = req.body;
    await assertHospitalPatientAccess(hospitalId, patientId, userId);

    const result = await getRelevantHistoryForVisit({
      patientId,
      doctorId: userId,
      hospitalId,
      visitContext,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/check-action", validateBody(checkActionSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const { patientId, visitId, action, visitContext } = req.body;
    await assertHospitalPatientAccess(hospitalId, patientId, userId);

    const result = await checkDoctorAction({
      patientId,
      doctorId: userId,
      hospitalId,
      visitId,
      action,
      visitContext,
    });
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/override", validateBody(overrideSchema), async (req, res, next) => {
  try {
    const { hospitalId, userId } = await requireHospitalContext(req.user!);
    const body = req.body;
    await assertHospitalPatientAccess(hospitalId, body.patientId, userId);

    const result = await saveAiOverride(
      hospitalId,
      { ...body, doctorId: userId },
      req,
    );
    res.json(result);
  } catch (err) {
    next(err);
  }
});

export default router;
