import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { checkAiServiceHealth } from "../services/ai-clinical-safety.client.js";
import {
  cancelPendingClinicalAction,
  overridePendingClinicalAction,
} from "../services/clinical-safety.service.js";
import { param } from "../utils/param.js";

const router = Router();
router.use(authenticate, requireRoles("hospital_staff", "hospital_admin"));

const overrideSchema = z.object({
  override_reason: z.string().min(1),
});

router.get("/health", async (_req, res, next) => {
  try {
    const health = await checkAiServiceHealth();
    res.json(
      health ?? {
        status: "unavailable",
        model_loaded: false,
      },
    );
  } catch (err) {
    next(err);
  }
});

router.post("/:pendingActionId/override", validateBody(overrideSchema), async (req, res, next) => {
  try {
    const result = await overridePendingClinicalAction(
      param(req.params.pendingActionId),
      req.user!.sub,
      req.body.override_reason,
      req,
    );
    res.json({
      success: true,
      blocked: false,
      message: "Clinical safety override accepted. Order completed.",
      pending_action_id: result.pending_action.id,
      order_result: result.order_result,
    });
  } catch (err) {
    next(err);
  }
});

router.post("/:pendingActionId/cancel", async (req, res, next) => {
  try {
    const result = await cancelPendingClinicalAction(
      param(req.params.pendingActionId),
      req.user!.sub,
      req,
    );
    res.json({
      success: true,
      blocked: false,
      cancelled: true,
      message: "Pending clinical action cancelled. Order was not created.",
      pending_action_id: result.pending_action.id,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
