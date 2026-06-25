import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Mail, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { MESSAGES } from "@/lib/user-messages";

export default function Login() {
  const session = useAuth(s => s.session);
  const login = useAuth(s => s.login);
  const nav = useNavigate();
  const [code, setCode] = useState("JUBILEE_001");
  const [email, setEmail] = useState("wanjiku@jubilee.co.ke");
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
        <div className="h-9 w-9 rounded-md bg-insurer flex items-center justify-center">
          <Building2 className="h-5 w-5 text-insurer-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">MiqorAI</div>
          <div className="text-[11px] text-text-secondary">Insurer Portal</div>
        </div>
      </div>

      <div className="space-y-xs mb-lg">
        <h1 className="h1">Sign in</h1>
        <p className="body text-text-secondary">Access your insurer analytics workspace.</p>
      </div>

      <form onSubmit={submit} className="space-y-md">
        <div className="space-y-xs">
          <Label htmlFor="code">Insurer code</Label>
          <div className="relative">
            <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input id="code" className="pl-9 h-11 font-mono" value={code} onChange={e => setCode(e.target.value)} placeholder="JUBILEE_001" autoComplete="off" />
          </div>
        </div>
        <div className="space-y-xs">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input id="email" type="email" className="pl-9 h-11" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@insurer.co.ke" />
          </div>
        </div>
        <div className="space-y-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <span className="text-[11px] text-text-secondary">Forgot? Contact your MiqorAI admin.</span>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input id="pw" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pl-9 pr-10 h-11" />
            <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" disabled={loading} className="w-full h-11 bg-insurer hover:bg-insurer/90 text-insurer-foreground">
          {loading ? "Signing in…" : "Sign in securely"}
        </Button>
        <div className="flex items-center gap-2 text-[11px] text-text-secondary">
          <ShieldCheck className="h-3.5 w-3.5 text-success" />
          MFA required for executives · 4-hour session timeout · Every login is audited.
        </div>
      </form>

      <div className="mt-lg p-sm rounded-md bg-insurer-light border border-insurer/15 text-[11px] text-insurer leading-relaxed">
        <strong>Demo access:</strong> insurer code <code className="font-mono">JUBILEE_001</code> + staff email + password <code className="font-mono">MiqorAI123!</code>.<br />
        Try <code>wanjiku@jubilee.co.ke</code> (analyst), <code>brian@jubilee.co.ke</code> (fraud),
        <code> grace@jubilee.co.ke</code> (contracts), <code>daniel@jubilee.co.ke</code> (executive).
      </div>

      <div className="mt-md text-center text-xs text-text-secondary">
        Not yet onboarded? <Link to="/login" className="text-insurer font-medium hover:underline">Talk to MiqorAI</Link>
      </div>
    </AuthShell>
  );
}
