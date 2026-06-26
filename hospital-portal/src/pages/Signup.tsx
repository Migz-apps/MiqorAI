import { useState } from "react";
import { useNavigate, Navigate, Link } from "react-router-dom";
import { Building2, User, Mail, Eye, EyeOff, Stethoscope, CheckCircle2, ClipboardList, HeartPulse, Crown, Shield, ScanLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth, ROLE_LABEL } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import type { Role } from "@/lib/types";
import { toast } from "@/lib/notify";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { loadTokens } from "@/lib/api/client";
import { AuthLoading } from "@/components/shared/AuthLoading";

const ROLE_OPTIONS: { value: Role; icon: any; tagline: string }[] = [
  { value: "receptionist", icon: ScanLine,    tagline: "Front desk · check-in & QR" },
  { value: "nurse",        icon: HeartPulse,  tagline: "Vitals, triage, lab orders" },
  { value: "doctor",       icon: ClipboardList, tagline: "Diagnose, prescribe, refer" },
  { value: "dept_head",    icon: Crown,       tagline: "Department oversight + clinical" },
  { value: "admin",        icon: Shield,      tagline: "Hospital ops, staff, billing" },
];

export default function Signup() {
  const hydrated = useAuthHydrated();
  const session = useAuth(s => s.session);
  const nav = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role | null>(null);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!hydrated) return <AuthLoading />;
  if (session && loadTokens()) return <Navigate to="/dashboard" replace />;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!role) { setError("Please choose a role first."); setStep(1); return; }
    if (!code.trim() || !name.trim() || !email.trim()) { setError("Fill all required fields."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email."); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    if (!agree) { setError("Please accept the terms to continue."); return; }
    toast.success("Request submitted. Your hospital admin will approve shortly.");
    setTimeout(() => nav("/login"), 600);
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

      <div className="space-y-xs mb-md">
        <div className="text-[11px] font-medium text-text-secondary uppercase tracking-wider">Step {step} of 2</div>
        <h1 className="h1">{step === 1 ? "Choose your role" : "Your account"}</h1>
        <p className="body text-text-secondary">
          {step === 1
            ? "We'll tailor the workspace and permissions to how you work."
            : `Signing up as ${role ? ROLE_LABEL[role] : "—"}.`}
        </p>
      </div>

      {step === 1 && (
        <div className="space-y-sm">
          {ROLE_OPTIONS.map(opt => {
            const Icon = opt.icon;
            const active = role === opt.value;
            return (
              <button key={opt.value} type="button"
                onClick={() => setRole(opt.value)}
                className={`w-full text-left flex items-center gap-md p-sm rounded-md border-2 transition-colors ${
                  active ? "border-primary bg-primary-light/40" : "border-border hover:border-primary/40 bg-background"
                }`}
              >
                <div className={`h-10 w-10 shrink-0 rounded-md flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-background-grey text-text-secondary"}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{ROLE_LABEL[opt.value]}</div>
                  <div className="text-xs text-text-secondary">{opt.tagline}</div>
                </div>
                {active && <CheckCircle2 className="h-5 w-5 text-primary shrink-0" />}
              </button>
            );
          })}
          {error && <FormAlert>{error}</FormAlert>}
          <Button onClick={() => role ? (setError(null), setStep(2)) : setError("Please choose a role.")} className="w-full h-11 bg-primary hover:bg-primary/90 mt-md">
            Continue
          </Button>
          <div className="text-center text-sm text-text-secondary mt-md">
            Already have access? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </div>
      )}

      {step === 2 && (
        <form onSubmit={submit} className="space-y-md">
          <div className="space-y-xs">
            <Label htmlFor="hcode">Hospital code</Label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input id="hcode" className="pl-9 h-11" placeholder="Hospital code" value={code} onChange={e => setCode(e.target.value)} autoComplete="organization" />
            </div>
          </div>
          <div className="space-y-xs">
            <Label htmlFor="name">Full name</Label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input id="name" className="pl-9 h-11" placeholder="Dr. Jane Doe" value={name} onChange={e => setName(e.target.value)} />
            </div>
          </div>
          <div className="space-y-xs">
            <Label htmlFor="email">Work email</Label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input id="email" type="email" className="pl-9 h-11" placeholder="you@hospital.med" value={email} onChange={e => setEmail(e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-sm">
            <div className="space-y-xs">
              <Label htmlFor="pw">Password</Label>
              <div className="relative">
                <Input id="pw" type={showPw ? "text" : "password"} className="pr-10 h-11" value={pw} onChange={e => setPw(e.target.value)} />
                <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
                  {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="pw2">Confirm</Label>
              <Input id="pw2" type={showPw ? "text" : "password"} className="h-11" value={pw2} onChange={e => setPw2(e.target.value)} />
            </div>
          </div>
          <label className="flex items-start gap-sm text-xs text-text-secondary cursor-pointer select-none">
            <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
            <span>I agree to the <a href="#" className="text-primary hover:underline">Terms</a> and confirm I'm authorised to access patient records at this hospital.</span>
          </label>
          {error && <FormAlert>{error}</FormAlert>}
          <div className="flex gap-sm">
            <Button type="button" variant="outline" onClick={() => setStep(1)} className="h-11">Back</Button>
            <Button type="submit" className="flex-1 h-11 bg-primary hover:bg-primary/90">
              <CheckCircle2 className="h-4 w-4 mr-2" /> Request access
            </Button>
          </div>
          <div className="text-center text-sm text-text-secondary">
            Already have access? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
          </div>
        </form>
      )}
    </AuthShell>
  );
}
