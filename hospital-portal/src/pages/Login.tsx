import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Eye, EyeOff, Building2, Stethoscope } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";

export default function Login() {
  const session = useAuth(s => s.session);
  const login = useAuth(s => s.login);
  const nav = useNavigate();
  const [code, setCode] = useState("MP-LAGOS-001");
  const [email, setEmail] = useState("amara@stcatherine.med");
  const [password, setPassword] = useState("medpass");
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/dashboard" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const res = login(code.trim(), email.trim(), password);
    if (!res.ok) setError(res.error || "Login failed");
    else nav("/dashboard");
  };

  return (
    <AuthShell>
      <div className="lg:hidden flex items-center gap-sm mb-lg">
        <div className="h-9 w-9 rounded-md bg-primary flex items-center justify-center">
          <Stethoscope className="h-5 w-5 text-primary-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">Med-Pass</div>
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
            <Input id="hcode" className="pl-9 h-11" value={code} onChange={e => setCode(e.target.value)} placeholder="MP-LAGOS-001" autoComplete="off" />
          </div>
        </div>
        <div className="space-y-xs">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" className="h-11" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@hospital.med" />
        </div>
        <div className="space-y-xs">
          <div className="flex items-center justify-between">
            <Label htmlFor="pw">Password</Label>
            <a href="#" className="text-xs text-primary hover:underline">Forgot?</a>
          </div>
          <div className="relative">
            <Input id="pw" type={showPw ? "text" : "password"} value={password} onChange={e => setPassword(e.target.value)} className="pr-10 h-11" />
            <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
              {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
        {error && <FormAlert>{error}</FormAlert>}
        <Button type="submit" className="w-full h-11 bg-primary hover:bg-primary/90">Sign in</Button>
      </form>

      <div className="mt-lg text-center text-sm text-text-secondary">
        New to Med-Pass? <Link to="/signup" className="text-primary font-medium hover:underline">Create an account</Link>
      </div>

      <div className="mt-lg p-sm rounded-md bg-primary-light/40 border border-primary/10 text-[11px] text-primary leading-relaxed">
        <strong>Demo:</strong> any active staff email + password <code className="font-mono">medpass</code>. Try <code>adaeze@stcatherine.med</code> (receptionist), <code>joseph@stcatherine.med</code> (nurse), <code>amara@stcatherine.med</code> (doctor), <code>tunde@stcatherine.med</code> (admin).
      </div>
    </AuthShell>
  );
}
