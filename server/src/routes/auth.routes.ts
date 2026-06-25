import { Router } from "express";
import { z } from "zod";
import { SyncOperation } from "@prisma/client";
import { HospitalStaffRole } from "@prisma/client";
import {
  changePassword,
  forgotPassword,
  loginUser,
  logoutUser,
  refreshAccessToken,
  registerPatient,
  resetPassword,
} from "../services/auth.service.js";
import { getEnhancedCurrentUser, publicHospitalStaffSignup } from "../services/portal-complete.service.js";
import { sendOtp, verifyOtp } from "../services/otp.service.js";
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
} from "../services/twofa.service.js";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  organization_code: z.string().optional(),
  totp_code: z.string().length(6).optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

const registerSchema = z.object({
  phone: z.string().min(8),
  password: z.string().min(8),
  full_name: z.string().min(2),
  date_of_birth: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().email().optional(),
});

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: z.string().min(8),
});

const otpSendSchema = z.object({
  phone: z.string().min(8),
});

const otpVerifySchema = z.object({
  phone: z.string().min(8),
  otp: z.string().length(6),
});

const totpSchema = z.object({
  token: z.string().length(6),
});

const hospitalSignupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  hospital_code: z.string().min(3),
  role: z.nativeEnum(HospitalStaffRole),
  department: z.string().optional(),
  full_name: z.string().optional(),
});

router.post("/hospital-signup", validateBody(hospitalSignupSchema), async (req, res, next) => {
  try {
    res.status(201).json(await publicHospitalStaffSignup(req.body));
  } catch (err) {
    next(err);
  }
});

router.post("/login", validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, organization_code, totp_code } = req.body;
    const result = await loginUser(email, password, organization_code, totp_code);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
  try {
    const result = await refreshAccessToken(req.body.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", validateBody(logoutSchema), async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    await logoutUser(req.body.refresh_token, accessToken);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/register", validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerPatient(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/send-otp", validateBody(otpSendSchema), async (req, res, next) => {
  try {
    res.json(await sendOtp(req.body.phone));
  } catch (err) {
    next(err);
  }
});

router.post("/verify-otp", validateBody(otpVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyOtp(req.body.phone, req.body.otp));
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    await forgotPassword(req.body.email);
    res.json({ message: "If the email exists, a reset link has been sent" });
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", validateBody(resetPasswordSchema), async (req, res, next) => {
  try {
    await resetPassword(req.body.token, req.body.new_password);
    res.json({ message: "Password reset successfully" });
  } catch (err) {
    next(err);
  }
});

const changePasswordSchema = z.object({
  current_password: z.string().min(6),
  new_password: z.string().min(8),
});

router.post("/change-password", authenticate, validateBody(changePasswordSchema), async (req, res, next) => {
  try {
    res.json(
      await changePassword(req.user!.sub, req.body.current_password, req.body.new_password),
    );
  } catch (err) {
    next(err);
  }
});

router.post("/2fa/setup", authenticate, async (req, res, next) => {
  try {
    res.json(await setupTwoFactor(req.user!.sub, req.user!.email));
  } catch (err) {
    next(err);
  }
});

router.post("/2fa/enable", authenticate, validateBody(totpSchema), async (req, res, next) => {
  try {
    res.json(await enableTwoFactor(req.user!.sub, req.body.token));
  } catch (err) {
    next(err);
  }
});

router.post("/2fa/disable", authenticate, validateBody(totpSchema), async (req, res, next) => {
  try {
    res.json(await disableTwoFactor(req.user!.sub, req.body.token));
  } catch (err) {
    next(err);
  }
});

router.get("/me", authenticate, async (req, res, next) => {
  try {
    const user = await getEnhancedCurrentUser(req.user!.sub);
    if (!user) {
      res.status(404).json({ error: { code: "NOT_FOUND", message: "User not found" } });
      return;
    }
    res.json(user);
  } catch (err) {
    next(err);
  }
});

export default router;
