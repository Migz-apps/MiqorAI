import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { MESSAGES } from "@/lib/user-messages";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { loadTokens } from "@/lib/api/client";
import { AuthLoading } from "@/components/shared/AuthLoading";

export default function Login() {
  const hydrated = useAuthHydrated();
  const session = useAuth(s => s.session);
  const login = useAuth(s => s.login);
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <AuthLoading />;

  if (session && loadTokens()) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!code.trim() || !email.trim() || !password) {
      setError(MESSAGES.form.required);
      return;
    }
    const res = await login(code.trim(), email.trim(), password);
    if (!res.ok) setError(res.error || MESSAGES.auth.invalidCredentials);
    else nav("/dashboard");
  };

  return (
    <AuthShell>
      <div className="lg:hidden flex items-center gap-sm mb-lg">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Stethoscope className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">MiqorAI</div>
          <div className="text-[11px] text-text-secondary">Hospital Portal</div>
        </div>
      </div>

      <div className="space-y-xs mb-lg">
        <h1 className="h1">Welcome back</h1>
        <p className="body text-text-secondary">Sign in to access your hospital workspace.</p>
      </div>

      <form onSubmit={submit} className="space-y-md">
        <div className="space-y-xs">
          <Label htmlFor="hcode">Hospital code</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input id="hcode" className="pl-9 h-11" value={code} onChange={e => setCode(e.target.value)} placeholder="Hospital code" autoComplete="organization" />
          </div>
        </div>
        <div className="space-y-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="h-11" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.med" autoComplete="username" />
        </div>
        <div className="space-y-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
          </div>
          <div className="relative">
            <Input id="pw" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pr-10 h-11" autoComplete="current-password" />
            <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90">Sign in</Button>
      </form>

      <div className="mt-lg text-center text-sm text-text-secondary">
        New to MiqorAI? <Link to="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
      </div>

      <div className="mt-lg p-sm rounded-md bg-primary-light/40 border border-primary/10 text-[11px] text-primary leading-relaxed">
        Use the local development credentials from the project credentials file. Passwords are never pre-filled in the portal.
      </div>
    </AuthShell>
  );
}
