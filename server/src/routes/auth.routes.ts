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
  resendForgotPasswordOtp,
  resendPatientRegistrationOtp,
  resetPassword,
  verifyForgotPasswordOtp,
  verifyPatientRegistration,
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
import {
  dateStringSchema,
  emailSchema,
  otpCodeSchema,
  personNameSchema,
  phoneSchema,
  strongPasswordSchema,
} from "../utils/validation.js";

const router = Router();

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
  organization_code: z.string().optional(),
  totp_code: otpCodeSchema.optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1),
});

const registerSchema = z.object({
  phone: phoneSchema,
  password: strongPasswordSchema,
  full_name: personNameSchema,
  date_of_birth: dateStringSchema.refine((value) => {
    const dob = new Date(`${value}T00:00:00.000Z`);
    const minimumAdultDate = new Date();
    minimumAdultDate.setUTCFullYear(minimumAdultDate.getUTCFullYear() - 13);
    return dob <= minimumAdultDate;
  }, "Patient must be at least 13 years old to self-register"),
  email: emailSchema,
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  new_password: strongPasswordSchema,
});

const registrationVerifySchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
});

const registrationResendSchema = z.object({
  email: emailSchema,
});

const otpSendSchema = z.object({
  phone: phoneSchema,
});

const otpVerifySchema = z.object({
  phone: phoneSchema,
  otp: otpCodeSchema,
});

const forgotPasswordVerifySchema = z.object({
  email: emailSchema,
  otp: otpCodeSchema,
});

const totpSchema = z.object({
  token: otpCodeSchema,
});

const hospitalSignupSchema = z.object({
  email: emailSchema,
  password: strongPasswordSchema,
  hospital_code: z.string().min(3),
  role: z.nativeEnum(HospitalStaffRole),
  department: z.string().optional(),
  full_name: personNameSchema.optional(),
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

router.post("/register/resend-otp", validateBody(registrationResendSchema), async (req, res, next) => {
  try {
    res.json(await resendPatientRegistrationOtp(req.body.email));
  } catch (err) {
    next(err);
  }
});

router.post("/register/verify-otp", validateBody(registrationVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyPatientRegistration(req.body.email, req.body.otp));
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
    res.json({ message: "If the email exists, a reset code has been sent" });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password/resend-otp", validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    await resendForgotPasswordOtp(req.body.email);
    res.json({ message: "If the email exists, a new reset code has been sent" });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password/verify-otp", validateBody(forgotPasswordVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyForgotPasswordOtp(req.body.email, req.body.otp));
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
  new_password: strongPasswordSchema,
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
