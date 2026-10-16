import { useState } from "react";
import { Navigate, Link } from "react-router-dom";
import { Building2, User, Mail, Phone, MapPin, Eye, EyeOff, Stethoscope, CheckCircle2 } from "lucide-react";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { Label } from "@miqorai/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { useAuth } from "@/store/auth";
import { AuthShell } from "@/components/auth/AuthShell";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { ApiError, hasSession, submitOnboardingRequest } from "@/lib/api/client";
import { AuthLoading } from "@/components/shared/AuthLoading";

export default function Signup() {
  const hydrated = useAuthHydrated();
  const session = useAuth(s => s.session);
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [agree, setAgree] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!hydrated) return <AuthLoading />;
  if (session && hasSession()) return <Navigate to="/dashboard" replace />;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!orgName.trim() || !contactName.trim() || !email.trim() || !phone.trim()) {
      setError("Fill all required fields.");
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setError("Enter a valid email."); return; }
    if (pw.length < 8) { setError("Password must be at least 8 characters."); return; }
    if (pw !== pw2) { setError("Passwords do not match."); return; }
    if (!agree) { setError("Please accept the terms to continue."); return; }
    setSubmitting(true);
    try {
      await submitOnboardingRequest({
        type: "hospital",
        organization_name: orgName.trim(),
        contact_name: contactName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        ...(address.trim() ? { address: address.trim() } : {}),
        password: pw,
      });
      setSubmitted(true);
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError("A request or account with this email already exists.");
      } else {
        setError(err instanceof ApiError ? err.message : "Could not submit your request. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
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

      {submitted ? (
        <div className="space-y-md text-center py-lg">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="h1">Request submitted</h1>
          <p className="body text-text-secondary">
            An administrator will review your hospital's onboarding request.
            You'll receive an email once it is approved.
          </p>
          <Button asChild variant="outline" className="h-11">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-xs mb-md">
            <h1 className="h1">Register your hospital</h1>
            <p className="body text-text-secondary">
              Submit an onboarding request. An administrator reviews every request before access is granted.
            </p>
          </div>

          <form onSubmit={submit} className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="org">Hospital name</Label>
              <div className="relative">
                <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="org" className="pl-9 h-11" placeholder="St. Mary's Hospital" value={orgName} onChange={e => setOrgName(e.target.value)} autoComplete="organization" />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="name">Contact name</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="name" className="pl-9 h-11" placeholder="Dr. Jane Doe" value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="email">Work email</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="email" type="email" className="pl-9 h-11" placeholder="you@hospital.med" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="phone">Phone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="phone" className="pl-9 h-11" placeholder="+254 …" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="address">Address <span className="text-[10px] text-text-secondary font-normal">· Optional</span></Label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                <Input id="address" className="pl-9 h-11" placeholder="Street, city" value={address} onChange={e => setAddress(e.target.value)} autoComplete="street-address" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label htmlFor="pw">Password</Label>
                <div className="relative">
                  <Input id="pw" type={showPw ? "text" : "password"} className="pr-10 h-11" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
                  <button type="button" onClick={() => setShowPw(s => !s)} className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary hover:text-foreground">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-xs">
                <Label htmlFor="pw2">Confirm</Label>
                <Input id="pw2" type={showPw ? "text" : "password"} className="h-11" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            <label className="flex items-start gap-sm text-xs text-text-secondary cursor-pointer select-none">
              <input type="checkbox" checked={agree} onChange={e => setAgree(e.target.checked)} className="mt-0.5 h-4 w-4 rounded border-border accent-primary" />
              <span>I agree to the <a href="#" className="text-primary hover:underline">Terms</a> and confirm I'm authorised to request access for this hospital.</span>
            </label>
            {error && <FormAlert>{error}</FormAlert>}
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-primary hover:bg-primary/90">
              <CheckCircle2 className="h-4 w-4 mr-2" /> {submitting ? "Submitting…" : "Request access"}
            </Button>
            <div className="text-center text-sm text-text-secondary">
              Already have access? <Link to="/login" className="text-primary font-medium hover:underline">Sign in</Link>
            </div>
          </form>
        </>
      )}
    </AuthShell>
  );
}
