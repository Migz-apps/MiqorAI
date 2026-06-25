import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { hospitalApi, referenceApi } from "@/lib/api/hospital";
import { mapCensusPatient, mapDepartment, mapIcd, mapReferral } from "@/lib/mappers";
import { toast } from "@/lib/notify";

export default function Referrals() {
  const qc = useQueryClient();
  const [patientId, setPatientId] = useState("");
  const [referTo, setReferTo] = useState<string>("Cardiology");
  const [urgency, setUrgency] = useState<"Routine" | "Urgent" | "Emergency">("Routine");
  const [icd, setIcd] = useState<string>("");
  const [reason, setReason] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const { data: referrals = [] } = useQuery({
    queryKey: ["referrals"],
    queryFn: async () => {
      const rows = await hospitalApi.referrals() as Record<string, unknown>[];
      return rows.map(mapReferral);
    },
  });

  const { data: patients = [] } = useQuery({
    queryKey: ["patients", "census", "referrals"],
    queryFn: async () => {
      const rows = await hospitalApi.patientsCensus() as Record<string, unknown>[];
      return rows.map(mapCensusPatient);
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const rows = await hospitalApi.departments() as Record<string, unknown>[];
      return rows.map(mapDepartment);
    },
  });

  const { data: icdCodes = [] } = useQuery({
    queryKey: ["icd", "referrals"],
    queryFn: async () => {
      const rows = await referenceApi.icd() as Record<string, unknown>[];
      return rows.map(mapIcd);
    },
  });

  useEffect(() => {
    if (!patientId && patients[0]) setPatientId(patients[0].id);
  }, [patients, patientId]);

  const patientNames = useMemo(
    () => Object.fromEntries(patients.map((p) => [p.id, p.name])),
    [patients],
  );

  const create = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!patientId) { toast.error("Select a patient"); return; }
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    setSubmitting(true);
    try {
      await hospitalApi.referral({
        patient_id: patientId,
        from_department: "General",
        to_department: referTo === "External hospital" ? "External" : referTo,
        urgency: urgency.toLowerCase(),
        reason: reason.trim(),
        notes: icd ? `ICD: ${icd}` : undefined,
      });
      await qc.invalidateQueries({ queryKey: ["referrals"] });
      toast.success(`Referral sent to ${referTo}`);
      setReason("");
    } catch {
      toast.error("Failed to create referral");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><Send className="h-6 w-6 text-primary" /> Referrals</h1>
        <p className="body text-text-secondary">Send patients to other departments or external hospitals.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">New referral</CardTitle></CardHeader>
          <CardContent>
            <form onSubmit={create} className="space-y-md">
              <div className="space-y-xs">
                <Label>Patient</Label>
                <Select value={patientId} onValueChange={setPatientId}>
                  <SelectTrigger><SelectValue placeholder="Select patient…" /></SelectTrigger>
                  <SelectContent>
                    {patients.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.name} ({p.id.slice(0, 8)}…)</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <Label>Refer to</Label>
                  <Select value={referTo} onValueChange={setReferTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d) => (
                        <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>
                      ))}
                      <SelectItem value="External hospital">External hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-xs">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={(v) => setUrgency(v as typeof urgency)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Routine">Routine</SelectItem>
                      <SelectItem value="Urgent">Urgent</SelectItem>
                      <SelectItem value="Emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-xs">
                <Label>ICD-11 code (optional)</Label>
                <Select value={icd} onValueChange={setIcd}>
                  <SelectTrigger><SelectValue placeholder="Pick a diagnosis…" /></SelectTrigger>
                  <SelectContent>
                    {icdCodes.map((c) => (
                      <SelectItem key={c.code} value={c.code}>{c.code} — {c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-xs">
                <Label>Reason</Label>
                <Textarea rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinical reason for referral…" />
              </div>
              <Button type="submit" disabled={submitting} className="w-full bg-[hsl(var(--clinical-accent))] hover:bg-[hsl(var(--clinical-accent))]/90 text-white">
                <Send className="h-4 w-4 mr-1" /> Send referral + SMS patient
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Recent referrals ({referrals.length})</CardTitle></CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {referrals.length === 0 && <div className="p-lg text-center text-sm text-text-secondary">None yet.</div>}
              {referrals.map((r) => (
                <div key={r.id} className="px-md py-sm">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">{patientNames[r.patientId] ?? r.patientId.slice(0, 8)}</div>
                    <Badge variant="outline" className={
                      r.urgency === "Emergency" ? "border-error/30 text-error bg-error/10" :
                      r.urgency === "Urgent" ? "border-secondary/30 text-secondary bg-secondary/10" :
                      "border-success/30 text-success bg-success/10"
                    }>{r.urgency}</Badge>
                  </div>
                  <div className="text-xs text-text-secondary">{r.referFrom} → {r.referTo} · {r.date}</div>
                  <div className="text-xs mt-1">{r.reason}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
