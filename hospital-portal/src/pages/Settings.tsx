import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@miqorai/ui/card";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { Label } from "@miqorai/ui/label";
import { Separator } from "@miqorai/ui/separator";
import { Badge } from "@miqorai/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@miqorai/ui/dialog";
import { useAuth } from "@/store/auth";
import { hospitalApi } from "@/lib/api/hospital";
import { ApiError, changePasswordApi } from "@/lib/api/client";
import { Shield, Building2, KeyRound, LogOut } from "lucide-react";
import { toast } from "@/lib/notify";
import { useNavigate } from "react-router-dom";
import { formatDateTime } from "@miqorai/api-client/format";

export default function Settings() {
  const session = useAuth(s => s.session)!;
  const logout = useAuth(s => s.logout);
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const isAdmin = session.role === "admin";

  const { data: hospitalSettings } = useQuery({
    queryKey: ["hospital", "settings"],
    queryFn: () => hospitalApi.settings(),
  });

  const [hospitalName, setHospitalName] = useState("");
  const [hospitalCity, setHospitalCity] = useState("");

  useEffect(() => {
    if (!hospitalSettings) return;
    setHospitalName(String(hospitalSettings.name ?? session.hospitalName ?? ""));
    setHospitalCity(String(hospitalSettings.city ?? hospitalSettings.location ?? ""));
  }, [hospitalSettings, session.hospitalName]);

  const saveHospital = useMutation({
    mutationFn: () =>
      hospitalApi.updateSettings({
        ...(hospitalSettings ?? {}),
        name: hospitalName.trim(),
        city: hospitalCity.trim(),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["hospital", "settings"] });
      toast.success("Hospital settings saved");
    },
    onError: (err) => toast.error(err instanceof ApiError ? err.message : "Could not save settings"),
  });

  // Change-password dialog state
  const [pwOpen, setPwOpen] = useState(false);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [newPw2, setNewPw2] = useState("");
  const [pwError, setPwError] = useState<string | null>(null);
  const [pwSaving, setPwSaving] = useState(false);

  const closePwDialog = () => {
    setPwOpen(false);
    setCurrentPw("");
    setNewPw("");
    setNewPw2("");
    setPwError(null);
  };

  const submitPasswordChange = async () => {
    setPwError(null);
    if (newPw.length < 8) { setPwError("New password must be at least 8 characters."); return; }
    if (newPw !== newPw2) { setPwError("New passwords do not match."); return; }
    setPwSaving(true);
    try {
      await changePasswordApi(currentPw, newPw);
      closePwDialog();
      toast.success("Password changed. Other sessions were signed out.");
    } catch (err) {
      setPwError(err instanceof ApiError ? err.message : "Could not change the password.");
    } finally {
      setPwSaving(false);
    }
  };

  return (
    <div className="space-y-lg max-w-[900px] mx-auto">
      <div>
        <h1 className="h1">Settings</h1>
        <p className="body text-text-secondary">Manage your account, security, and hospital details.</p>
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
              <div className="text-xs text-text-secondary">{session.email ?? "—"}</div>
              <Badge variant="outline" className="capitalize mt-1">{session.role}</Badge>
            </div>
          </div>
          <p className="text-xs text-text-secondary">
            Your name and email come from your staff account. Ask your hospital admin to update them.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><KeyRound className="h-4 w-4 text-primary" /> Security</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <Row label="Active session" desc={`Signed in ${formatDateTime(session.loggedInAt)} · auto sign-out after 8h`}>
            <Button variant="outline" size="sm" onClick={async () => { await logout(); nav("/login"); }}><LogOut className="h-4 w-4 mr-1" /> Sign out</Button>
          </Row>
          <Separator />
          <Row label="Change password" desc="Changing it signs out your other sessions.">
            <Button variant="outline" size="sm" onClick={() => setPwOpen(true)}>Change password</Button>
          </Row>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><Building2 className="h-4 w-4 text-primary" /> Hospital</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          <Row label="Hospital code" desc="Assigned by MiqorAI — used by staff to sign in.">
            <Badge variant="outline" className="font-mono">{session.hospitalCode}</Badge>
          </Row>
          <Separator />
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-md">
            <div className="space-y-xs">
              <Label htmlFor="settings-hospital-name">Hospital name</Label>
              <Input id="settings-hospital-name" value={hospitalName} onChange={e => setHospitalName(e.target.value)} disabled={!isAdmin} />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="settings-hospital-city">City</Label>
              <Input id="settings-hospital-city" value={hospitalCity} onChange={e => setHospitalCity(e.target.value)} disabled={!isAdmin} />
            </div>
          </div>
          {isAdmin ? (
            <div className="flex justify-end">
              <Button
                onClick={() => saveHospital.mutate()}
                disabled={saveHospital.isPending}
                className="bg-primary hover:bg-primary/90"
              >
                {saveHospital.isPending ? "Saving…" : "Save changes"}
              </Button>
            </div>
          ) : (
            <p className="text-xs text-text-secondary">
              Only hospital administrators can change these settings.
            </p>
          )}
        </CardContent>
      </Card>

      <Dialog open={pwOpen} onOpenChange={(o) => { if (!o) closePwDialog(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Enter your current password and choose a new one. Other sessions will be signed out.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <Label htmlFor="current-pw">Current password</Label>
              <Input id="current-pw" type="password" value={currentPw} onChange={e => setCurrentPw(e.target.value)} autoComplete="current-password" />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="new-pw">New password</Label>
              <Input id="new-pw" type="password" value={newPw} onChange={e => setNewPw(e.target.value)} autoComplete="new-password" />
            </div>
            <div className="space-y-xs">
              <Label htmlFor="new-pw2">Confirm new password</Label>
              <Input id="new-pw2" type="password" value={newPw2} onChange={e => setNewPw2(e.target.value)} autoComplete="new-password" />
            </div>
            {pwError && <p role="alert" className="text-xs text-error">{pwError}</p>}
          </div>
          <DialogFooter className="gap-sm">
            <Button variant="outline" onClick={closePwDialog}>Cancel</Button>
            <Button
              className="bg-primary hover:bg-primary/90"
              disabled={pwSaving || !currentPw || !newPw || !newPw2}
              onClick={() => void submitPasswordChange()}
            >
              {pwSaving ? "Changing…" : "Change password"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
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
