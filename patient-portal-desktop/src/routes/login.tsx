import { useNavigate, Link, useSearchParams, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (mode === "login") {
      if (!email.includes("@")) return setFormError(MESSAGES.form.invalidEmail);
      if (!password) return setFormError(MESSAGES.form.passwordRequired);
      if (login(email, password)) {
        toast(MESSAGES.auth.welcomeBack);
        navigate("/portal");
      } else setFormError(MESSAGES.auth.invalidCredentials);
    } else {
      if (!name || !email || !password) return setFormError(MESSAGES.form.required);
      if (signup({ name, email, phone, password })) {
        toast(MESSAGES.auth.accountCreated);
        navigate("/portal");
      } else setFormError(MESSAGES.auth.signUpFailed);
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground text-primary font-bold">M+</div>
          <span className="text-lg font-bold">MiqorAI</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Your health, in your hands.</h2>
          <p className="mt-4 opacity-90">Join 50,000+ patients across Africa taking control of their medical records.</p>
        </div>
        <div className="text-sm opacity-75">© 2026 MiqorAI</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-8">
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
                  onClick={() => {
                    logout();
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
            {mode === "login" ? "Sign in to your medical portal" : "Free forever — no credit card needed"}
          </p>

          <form onSubmit={onSubmit} className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <Field label="Full name" value={name} onChange={setName} disabled={isLoggedIn && wantsSignup} />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+254 712 345 678" disabled={isLoggedIn && wantsSignup} />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} type="email" disabled={isLoggedIn && wantsSignup} />
            <Field label="Password" value={password} onChange={setPassword} type="password" disabled={isLoggedIn && wantsSignup} />
            {formError ? <FormAlert>{formError}</FormAlert> : null}
            <button
              type="submit"
              disabled={isLoggedIn && wantsSignup}
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary-dark disabled:opacity-50"
            >
              {mode === "login" ? "Log in" : "Create account"}
            </button>
          </form>

          <p className="mt-6 text-center text-xs text-muted-foreground">
            By continuing you agree to our Terms and Privacy Policy.
          </p>
        </div>
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
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
  disabled?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring disabled:opacity-50"
      />
    </label>
  );
}
