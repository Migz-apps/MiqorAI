import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/miqorai/QRScanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ScanLine, UserPlus, AlertTriangle, CheckCircle2 } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";
import { mapDepartment, mapPatientFromApi } from "@/lib/mappers";
import { useWaitlist } from "@/store/waitlist";
import { useSync } from "@/store/sync";
import type { Department, Priority } from "@/lib/types";
import { toast } from "@/lib/notify";

export default function Checkin() {
  const nav = useNavigate();
  const add = useWaitlist(s => s.add);
  const entries = useWaitlist(s => s.entries);
  const enqueue = useSync(s => s.enqueue);

  const [patientId, setPatientId] = useState<string | null>(null);
  const [department, setDepartment] = useState<Department>("General");
  const [priority, setPriority] = useState<Priority>("normal");
  const [reason, setReason] = useState("");
  const [checkingIn, setCheckingIn] = useState(false);

  const { data: patient } = useQuery({
    queryKey: ["hospital", "patient", patientId],
    queryFn: async () => mapPatientFromApi(await hospitalApi.patient(patientId!)),
    enabled: !!patientId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["hospital", "departments"],
    queryFn: async () => (await hospitalApi.departments()).map(d => mapDepartment(d as Record<string, unknown>)),
  });

  const alreadyHere = patient ? entries.find(e => e.patientId === patient.id && e.status !== "completed" && e.status !== "no-show") : null;

  const checkIn = async () => {
    if (!patient) return;
    if (alreadyHere) {
      toast.error(`Already checked in at ${alreadyHere.checkInTime}`);
      return;
    }
    setCheckingIn(true);
    try {
      const entry = await add({
        patientId: patient.id, department, priority, status: "waiting", reason: reason || undefined,
      });
      enqueue({ type: "check-in", patientName: patient.name });
      toast.success(`${patient.name} checked in to ${department}`);
      nav(`/stickers?visit=${entry.id}`);
    } catch {
      toast.error("Check-in failed.");
    } finally {
      setCheckingIn(false);
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1">Check-in desk</h1>
        <p className="body text-text-secondary">Scan a MiqorAI QR or look up a patient by phone — under 10 seconds.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-lg">
        <Card className="lg:col-span-3">
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <ScanLine className="h-5 w-5 text-primary" /> 1. Identify patient
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QRScanner onScanned={(id) => { setPatientId(id); }} />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3">2. Check-in details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            {!patient ? (
              <div className="rounded-md border border-dashed p-md text-center text-sm text-text-secondary">
                Identify a patient first using the scanner.
              </div>
            ) : (
              <div className="rounded-md bg-role-reception-light border border-[hsl(var(--reception-accent))]/20 p-md space-y-1">
                <div className="text-xs role-reception font-medium">PATIENT</div>
                <div className="font-semibold">{patient.name}</div>
                <div className="text-xs text-text-secondary">
                  {patient.id.slice(0, 8)}… · DOB {patient.dob} · {patient.bloodType}
                </div>
                {patient.allergies.length > 0 && (
                  <div className="text-xs flex items-center gap-1 text-error mt-1">
                    <AlertTriangle className="h-3 w-3" /> Allergies: {patient.allergies.map(a => a.name).join(", ")}
                  </div>
                )}
                {alreadyHere && (
                  <div className="text-xs text-secondary mt-1">⚠ Already on waitlist since {alreadyHere.checkInTime}</div>
                )}
              </div>
            )}

            <div className="space-y-xs">
              <Label>Department</Label>
              <Select value={department} onValueChange={v => setDepartment(v as Department)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {departments.filter(d => d.isActive).map(d => (
                    <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                  ))}
                  {departments.length === 0 && <SelectItem value="General">General</SelectItem>}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-xs">
              <Label>Priority</Label>
              <div className="grid grid-cols-3 gap-xs">
                {(["normal","urgent","emergency"] as Priority[]).map(p => (
                  <button key={p} type="button" onClick={() => setPriority(p)}
                    className={`h-10 rounded-md border text-sm font-medium capitalize transition-colors ${
                      priority === p
                        ? p === "emergency" ? "bg-error text-error-foreground border-error"
                        : p === "urgent" ? "bg-secondary text-secondary-foreground border-secondary"
                        : "bg-success text-success-foreground border-success"
                        : "bg-background hover:bg-background-grey"
                    }`}
                  >{p}</button>
                ))}
              </div>
            </div>

            <div className="space-y-xs">
              <Label>Reason (optional)</Label>
              <Input value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. BP follow-up" />
            </div>

            <Button onClick={checkIn} disabled={!patient || !!alreadyHere || checkingIn}
              className="w-full h-11 bg-[hsl(var(--reception-accent))] hover:bg-[hsl(var(--reception-accent))]/90 text-white">
              <CheckCircle2 className="h-4 w-4 mr-2" /> {checkingIn ? "Checking in…" : "Check in & print sticker"}
            </Button>

            <div className="text-center">
              <button onClick={() => nav("/register")} className="text-xs text-primary hover:underline inline-flex items-center gap-1">
                <UserPlus className="h-3 w-3" /> New patient? Register manually
              </button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Today's queue</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {entries.slice(0, 6).map(e => (
              <div key={e.id} className="px-md py-sm flex items-center gap-md">
                <div className="text-xs text-text-secondary w-12">{e.checkInTime}</div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{e.patientName ?? e.patientId}</div>
                  <div className="text-xs text-text-secondary">{e.department} · {e.reason || "—"}</div>
                </div>
                <Badge variant="outline" className="capitalize">{e.status.replace("-", " ")}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
