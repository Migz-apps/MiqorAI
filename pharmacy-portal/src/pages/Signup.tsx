import { useState } from "react";
import { Link } from "react-router-dom";
import { Pill, CheckCircle2 } from "lucide-react";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { Label } from "@miqorai/ui/label";
import { FormAlert } from "@/components/shared/FormAlert";
import { AuthShell } from "@/components/auth/AuthShell";
import { ApiError, submitOnboardingRequest } from "@/lib/api/client";

export default function Signup() {
  const [orgName, setOrgName] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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
    setSubmitting(true);
    try {
      await submitOnboardingRequest({
        type: "pharmacy",
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
        <div className="h-9 w-9 rounded-md bg-pharmacy flex items-center justify-center">
          <Pill className="h-5 w-5 text-pharmacy-foreground" />
        </div>
        <div>
          <div className="text-sm font-semibold">MiqorAI</div>
          <div className="text-[11px] text-text-secondary">Pharmacy Portal</div>
        </div>
      </div>

      {submitted ? (
        <div className="space-y-md text-center py-lg">
          <div className="mx-auto h-12 w-12 rounded-full bg-success/15 text-success flex items-center justify-center">
            <CheckCircle2 className="h-6 w-6" />
          </div>
          <h1 className="h1">Request submitted</h1>
          <p className="body text-text-secondary">
            An administrator will review your pharmacy's onboarding request.
            You'll receive an email once it is approved.
          </p>
          <Button asChild variant="outline" className="h-11">
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      ) : (
        <>
          <div className="space-y-xs mb-lg">
            <h1 className="h1">Onboard your pharmacy</h1>
            <p className="body text-text-secondary">
              Submit an onboarding request. An administrator reviews every request before access is granted.
            </p>
          </div>

          <form className="space-y-md" onSubmit={submit}>
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label htmlFor="org">Pharmacy name</Label>
                <Input id="org" className="h-11" placeholder="GoodLife — Westlands" value={orgName} onChange={e => setOrgName(e.target.value)} autoComplete="organization" />
              </div>
              <div className="space-y-xs">
                <Label htmlFor="contact">Contact name</Label>
                <Input id="contact" className="h-11" placeholder="Jane Doe" value={contactName} onChange={e => setContactName(e.target.value)} autoComplete="name" />
              </div>
            </div>
            <div className="space-y-xs">
              <Label htmlFor="email">Manager email</Label>
              <Input id="email" type="email" className="h-11" placeholder="manager@pharmacy.co.ke" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="phone">Phone</Label>
              <Input id="phone" className="h-11" placeholder="+254 …" value={phone} onChange={e => setPhone(e.target.value)} autoComplete="tel" />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="address">Address <span className="text-[10px] text-text-secondary font-normal">· Optional</span></Label>
              <Input id="address" className="h-11" placeholder="Street, city" value={address} onChange={e => setAddress(e.target.value)} autoComplete="street-address" />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label htmlFor="pw">Password</Label>
                <Input id="pw" type="password" className="h-11" value={pw} onChange={e => setPw(e.target.value)} autoComplete="new-password" />
              </div>
              <div className="space-y-xs">
                <Label htmlFor="pw2">Confirm</Label>
                <Input id="pw2" type="password" className="h-11" value={pw2} onChange={e => setPw2(e.target.value)} autoComplete="new-password" />
              </div>
            </div>
            {error && <FormAlert>{error}</FormAlert>}
            <Button type="submit" disabled={submitting} className="w-full h-11 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
              {submitting ? "Submitting…" : "Request onboarding"}
            </Button>
          </form>
        </>
      )}

      <div className="mt-lg text-center text-sm text-text-secondary">
        Already a member? <Link to="/login" className="text-pharmacy font-medium hover:underline">Sign in</Link>
      </div>
    </AuthShell>
  );
}
