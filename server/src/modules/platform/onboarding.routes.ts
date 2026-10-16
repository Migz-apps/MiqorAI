import { OnboardingType } from "@prisma/client";
import { Router, type NextFunction, type Request, type Response } from "express";
import { z } from "zod";
import { requireTrustedOrigin } from "../../shared/middleware/auth.js";
import { validateBody } from "../../shared/middleware/errorHandler.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { emailSchema, optionalPhoneSchema, strongPasswordSchema } from "../../shared/utils/validation.js";
import { submitOnboardingExtended } from "./admin-portal.service.js";

const router = Router();

const onboardingLimiter = createRateLimiter({
  name: "onboarding-submit",
  windowMs: 60 * 60_000,
  max: 5,
});

const onboardingSchema = z
  .object({
    type: z.nativeEnum(OnboardingType),
    organization_name: z.string().min(2).optional(),
    name: z.string().min(2).optional(),
    registration_ref: z.string().min(2).optional(),
    contact_name: z.string().min(2).optional(),
    email: emailSchema.optional(),
    submitted_by_email: emailSchema.optional(),
    phone: optionalPhoneSchema,
    address: z.string().optional(),
    location: z.string().optional(),
    password: strongPasswordSchema.optional(),
    manager_name: z.string().optional(),
  })
  .refine((d) => d.organization_name || d.name, { message: "organization_name is required" })
  .refine((d) => d.email || d.submitted_by_email, { message: "email is required" });

async function submitHandler(req: Request, res: Response, next: NextFunction) {
  try {
    const row = await submitOnboardingExtended(req.body);
    res.status(201).json({ id: row.id, status: row.status });
  } catch (err) {
    next(err);
  }
}

router.post("/", requireTrustedOrigin, onboardingLimiter, validateBody(onboardingSchema), submitHandler);
router.post("/submit", requireTrustedOrigin, onboardingLimiter, validateBody(onboardingSchema), submitHandler);

export default router;
