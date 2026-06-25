import { OnboardingType } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { validateBody } from "../middleware/errorHandler.js";
import { submitOnboardingExtended } from "../services/portal-complete.service.js";

const router = Router();

const onboardingSchema = z.object({
  type: z.nativeEnum(OnboardingType),
  name: z.string().min(2),
  registration_ref: z.string().min(2),
  location: z.string().optional(),
  submitted_by_email: z.string().email(),
  phone: z.string().optional(),
  password: z.string().min(8).optional(),
  manager_name: z.string().optional(),
});

router.post("/submit", validateBody(onboardingSchema), async (req, res, next) => {
  try {
    const row = await submitOnboardingExtended(req.body);
    res.status(201).json({ id: row.id, status: row.status });
  } catch (err) {
    next(err);
  }
});

export default router;
