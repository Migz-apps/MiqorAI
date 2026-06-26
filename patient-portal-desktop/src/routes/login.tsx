import { useNavigate, Link, useSearchParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";
import { FormAlert } from "@/components/FormAlert";
import { MESSAGES } from "@/lib/user-messages";

export default function LoginPage() {
  const { isLoggedIn, authReady, login, signup, logout, user } = useAuth();
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab");
  const wantsSignup = tab === "signup";
  const [mode, setMode] = useState<"login" | "signup">(wantsSignup ? "signup" : "login");
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    setMode(wantsSignup ? "signup" : "login");
  }, [wantsSignup]);

  if (!authReady) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Loading…
      </div>
    );
  }

  // Only skip the login form when returning users open /login — never when they chose "Get started".
  if (isLoggedIn && !wantsSignup && mode === "login") {
    return <Navigate to="/portal" replace />;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (mode === "login") {
      if (!email.includes("@")) return setFormError(MESSAGES.form.invalidEmail);
      if (!password) return setFormError(MESSAGES.form.passwordRequired);
      if (await login(email, password)) {
        toast(MESSAGES.auth.welcomeBack);
        navigate("/portal");
      } else setFormError(MESSAGES.auth.invalidCredentials);
    } else {
      if (!name || !email || !password) return setFormError(MESSAGES.form.required);
      if (await signup({ name, email, phone, password })) {
        toast(MESSAGES.auth.accountCreated);
        navigate("/portal");
      } else setFormError(MESSAGES.auth.signUpFailed);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="flex items-center gap-2 mb-8">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M+</div>
            <span className="text-lg font-bold">MiqorAI</span>
          </Link>

          {isLoggedIn && wantsSignup && (
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
                    await logout();
                    toast(MESSAGES.auth.signedOut, "success");
                  }}
                  className="rounded-lg border border-border px-3 py-1.5 text-sm font-medium hover:bg-muted"
                >
                  Sign out
                </button>
              </div>
            </div>
          )}

          <div className="flex rounded-lg bg-muted p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => setMode(m)}
                className={`flex-1 rounded-md py-2 text-sm font-medium transition ${mode === m ? "bg-card shadow-sm" : "text-muted-foreground"
                  }`}
              >
                {m === "login" ? "Log in" : "Sign up"}
              </button>
            ))}
          </div>

          <h1 className="text-2xl font-bold">{mode === "login" ? "Welcome back" : "Create your account"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {mode === "login" ? "Email format: name@example.com" : "Use a valid email address like name@example.com"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Full name" value={name} onChange={setName} disabled={isLoggedIn && wantsSignup} />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+254 712 345 678" disabled={isLoggedIn && wantsSignup} />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} type="email" placeholder="name@example.com" disabled={isLoggedIn && wantsSignup} />
            <Field
              label="Password"
              value={password}
              onChange={setPassword}
              type={showPassword ? "text" : "password"}
              disabled={isLoggedIn && wantsSignup}
              rightElement={
                <button
                  type="button"
                  onClick={() => setShowPassword((show) => !show)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              }
            />
            {formError ? <FormAlert>{formError}</FormAlert> : null}
            <button
              type="submit"
              disabled={isLoggedIn && wantsSignup}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

        </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
  disabled = false,
  rightElement,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
  rightElement?: React.ReactNode;
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
          className={`w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 ${rightElement ? "pr-10" : ""}`}
        />
        {rightElement}
      </div>
    </label>
  );
}
