import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/store/auth";
import { HOSPITAL } from "@/lib/mockData";
import { Shield, Bell, Building2, KeyRound, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Settings() {
  const session = useAuth(s => s.session)!;
  const logout = useAuth(s => s.logout);
  const nav = useNavigate();
  const [name, setName] = useState(session.name);
  const [email, setEmail] = useState(`${session.staffId.toLowerCase()}@hospital.med`);
  const [notifVisits, setNotifVisits] = useState(true);
  const [notifSync, setNotifSync] = useState(true);
  const [notifDigest, setNotifDigest] = useState(false);
  const [twoFA, setTwoFA] = useState(false);

  return (
    <div className="space-y-lg max-w-[900px] mx-auto">
      <div>
        <h1 className="h1">Settings</h1>
        <p className="body text-text-secondary">Manage your account, security, and preferences.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Shield className="h-4 w-4 text-primary" /> Profile</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <div className="flex items-center gap-md">
            <div className="h-14 w-14 rounded-full bg-primary-light text-primary flex items-center justify-center text-lg font-semibold">
              {session.name.split(" ").map(n => n[0]).slice(0,2).join("")}
            </div>
            <div>
              <div className="font-medium">{session.name}</div>
              <Badge variant="outline" className="capitalize mt-1">{session.role}</Badge>
            </div>
          </div>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="space-y-xs"><Label>Full name</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
            <div className="space-y-xs"><Label>Email</Label><Input value={email} onChange={e => setEmail(e.target.value)} /></div>
          </div>
          <div className="flex justify-end">
            <Button onClick={() => toast.success("Profile updated")} className="bg-primary hover:bg-primary/90">Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><KeyRound className="h-4 w-4 text-primary" /> Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <Row label="Two-factor authentication" desc="Require a code from your authenticator app on sign-in.">
            <Switch checked={twoFA} onCheckedChange={v => { setTwoFA(v); toast.success(v ? "2FA enabled" : "2FA disabled"); }} />
          </Row>
          <Separator />
          <Row label="Active session" desc={`Signed in ${new Date(session.loggedInAt).toLocaleString()} · auto sign-out after 8h`}>
            <Button variant="outline" size="sm" onClick={() => { logout(); nav("/login"); }}><LogOut className="h-4 w-4 mr-1" /> Sign out</Button>
          </Row>
          <Separator />
          <Row label="Change password" desc="You'll be sent a confirmation email.">
            <Button variant="outline" size="sm" onClick={() => toast.success("Password reset email sent")}>Send link</Button>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Bell className="h-4 w-4 text-primary" /> Notifications</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <Row label="New patient check-ins" desc="Get notified when a patient is checked in.">
            <Switch checked={notifVisits} onCheckedChange={setNotifVisits} />
          </Row>
          <Separator />
          <Row label="Sync conflicts" desc="Alert me when offline records conflict on sync.">
            <Switch checked={notifSync} onCheckedChange={setNotifSync} />
          </Row>
          <Separator />
          <Row label="Daily digest" desc="A morning summary of your patient load.">
            <Switch checked={notifDigest} onCheckedChange={setNotifDigest} />
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Building2 className="h-4 w-4 text-primary" /> Hospital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-sm text-sm">
          <Row label="Hospital" desc={HOSPITAL.name}><Badge variant="outline" className="font-mono">{session.hospitalCode}</Badge></Row>
          <Separator />
          <Row label="Location" desc={HOSPITAL.city}><span className="text-xs text-text-secondary">Read-only</span></Row>
        </CardContent>
      </Card>
    </div>
  );
}

const Row = ({ label, desc, children }: { label: string; desc: string; children: React.ReactNode }) => (
  <div className="flex items-center justify-between gap-md">
    <div className="min-w-0">
      <div className="text-sm font-medium">{label}</div>
      <div className="text-xs text-text-secondary">{desc}</div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);
