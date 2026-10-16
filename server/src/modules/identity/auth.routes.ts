import { Router, type CookieOptions, type Request, type Response } from "express";
import { z } from "zod";
import { SyncOperation } from "@prisma/client";
import { HospitalStaffRole } from "@prisma/client";
import { config } from "../../config.js";
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
} from "./auth.service.js";
import { getEnhancedCurrentUser } from "./session.service.js";
import { acceptInvitation, getInvitationInfo } from "./invitation.service.js";
import { publicHospitalStaffSignup } from "./public-signup.service.js";
import { sendOtp, verifyOtp } from "./otp.service.js";
import {
  disableTwoFactor,
  enableTwoFactor,
  setupTwoFactor,
} from "./twofa.service.js";
import { authenticate, requireTrustedOrigin } from "../../shared/middleware/auth.js";
import { validateBody } from "../../shared/middleware/errorHandler.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";
import { parseDurationMs } from "../../shared/utils/duration.js";
import { param } from "../../shared/utils/param.js";
import { unauthorized } from "../../shared/utils/errors.js";
import {
  dateStringSchema,
  emailSchema,
  otpCodeSchema,
  personNameSchema,
  phoneSchema,
  strongPasswordSchema,
} from "../../shared/utils/validation.js";

const router = Router();

// CSRF guard: with the refresh token now in an httpOnly cookie, state-changing
// auth requests from a browser must come from an allowed origin.
router.use(requireTrustedOrigin);

const REFRESH_COOKIE = "miqorai_refresh";

function refreshCookieOptions(): CookieOptions {
  const production = config.nodeEnv === "production";
  return {
    httpOnly: true,
    path: "/api/auth",
    secure: production,
    sameSite: production ? "none" : "lax",
  };
}

/** Web clients get the refresh token as an httpOnly cookie alongside the JSON
 * body; mobile clients keep reading it from the body. */
function setRefreshCookie(res: Response, refreshToken: string) {
  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...refreshCookieOptions(),
    maxAge: parseDurationMs(config.jwtRefreshExpires),
  });
}

function clearRefreshCookie(res: Response) {
  res.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
}

function readRefreshToken(req: Request): string | undefined {
  const fromBody = (req.body as { refresh_token?: string } | undefined)?.refresh_token;
  if (fromBody) return fromBody;
  const fromCookie = (req.cookies as Record<string, string> | undefined)?.[REFRESH_COOKIE];
  return fromCookie || undefined;
}

const ipKey = (req: Request) => req.ip ?? "unknown";
const emailKey = (req: Request) =>
  String((req.body as { email?: string } | undefined)?.email ?? "")
    .trim()
    .toLowerCase() || ipKey(req);
const phoneKey = (req: Request) =>
  String((req.body as { phone?: string } | undefined)?.phone ?? "").replace(/\s/g, "") ||
  ipKey(req);

const loginLimiter = createRateLimiter({
  name: "login",
  windowMs: 15 * 60_000,
  max: 10,
  keyFn: (req) => `${ipKey(req)}:${emailKey(req)}`,
});
const otpSendLimiter = createRateLimiter({
  name: "otp-send",
  windowMs: 10 * 60_000,
  max: 3,
  keyFn: phoneKey,
});
const registerOtpLimiter = createRateLimiter({
  name: "register-otp",
  windowMs: 10 * 60_000,
  max: 3,
  keyFn: emailKey,
});
const otpVerifyLimiter = createRateLimiter({
  name: "otp-verify",
  windowMs: 15 * 60_000,
  max: 10,
  keyFn: phoneKey,
});
const registerVerifyLimiter = createRateLimiter({
  name: "register-verify",
  windowMs: 15 * 60_000,
  max: 10,
  keyFn: emailKey,
});
const forgotPasswordLimiter = createRateLimiter({
  name: "forgot-password",
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: emailKey,
});
const forgotPasswordResendLimiter = createRateLimiter({
  name: "forgot-password-resend",
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: emailKey,
});
const forgotPasswordVerifyLimiter = createRateLimiter({
  name: "forgot-password-verify",
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: emailKey,
});
const resetPasswordLimiter = createRateLimiter({
  name: "reset-password",
  windowMs: 15 * 60_000,
  max: 10,
});
const invitationAcceptLimiter = createRateLimiter({
  name: "invitation-accept",
  windowMs: 15 * 60_000,
  max: 5,
  keyFn: ipKey,
});

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(6),
  organization_code: z.string().optional(),
  totp_code: otpCodeSchema.optional(),
});

