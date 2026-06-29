import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { MESSAGES } from "@/lib/user-messages";

export default function Login() {
  const session = useAuth((s) => s.session);
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const [code, setCode] = useState("MPC-GOODLIFE-001");
  const [email, setEmail] = useState("brian@goodlife.co.ke");
  const [password, setPassword] = useState("MiqorAI123!");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const res = await login(code.trim(), email.trim(), password);
    setLoading(false);
    if (!res.ok) setError(res.error || MESSAGES.auth.invalidCredentials);
    else nav("/dashboard");
  };

  return (
    <AuthShell>
      <div className="lg:hidden flex items-center gap-sm mb-lg">
        <div className="h-9 w-9 rounded-md bg-pharmacy flex items-center justify-center">
          <Pill className="h-5 w-5 text-pharmacy-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">MiqorAI</div>
          <div className="text-[11px] text-text-secondary">Pharmacy Portal</div>
        </div>
      </div>

      <div className="space-y-xs mb-lg">
        <h1 className="h1">Welcome back</h1>
        <p className="body text-text-secondary">Sign in to your pharmacy workspace.</p>
      </div>

      <form onSubmit={submit} className="space-y-md">
        <div className="space-y-xs">
          <Label htmlFor="pcode">Pharmacy code</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input id="pcode" className="pl-9 h-11" value={code} onChange={(e) => setCode(e.target.value)} placeholder="MPC-GOODLIFE-001" autoComplete="off" />
          </div>
        </div>
        <div className="space-y-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="h-11" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@pharmacy.co.ke" />
        </div>
        <div className="space-y-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <a href="#" className="text-xs text-pharmacy hover:underline">Forgot?</a>
          </div>
          <div className="relative">
            <Input id="pw" type={showPw ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} className="pr-10 h-11" />
            <button type="button" onClick={() => setShowPw((s) => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" disabled={loading} className="w-full h-11 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
          {loading ? "Signing in…" : "Sign in"}
        </Button>
      </form>

      <div className="mt-lg text-center text-sm text-text-secondary">
        New pharmacy? <Link to="/signup" className="text-pharmacy font-medium hover:underline">Request onboarding</Link>
      </div>

      <div className="mt-lg p-sm rounded-md bg-pharmacy-light/60 border border-pharmacy/15 text-[11px] text-pharmacy leading-relaxed">
        <strong>Demo:</strong> <code>brian@goodlife.co.ke</code> + <code>MPC-GOODLIFE-001</code> + password <code className="font-mono">MiqorAI123!</code>
      </div>
    </AuthShell>
  );
}
