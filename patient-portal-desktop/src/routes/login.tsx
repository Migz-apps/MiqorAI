import { useEffect, useMemo, useState, type Dispatch, type FormEvent, type ReactNode, type SetStateAction } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { FormAlert } from "@/components/FormAlert";
import { MESSAGES } from "@/lib/user-messages";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";

type Mode = "login" | "signup";
type PasswordResetStage = "request" | "verify" | "complete";
type FieldErrors = Partial<
  Record<
    | "email"
    | "password"
    | "name"
    | "phone"
    | "dateOfBirth"
    | "signupOtp"
    | "forgotPasswordEmail"
    | "resetOtp"
    | "newPassword"
    | "confirmNewPassword",
    string
  >
>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_PATTERN = /^\+?[1-9]\d{7,14}$/;

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function normalizePhone(value: string) {
  return value.replace(/[\s()-]/g, "");
}

function normalizeOtp(value: string) {
  return value.replace(/\D/g, "").slice(0, 6);
}

function validateEmail(value: string) {
  const email = normalizeEmail(value);
  if (!email) return "Email is required.";
  if (!EMAIL_PATTERN.test(email)) return "Enter a valid email address.";
  if (email.length > 254) return "Email address is too long.";
  return null;
}

function validatePhone(value: string) {
  const phone = normalizePhone(value);
  if (!phone) return "Phone number is required.";
  if (!PHONE_PATTERN.test(phone)) return "Use a valid international phone number, for example +2507XXXXXXXX.";
  return null;
}