const refreshSchema = z.object({
  refresh_token: z.string().min(1).optional(),
});

const logoutSchema = z.object({
  refresh_token: z.string().min(1).optional(),
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

router.post("/login", loginLimiter, validateBody(loginSchema), async (req, res, next) => {
  try {
    const { email, password, organization_code, totp_code } = req.body;
    const result = await loginUser(email, password, organization_code, totp_code);
    setRefreshCookie(res, result.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/refresh", validateBody(refreshSchema), async (req, res, next) => {
  try {
    const presented = readRefreshToken(req);
    if (!presented) throw unauthorized("Missing refresh token");
    const result = await refreshAccessToken(presented);
    setRefreshCookie(res, result.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/logout", validateBody(logoutSchema), async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    const accessToken = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : undefined;
    const presented = readRefreshToken(req);
    if (presented) await logoutUser(presented, accessToken);
    clearRefreshCookie(res);
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.post("/register", registerOtpLimiter, validateBody(registerSchema), async (req, res, next) => {
  try {
    const result = await registerPatient(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/register/resend-otp", registerOtpLimiter, validateBody(registrationResendSchema), async (req, res, next) => {
  try {
    res.json(await resendPatientRegistrationOtp(req.body.email));
  } catch (err) {
    next(err);
  }
});

router.post("/register/verify-otp", registerVerifyLimiter, validateBody(registrationVerifySchema), async (req, res, next) => {
  try {
    const result = await verifyPatientRegistration(req.body.email, req.body.otp);
    setRefreshCookie(res, result.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/send-otp", otpSendLimiter, validateBody(otpSendSchema), async (req, res, next) => {
  try {
    res.json(await sendOtp(req.body.phone));
  } catch (err) {
    next(err);
  }
});

router.post("/verify-otp", otpVerifyLimiter, validateBody(otpVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyOtp(req.body.phone, req.body.otp));
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password", forgotPasswordLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    await forgotPassword(req.body.email);
    res.json({ message: "If the email exists, a reset code has been sent" });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password/resend-otp", forgotPasswordResendLimiter, validateBody(forgotPasswordSchema), async (req, res, next) => {
  try {
    await resendForgotPasswordOtp(req.body.email);
    res.json({ message: "If the email exists, a new reset code has been sent" });
  } catch (err) {
    next(err);
  }
});

router.post("/forgot-password/verify-otp", forgotPasswordVerifyLimiter, validateBody(forgotPasswordVerifySchema), async (req, res, next) => {
  try {
    res.json(await verifyForgotPasswordOtp(req.body.email, req.body.otp));
  } catch (err) {
    next(err);
  }
});

router.post("/reset-password", resetPasswordLimiter, validateBody(resetPasswordSchema), async (req, res, next) => {
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
    const result = await changePassword(req.user!.sub, req.body.current_password, req.body.new_password);
    setRefreshCookie(res, result.refresh_token);
    res.json(result);
  } catch (err) {
    next(err);
  }
});

router.post("/2fa/setup", authenticate, async (req, res, next) => {
  try {
    res.json(await setupTwoFactor(req.user!.sub, req.user!.email, (req.body as { totp_code?: string } | undefined)?.totp_code));
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

const invitationAcceptSchema = z.object({
  name: personNameSchema,
  password: strongPasswordSchema,
});

router.get("/invitation/:token", async (req, res, next) => {
  try {
    res.json(await getInvitationInfo(param(req.params.token)));
  } catch (err) {
    next(err);
  }
});

router.post(
  "/invitation/:token/accept",
  invitationAcceptLimiter,
  validateBody(invitationAcceptSchema),
  async (req, res, next) => {
    try {
      res.json(await acceptInvitation(param(req.params.token), req.body));
    } catch (err) {
      next(err);
    }
  },
);

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
