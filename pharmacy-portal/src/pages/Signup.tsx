import { Link } from "react-router-dom";
import { Pill } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/AuthShell";

export default function Signup() {
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
        <h1 className="h1">Onboard your pharmacy</h1>
        <p className="body text-text-secondary">First 100 prescriptions free. No setup fee.</p>
      </div>

      <form className="space-y-md" onSubmit={e => e.preventDefault()}>
        <div className="grid grid-cols-2 gap-sm">
          <div className="space-y-xs">
            <Label>Pharmacy name</Label>
            <Input className="h-11" placeholder="GoodLife — Westlands" />
          </div>
          <div className="space-y-xs">
            <Label>License #</Label>
            <Input className="h-11" placeholder="PPB-12345" />
          </div>
        </div>
        <div className="space-y-xs">
          <Label>Manager email</Label>
          <Input type="email" className="h-11" placeholder="manager@pharmacy.co.ke" />
        </div>
        <div className="space-y-xs">
          <Label>Phone</Label>
          <Input className="h-11" placeholder="+254 …" />
        </div>
        <div className="space-y-xs">
          <Label>Password</Label>
          <Input type="password" className="h-11" />
        </div>
        <Button type="submit" className="w-full h-11 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
          Request onboarding
        </Button>
      </form>

      <div className="mt-lg text-center text-sm text-text-secondary">
        Already a member? <Link to="/login" className="text-pharmacy font-medium hover:underline">Sign in</Link>
      </div>
    </AuthShell>
  );
}