function validateName(value: string) {
  const name = value.trim();
  if (!name) return "Full name is required.";
  if (name.length < 2) return "Full name must be at least 2 characters.";
  if (name.length > 120) return "Full name is too long.";
  if (!/^[\p{L}][\p{L}\s'.-]*$/u.test(name)) return "Enter a valid full name.";
  return null;
}

function validateDateOfBirth(value: string) {
  if (!value) return "Date of birth is required.";
  const date = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return "Enter a valid date of birth.";
  const now = new Date();
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  if (date > today) return "Date of birth cannot be in the future.";
  const oldestAllowed = new Date(today);
  oldestAllowed.setUTCFullYear(oldestAllowed.getUTCFullYear() - 130);
  if (date < oldestAllowed) return "Date of birth is outside the supported range.";
  const minimumAdultDate = new Date(today);
  minimumAdultDate.setUTCFullYear(minimumAdultDate.getUTCFullYear() - 13);
  if (date > minimumAdultDate) return "Patients must be at least 13 years old to self-register.";
  return null;
}

function getPasswordIssues(value: string) {
  const issues: string[] = [];
  if (!value) issues.push("Password is required.");
  if (value && value.length < 10) issues.push("Use at least 10 characters.");
  if (value && value.length > 128) issues.push("Password is too long.");
  if (value && !/[a-z]/.test(value)) issues.push("Add a lowercase letter.");
  if (value && !/[A-Z]/.test(value)) issues.push("Add an uppercase letter.");
  if (value && !/\d/.test(value)) issues.push("Add a number.");
  if (value && !/[^A-Za-z0-9]/.test(value)) issues.push("Add a special character.");
  return issues;
}

function validatePassword(value: string) {
  const issues = getPasswordIssues(value);
  return issues[0] ?? null;
}

function validateOtp(value: string, label: string) {
  const otp = normalizeOtp(value);
  if (!otp) return `${label} is required.`;
  if (otp.length !== 6) return `Enter the 6-digit ${label.toLowerCase()}.`;
  return null;
}

export default function LoginPage() {
  const {
    isLoggedIn,
    authReady,
    login,
    signup,
    verifySignupOtp,
    resendSignupOtp,
    requestPasswordReset,
    resendPasswordResetOtp,
    verifyPasswordResetOtp,
    resetPassword,
    logout,
    user,
  } = useAuth();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const tab = searchParams.get("tab");
  const resetTokenFromLink = searchParams.get("reset_token")?.trim() ?? "";
  const wantsSignup = tab === "signup";

  const [mode, setMode] = useState<Mode>(wantsSignup ? "signup" : "login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");

  const [signupOtp, setSignupOtp] = useState("");
  const [pendingVerificationEmail, setPendingVerificationEmail] = useState("");

  const [showPasswordReset, setShowPasswordReset] = useState(Boolean(resetTokenFromLink));
  const [passwordResetStage, setPasswordResetStage] = useState<PasswordResetStage>(
    resetTokenFromLink ? "complete" : "request",
  );
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [resetOtp, setResetOtp] = useState("");
  const [verifiedResetToken, setVerifiedResetToken] = useState(resetTokenFromLink);
  const [newPassword, setNewPassword] = useState("");
  const [confirmNewPassword, setConfirmNewPassword] = useState("");

  const [formError, setFormError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  useEffect(() => {
    setMode(wantsSignup ? "signup" : "login");
  }, [wantsSignup]);

  useEffect(() => {
    if (!resetTokenFromLink) return;
    setVerifiedResetToken(resetTokenFromLink);
    setPasswordResetStage("complete");
    setShowPasswordReset(true);
  }, [resetTokenFromLink]);

  const title = useMemo(() => {
    if (pendingVerificationEmail) return "Verify your email";
    if (showPasswordReset) {
      if (passwordResetStage === "request") return "Reset your password";
      if (passwordResetStage === "verify") return "Check your email";
      return "Choose a new password";
    }
    return mode === "login" ? "Welcome back" : "Create your account";
  }, [mode, passwordResetStage, pendingVerificationEmail, showPasswordReset]);

  const subtitle = useMemo(() => {
    if (pendingVerificationEmail) {
      return `Enter the 6-digit code we sent to ${pendingVerificationEmail}.`;
    }
    if (showPasswordReset) {
      if (passwordResetStage === "request") {
        return "Enter your patient account email and we will send a reset code.";
      }
      if (passwordResetStage === "verify") {
        return `Enter the 6-digit reset code we sent to ${forgotPasswordEmail}.`;
      }
      return "Create a strong new password for your patient account.";
    }
    return mode === "login"
      ? "Use your email address and password to sign in."
      : "Use your real patient details to create a secure account.";
  }, [forgotPasswordEmail, mode, passwordResetStage, pendingVerificationEmail, showPasswordReset]);

  const passwordStrengthHints = useMemo(() => getPasswordIssues(password), [password]);
  const resetPasswordHints = useMemo(() => getPasswordIssues(newPassword), [newPassword]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading...
      </div>
    );
  }

  if (isLoggedIn && !wantsSignup && !pendingVerificationEmail && !showPasswordReset && mode === "login") {
    return <Navigate to="/portal" replace />;
  }

  const isBusy = pendingAction !== null;

  const resetToLogin = () => {
    setPendingVerificationEmail("");
    setSignupOtp("");
    setShowPasswordReset(false);
    setPasswordResetStage(resetTokenFromLink ? "complete" : "request");
    setVerifiedResetToken(resetTokenFromLink);
    setForgotPasswordEmail("");
    setResetOtp("");
    setNewPassword("");
    setConfirmNewPassword("");
    setFormError(null);
    setFieldErrors({});
    setMode("login");
  };

  const updateFieldError = (name: keyof FieldErrors, message: string | null) => {
    setFieldErrors((current) => {
      if (!message) {
        if (!(name in current)) return current;
        const next = { ...current };
        delete next[name];
        return next;
      }
      return { ...current, [name]: message };
    });
  };

  const validateLoginForm = () => {
    const nextErrors: FieldErrors = {};
    const emailError = validateEmail(email);
    const passwordError = !password ? MESSAGES.form.passwordRequired : null;
    if (emailError) nextErrors.email = emailError;
    if (passwordError) nextErrors.password = passwordError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSignupForm = () => {
    const nextErrors: FieldErrors = {};
    const nameError = validateName(name);
    const emailError = validateEmail(email);
    const phoneError = validatePhone(phone);
    const dobError = validateDateOfBirth(dateOfBirth);
    const passwordError = validatePassword(password);
    if (nameError) nextErrors.name = nameError;
    if (emailError) nextErrors.email = emailError;
    if (phoneError) nextErrors.phone = phoneError;
    if (dobError) nextErrors.dateOfBirth = dobError;
    if (passwordError) nextErrors.password = passwordError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateResetRequestForm = () => {
    const nextErrors: FieldErrors = {};
    const emailError = validateEmail(forgotPasswordEmail);
    if (emailError) nextErrors.forgotPasswordEmail = emailError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateResetVerifyForm = () => {
    const nextErrors: FieldErrors = {};
    const otpError = validateOtp(resetOtp, "reset code");
    if (otpError) nextErrors.resetOtp = otpError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateResetCompleteForm = () => {
    const nextErrors: FieldErrors = {};
    const passwordError = validatePassword(newPassword);
    if (passwordError) nextErrors.newPassword = passwordError;
    if (!confirmNewPassword) nextErrors.confirmNewPassword = "Please confirm your new password.";
    else if (newPassword !== confirmNewPassword) nextErrors.confirmNewPassword = "Your new passwords do not match.";
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const validateSignupOtpForm = () => {
    const nextErrors: FieldErrors = {};
    const otpError = validateOtp(signupOtp, "verification code");
    if (otpError) nextErrors.signupOtp = otpError;
    setFieldErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (pendingVerificationEmail) {
      if (!validateSignupOtpForm()) return;
      setPendingAction("verify-signup");
      try {
        if (await verifySignupOtp(pendingVerificationEmail, normalizeOtp(signupOtp))) {
          toast("Your patient account has been verified.");
          navigate("/portal");
        } else {
          setFormError("We couldn't verify that code. Check it and try again.");
        }
      } finally {
        setPendingAction(null);
      }
      return;
    }

    if (showPasswordReset) {
      if (passwordResetStage === "request") {
        if (!validateResetRequestForm()) return;
        setPendingAction("request-reset");
        try {
          if (await requestPasswordReset(normalizeEmail(forgotPasswordEmail))) {
            setPasswordResetStage("verify");
            setFieldErrors({});
            toast("If that patient email exists, a reset code has been sent.");
          } else {
            setFormError("We couldn't start password reset right now. Please try again.");
          }
        } finally {
          setPendingAction(null);
        }
        return;
      }

      if (passwordResetStage === "verify") {
        if (!validateResetVerifyForm()) return;
        setPendingAction("verify-reset");
        try {
          const token = await verifyPasswordResetOtp(normalizeEmail(forgotPasswordEmail), normalizeOtp(resetOtp));
          if (!token) {
            setFormError("We couldn't verify that reset code. Check it and try again.");
            return;
          }
          setVerifiedResetToken(token);
          setPasswordResetStage("complete");
          setFieldErrors({});
          toast("Code verified. You can now choose a new password.");
        } finally {
          setPendingAction(null);
        }
        return;
      }

      if (!verifiedResetToken) {
        setFormError("Your password reset session expired. Request a new code.");
        setPasswordResetStage("request");
        return;
      }

      if (!validateResetCompleteForm()) return;
      setPendingAction("complete-reset");
      try {
        if (await resetPassword(verifiedResetToken, newPassword)) {
          toast("Your password has been reset. Please sign in.");
          resetToLogin();
        } else {
          setFormError("We couldn't reset your password. Request a new reset code and try again.");
        }
      } finally {
        setPendingAction(null);
      }
      return;
    }

    if (mode === "login") {
      if (!validateLoginForm()) return;
      setPendingAction("login");
      try {
        if (await login(normalizeEmail(email), password)) {
          toast(MESSAGES.auth.welcomeBack);
          navigate("/portal");
        } else {
          setFormError(MESSAGES.auth.invalidCredentials);
        }
      } finally {
        setPendingAction(null);
      }
      return;
    }

    if (!validateSignupForm()) return;
    setPendingAction("signup");
    try {
      const result = await signup({
        name: name.trim(),
        email: normalizeEmail(email),
        phone: normalizePhone(phone),
        password,
        dateOfBirth,
      });
      if (!result?.verificationRequired) {
        setFormError("We couldn't create your account. Check your details and try again.");
        return;
      }
      setPendingVerificationEmail(result.email);
      setSignupOtp("");
      setFieldErrors({});
      toast("We sent a verification code to your email.");
    } finally {
      setPendingAction(null);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="mb-8 flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary font-bold text-primary-foreground">M+</div>
          <span className="text-lg font-bold">MiqorAI</span>
        </Link>

        {isLoggedIn && wantsSignup && !pendingVerificationEmail && !showPasswordReset && (
          <div className="mb-6 rounded-lg border border-border bg-muted/50 p-4 text-sm">
            <p className="font-medium">You are signed in as {user?.email}</p>
            <p className="mt-1 text-muted-foreground">Sign out first to create a different account.</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => navigate("/portal")}
                className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground"
              >
                Go to portal
              </button>
              <button
                type="button"
                onClick={async () => {
                  setPendingAction("logout");
                  try {
                    await logout();
                    toast(MESSAGES.auth.signedOut, "success");
                  } finally {
                    setPendingAction(null);
                  }
                }}
                className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
              >
                Sign out
              </button>
            </div>
          </div>
        )}

        {!pendingVerificationEmail && !showPasswordReset && (
          <div className="mb-6 flex rounded-lg bg-muted p-1">
            {(["login", "signup"] as const).map((entry) => (
              <button
                key={entry}
                type="button"
                onClick={() => {
                  setMode(entry);
                  setFormError(null);
                  setFieldErrors({});
                }}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === entry ? "bg-card shadow-sm" : "text-muted-foreground"}`}
              >
                {entry === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>
        )}

        <h1 className="text-2xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>

        <form onSubmit={onSubmit} autoComplete="off" className="mt-6 space-y-4">
          {!pendingVerificationEmail && !showPasswordReset && mode === "signup" && (
            <>
              <Field
                label="Full name"
                value={name}
                onChange={(value) => {
                  setName(value);
                  updateFieldError("name", validateName(value));
                }}
                disabled={isLoggedIn && wantsSignup}
                autoComplete="name"
                error={fieldErrors.name}
              />
              <Field
                label="Phone"
                value={phone}
                onChange={(value) => {
                  setPhone(value);
                  updateFieldError("phone", validatePhone(value));
                }}
                placeholder="+2507XXXXXXXX"
                disabled={isLoggedIn && wantsSignup}
                autoComplete="tel"
                helperText="Use a personal phone number you can access if account recovery is ever needed."
                error={fieldErrors.phone}
              />
              <Field
                label="Date of birth"
                value={dateOfBirth}
                onChange={(value) => {
                  setDateOfBirth(value);
                  updateFieldError("dateOfBirth", validateDateOfBirth(value));
                }}
                type="date"
                disabled={isLoggedIn && wantsSignup}
                autoComplete="bday"
                error={fieldErrors.dateOfBirth}
              />
            </>
          )}

          {!pendingVerificationEmail && !showPasswordReset && (
            <>
              <Field
                label="Email"
                value={email}
                onChange={(value) => {
                  setEmail(value);
                  updateFieldError("email", validateEmail(value));
                }}
                type="email"
                placeholder="name@example.com"
                disabled={isLoggedIn && wantsSignup}
                autoComplete={mode === "login" ? "username" : "email"}
                error={fieldErrors.email}
              />
              <PasswordField
                label="Password"
                value={password}
                onChange={(value) => {
                  setPassword(value);
                  updateFieldError("password", mode === "signup" ? validatePassword(value) : !value ? MESSAGES.form.passwordRequired : null);
                }}
                showPassword={showPassword}
                setShowPassword={setShowPassword}
                placeholder={mode === "login" ? "Enter your password" : "Create a strong password"}
                disabled={isLoggedIn && wantsSignup}
                autoComplete={mode === "login" ? "current-password" : "new-password"}
                helperText={
                  mode === "signup"
                    ? "Use at least 10 characters with uppercase, lowercase, number, and symbol."
                    : undefined
                }
                error={fieldErrors.password}
              />
              {mode === "signup" && (
                <PasswordChecklist issues={passwordStrengthHints} validLabel="Password strength looks good." />
              )}
            </>
          )}

          {pendingVerificationEmail && (
            <>
              <Field label="Email" value={pendingVerificationEmail} onChange={() => undefined} disabled autoComplete="off" />
              <OtpField
                label="Verification code"
                value={signupOtp}
                onChange={(value) => {
                  const nextValue = normalizeOtp(value);
                  setSignupOtp(nextValue);
                  updateFieldError("signupOtp", nextValue ? validateOtp(nextValue, "verification code") : null);
                }}
                error={fieldErrors.signupOtp}
              />
            </>
          )}

          {showPasswordReset && passwordResetStage === "request" && (
            <Field
              label="Email"
              value={forgotPasswordEmail}
              onChange={(value) => {
                setForgotPasswordEmail(value);
                updateFieldError("forgotPasswordEmail", validateEmail(value));
              }}
              type="email"
              placeholder="name@example.com"
              autoComplete="email"
              error={fieldErrors.forgotPasswordEmail}
            />
          )}

          {showPasswordReset && passwordResetStage === "verify" && (
            <>
              <Field label="Email" value={forgotPasswordEmail} onChange={() => undefined} disabled autoComplete="off" />
              <OtpField
                label="Reset code"
                value={resetOtp}
                onChange={(value) => {
                  const nextValue = normalizeOtp(value);
                  setResetOtp(nextValue);
                  updateFieldError("resetOtp", nextValue ? validateOtp(nextValue, "reset code") : null);
                }}
                error={fieldErrors.resetOtp}
              />
            </>
          )}

          {showPasswordReset && passwordResetStage === "complete" && (
            <>
              <PasswordField
                label="New password"
                value={newPassword}
                onChange={(value) => {
                  setNewPassword(value);
                  updateFieldError("newPassword", validatePassword(value));
                  if (confirmNewPassword) {
                    updateFieldError(
                      "confirmNewPassword",
                      value === confirmNewPassword ? null : "Your new passwords do not match.",
                    );
                  }
                }}
                showPassword={showResetPassword}
                setShowPassword={setShowResetPassword}
                placeholder="Choose a strong password"
                autoComplete="new-password"
                helperText="Use at least 10 characters with uppercase, lowercase, number, and symbol."
                error={fieldErrors.newPassword}
              />
              <PasswordChecklist issues={resetPasswordHints} validLabel="Password strength looks good." />
              <PasswordField
                label="Confirm new password"
                value={confirmNewPassword}
                onChange={(value) => {
                  setConfirmNewPassword(value);
                  updateFieldError(
                    "confirmNewPassword",
                    !value ? "Please confirm your new password." : value !== newPassword ? "Your new passwords do not match." : null,
                  );
                }}
                showPassword={showResetPassword}
                setShowPassword={setShowResetPassword}
                placeholder="Re-enter your new password"
                autoComplete="new-password"
                error={fieldErrors.confirmNewPassword}
              />
            </>
          )}

          {formError ? <FormAlert>{formError}</FormAlert> : null}

          <button
            type="submit"
            disabled={isBusy || (isLoggedIn && wantsSignup && !pendingVerificationEmail)}
            className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
          >
            {pendingAction === "login" && "Signing in..."}
            {pendingAction === "signup" && "Creating account..."}
            {pendingAction === "verify-signup" && "Verifying account..."}
            {pendingAction === "request-reset" && "Sending reset code..."}
            {pendingAction === "verify-reset" && "Verifying reset code..."}
            {pendingAction === "complete-reset" && "Resetting password..."}
            {!pendingAction &&
              (pendingVerificationEmail
                ? "Verify account"
                : showPasswordReset
                  ? passwordResetStage === "request"
                    ? "Send reset code"
                    : passwordResetStage === "verify"
                      ? "Verify reset code"
                      : "Reset password"
                  : mode === "login"
                    ? "Log in"
                    : "Create account")}
          </button>

          {pendingVerificationEmail && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setFormError(null);
                  setPendingAction("resend-signup");
                  try {
                    if (await resendSignupOtp(pendingVerificationEmail)) {
                      toast("A new verification code has been sent.");
                    } else {
                      setFormError("We couldn't resend the verification code yet. Try again shortly.");
                    }
                  } finally {
                    setPendingAction(null);
                  }
                }}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setPendingVerificationEmail("");
                  setSignupOtp("");
                  setFormError(null);
                  setFieldErrors({});
                }}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Edit details
              </button>
            </div>
          )}

          {showPasswordReset && passwordResetStage === "verify" && (
            <div className="flex items-center justify-between gap-3 text-sm">
              <button
                type="button"
                disabled={isBusy}
                onClick={async () => {
                  setFormError(null);
                  setPendingAction("resend-reset");
                  try {
                    if (await resendPasswordResetOtp(normalizeEmail(forgotPasswordEmail))) {
                      toast("A new reset code has been sent.");
                    } else {
                      setFormError("We couldn't resend the reset code yet. Try again shortly.");
                    }
                  } finally {
                    setPendingAction(null);
                  }
                }}
                className="font-medium text-primary hover:underline disabled:opacity-50"
              >
                Resend code
              </button>
              <button
                type="button"
                disabled={isBusy}
                onClick={() => {
                  setPasswordResetStage("request");
                  setResetOtp("");
                  setFormError(null);
                  setFieldErrors({});
                }}
                className="text-muted-foreground hover:text-foreground disabled:opacity-50"
              >
                Use another email
              </button>
            </div>
          )}
        </form>

        {!pendingVerificationEmail && !showPasswordReset && mode === "login" && (
          <button
            type="button"
            onClick={() => {
              setShowPasswordReset(true);
              setPasswordResetStage(resetTokenFromLink ? "complete" : "request");
              setForgotPasswordEmail(normalizeEmail(email));
              setFormError(null);
              setFieldErrors({});
            }}
            className="mt-4 text-sm font-medium text-primary hover:underline"
          >
            Forgot your password?
          </button>
        )}

        {(showPasswordReset || pendingVerificationEmail) && (
          <button
            type="button"
            onClick={resetToLogin}
            disabled={isBusy}
            className="mt-4 text-sm text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            Back to sign in
          </button>
        )}
      </div>
    </div>
  );
}

function OtpField({
  label,
  value,
  onChange,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2">
      <span className="text-sm font-medium">{label}</span>
      <div className={`flex justify-center rounded-xl border bg-card p-4 ${error ? "border-destructive/60" : "border-input"}`}>
        <InputOTP maxLength={6} value={value} onChange={onChange} containerClassName="justify-center gap-0">
          <InputOTPGroup>
            {Array.from({ length: 6 }, (_, index) => (
              <InputOTPSlot key={index} index={index} className="h-11 w-11 text-base" />
            ))}
          </InputOTPGroup>
        </InputOTP>
      </div>
      <p className={`text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}>
        {error ?? "Codes are short-lived for security. If needed, request a new one."}
      </p>
    </div>
  );
}

function PasswordChecklist({ issues, validLabel }: { issues: string[]; validLabel: string }) {
  const items = issues.length > 0 ? issues : [validLabel];
  const isValid = issues.length === 0;
  return (
    <div className={`rounded-lg border px-3 py-2 text-xs ${isValid ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-amber-200 bg-amber-50 text-amber-800"}`}>
      {items.map((item) => (
        <p key={item}>{item}</p>
      ))}
    </div>
  );
}

function PasswordField({
  label,
  value,
  onChange,
  showPassword,
  setShowPassword,
  placeholder,
  disabled = false,
  autoComplete,
  helperText,
  error,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  showPassword: boolean;
  setShowPassword: Dispatch<SetStateAction<boolean>>;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  helperText?: string;
  error?: string;
}) {
  return (
    <Field
      label={label}
      value={value}
      onChange={onChange}
      type={showPassword ? "text" : "password"}
      placeholder={placeholder}
      disabled={disabled}
      autoComplete={autoComplete}
      helperText={helperText}
      error={error}
      rightElement={
        <button
          type="button"
          onClick={() => setShowPassword((current) => !current)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
          aria-label={showPassword ? "Hide password" : "Show password"}
        >
          {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  autoComplete,
  helperText,
  rightElement,
  error,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  autoComplete?: string;
  helperText?: string;
  rightElement?: ReactNode;
  error?: string;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <div className="relative mt-1">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete={autoComplete}
          autoCapitalize={type === "email" ? "none" : undefined}
          autoCorrect={type === "email" ? "off" : undefined}
          spellCheck={type === "email" ? false : undefined}
          aria-invalid={error ? "true" : "false"}
          className={`w-full rounded-lg border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${rightElement ? "pr-10" : ""} ${error ? "border-destructive/60" : "border-input"}`}
        />
        {rightElement}
      </div>
      {error ? <span className="mt-1 block text-xs text-destructive">{error}</span> : null}
      {!error && helperText ? <span className="mt-1 block text-xs text-muted-foreground">{helperText}</span> : null}
    </label>
  );
}
