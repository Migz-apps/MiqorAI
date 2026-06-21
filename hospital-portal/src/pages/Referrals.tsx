import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Send } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { DEPARTMENTS, ICD11_CODES, PATIENTS, REFERRALS } from "@/lib/mockData";
import type { Referral } from "@/lib/types";
import { toast } from "sonner";

export default function Referrals() {
  const [referrals, setReferrals] = useState<Referral[]>(REFERRALS);
  const [patientId, setPatientId] = useState<string>(PATIENTS[0].id);
  const [referTo, setReferTo] = useState<string>("Cardiology");
  const [urgency, setUrgency] = useState<"Routine"|"Urgent"|"Emergency">("Routine");
  const [icd, setIcd] = useState<string>("");
  const [reason, setReason] = useState("");

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) { toast.error("Reason is required"); return; }
    const r: Referral = {
      id: `R${Date.now()}`, patientId, referFrom: "General", referTo, urgency,
      icd11: icd || undefined, reason, date: new Date().toISOString().slice(0,10), status: "pending",
    };
    setReferrals([r, ...referrals]);
    toast.success(`Referral sent to ${referTo}`);
    setReason("");
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
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PATIENTS.map(p => <SelectItem key={p.id} value={p.id}>{p.name} ({p.id})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-sm">
                <div className="space-y-xs">
                  <Label>Refer to</Label>
                  <Select value={referTo} onValueChange={setReferTo}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                      <SelectItem value="External hospital">External hospital</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-xs">
                  <Label>Urgency</Label>
                  <Select value={urgency} onValueChange={v => setUrgency(v as any)}>
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
                    {ICD11_CODES.map(c => <SelectItem key={c.code} value={c.code}>{c.code} — {c.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-xs">
                <Label>Reason</Label>
                <Textarea rows={3} value={reason} onChange={e => setReason(e.target.value)} placeholder="Clinical reason for referral…" />
              </div>
              <Button type="submit" className="w-full bg-[hsl(var(--clinical-accent))] hover:bg-[hsl(var(--clinical-accent))]/90 text-white">
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
              {referrals.map(r => {
                const p = PATIENTS.find(x => x.id === r.patientId);
                return (
                  <div key={r.id} className="px-md py-sm">
                    <div className="flex items-center justify-between">
                      <div className="text-sm font-medium">{p?.name}</div>
                      <Badge variant="outline" className={
                        r.urgency === "Emergency" ? "border-error/30 text-error bg-error/10" :
                        r.urgency === "Urgent" ? "border-secondary/30 text-secondary bg-secondary/10" :
                        "border-success/30 text-success bg-success/10"
                      }>{r.urgency}</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">{r.referFrom} → {r.referTo} · {r.date}</div>
                    <div className="text-xs mt-1">{r.reason}</div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
