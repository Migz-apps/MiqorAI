import { useNavigate, Link, useSearchParams } from "react-router-dom";

import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useToast } from "@/components/Toast";

export default function LoginPage() {
  const [searchParams] = useSearchParams();
  const tab = searchParams.get("tab") as "login" | "signup" | null;
  const [mode, setMode] = useState<"login" | "signup">(tab ?? "login");
  const { login, signup } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "login") {
      if (!email.includes("@")) return toast("Please enter a valid email", "error");
      if (!password) return toast("Password is required", "error");
      if (login(email, password)) {
        toast("Welcome back!");
        navigate("/portal");
      } else toast("Login failed", "error");
    } else {
      if (!name || !email || !password) return toast("All fields required", "error");
      if (signup({ name, email, phone, password })) {
        toast("Account created!");
        navigate("/portal");
      } else toast("Sign up failed", "error");
    }
  };

  return (
    <div className="min-h-screen grid md:grid-cols-2">
      <div className="hidden md:flex flex-col justify-between p-12 bg-gradient-to-br from-primary to-primary-dark text-primary-foreground">
        <Link to="/" className="flex items-center gap-2">
          <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary-foreground text-primary font-bold">M+</div>
          <span className="text-lg font-bold">MediPass</span>
        </Link>
        <div>
          <h2 className="text-4xl font-bold leading-tight">Your health, in your hands.</h2>
          <p className="mt-4 opacity-90">Join 50,000+ patients across Africa taking control of their medical records.</p>
        </div>
        <div className="text-sm opacity-75">© 2026 MediPass</div>
      </div>

      <div className="flex items-center justify-center p-6 md:p-12">
        <div className="w-full max-w-sm">
          <Link to="/" className="md:hidden flex items-center gap-2 mb-8">
            <div className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground font-bold">M+</div>
            <span className="text-lg font-bold">MediPass</span>
          </Link>

          <div className="flex rounded-lg bg-muted p-1 mb-6">
            {(["login", "signup"] as const).map((m) => (
              <button
                key={m}
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
                <Field label="Full name" value={name} onChange={setName} />
                <Field label="Phone" value={phone} onChange={setPhone} placeholder="+254 712 345 678" />
              </>
            )}
            <Field label="Email" value={email} onChange={setEmail} type="email" />
            <Field label="Password" value={password} onChange={setPassword} type="password" />
            <button
              type="submit"
              className="w-full rounded-lg bg-primary px-4 py-3 font-medium text-primary-foreground hover:bg-primary-dark"
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

function Field({ label, value, onChange, type = "text", placeholder }: { label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-medium">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-ring"
      />
    </label>
  );
}
