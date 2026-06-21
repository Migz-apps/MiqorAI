import { useState } from "react";
import { Save, CheckCircle2, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ICD11_CODES } from "@/lib/mockData";
import type { Patient } from "@/lib/types";
import { useSync } from "@/store/sync";
import { toast } from "sonner";
import { PrescriptionBuilder } from "./PrescriptionBuilder";
import { useAuth, can } from "@/store/auth";

export const AddVisitForm = ({ patient }: { patient: Patient }) => {
  const session = useAuth(s => s.session)!;
  const enqueue = useSync(s => s.enqueue);
  const [chief, setChief] = useState("");
  const [duration, setDuration] = useState("3 days");
  const [severity, setSeverity] = useState("Moderate");
  const [bp, setBp] = useState(""); const [hr, setHr] = useState(""); const [temp, setTemp] = useState(""); const [spo2, setSpo2] = useState("");
  const [diagnoses, setDiagnoses] = useState<{code:string;label:string}[]>([]);
  const [diagSearch, setDiagSearch] = useState("");
  const [labs, setLabs] = useState<string[]>([]);
  const [labInput, setLabInput] = useState("");
  const [notes, setNotes] = useState("");

  const diagMatches = ICD11_CODES.filter(c => `${c.code} ${c.label}`.toLowerCase().includes(diagSearch.toLowerCase())).slice(0,5);

  const saveDraft = () => {
    localStorage.setItem(`draft-visit-${patient.id}`, JSON.stringify({ chief, duration, severity, bp, hr, temp, spo2, diagnoses, labs, notes }));
    toast.success("Draft saved locally");
  };
  const complete = () => {
    if (!chief) { toast.error("Add chief complaint"); return; }
    enqueue({ type: "visit", patientName: patient.name });
    toast.success("Visit completed and queued for sync");
    localStorage.removeItem(`draft-visit-${patient.id}`);
  };

  return (
    <div className="space-y-lg">
      {/* Section 1: Chief Complaint */}
      <section className="space-y-sm p-md rounded-md border bg-card">
        <h3 className="h3">1. Chief complaint</h3>
        <Textarea placeholder="What is the patient here for?" value={chief} onChange={e => setChief(e.target.value)} rows={3} />
        <div className="grid grid-cols-2 gap-sm">
          <div className="space-y-xs">
            <Label>Duration</Label>
            <Select value={duration} onValueChange={setDuration}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Today","1 day","3 days","1 week","2 weeks","1 month","3+ months"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-xs">
            <Label>Severity</Label>
            <Select value={severity} onValueChange={setSeverity}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Mild","Moderate","Severe","Critical"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Section 2: Vitals */}
      {can(session.role, "recordVitals") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">2. Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
            <div className="space-y-xs"><Label>BP (mmHg)</Label><Input placeholder="120/80" value={bp} onChange={e => setBp(e.target.value)} /></div>
            <div className="space-y-xs"><Label>HR (bpm)</Label><Input placeholder="72" value={hr} onChange={e => setHr(e.target.value)} /></div>
            <div className="space-y-xs"><Label>Temp (°C)</Label><Input placeholder="36.8" value={temp} onChange={e => setTemp(e.target.value)} /></div>
            <div className="space-y-xs"><Label>SpO₂ (%)</Label><Input placeholder="98" value={spo2} onChange={e => setSpo2(e.target.value)} /></div>
          </div>
        </section>
      )}

      {/* Section 3: Diagnosis */}
      {can(session.role, "addDiagnosis") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">3. Diagnosis (ICD-11)</h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input className="pl-9" placeholder="Search ICD-11 code or term…" value={diagSearch} onChange={e => setDiagSearch(e.target.value)} />
          </div>
          {diagSearch && (
            <div className="border rounded-md divide-y">
              {diagMatches.map(c => (
                <button key={c.code} type="button" onClick={() => { setDiagnoses([...diagnoses, c]); setDiagSearch(""); }} className="w-full text-left px-sm py-xs hover:bg-primary-light/40 text-sm">
                  <span className="font-mono text-xs text-primary">{c.code}</span> — {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-xs">
            {diagnoses.map((d, i) => (
              <Badge key={i} className="bg-primary-light text-primary border-primary/20 hover:bg-primary-light gap-1">
                {d.code} — {d.label}
                <button onClick={() => setDiagnoses(diagnoses.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </section>
      )}

      {/* Section 4: Prescriptions */}
      {can(session.role, "prescribe") && (
        <section className="space-y-sm">
          <h3 className="h3">4. Prescriptions</h3>
          <PrescriptionBuilder patient={patient} />
        </section>
      )}

      {/* Section 5: Lab orders */}
      {can(session.role, "orderLabs") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">5. Lab orders</h3>
          <div className="flex gap-sm">
            <Input placeholder="e.g. CBC, Lipid Panel, HbA1c" value={labInput} onChange={e => setLabInput(e.target.value)} />
            <Button type="button" variant="outline" onClick={() => { if (labInput.trim()) { setLabs([...labs, labInput.trim()]); setLabInput(""); } }}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-xs">
            {labs.map((l, i) => (
              <Badge key={i} variant="outline" className="gap-1">{l}<button onClick={() => setLabs(labs.filter((_, j) => j !== i))}><X className="h-3 w-3" /></button></Badge>
            ))}
          </div>
        </section>
      )}

      {/* Section 6: Notes */}
      <section className="space-y-sm p-md rounded-md border bg-card">
        <h3 className="h3">6. Notes</h3>
        <Textarea placeholder="Clinical notes, observations, follow-up plan…" value={notes} onChange={e => setNotes(e.target.value)} rows={4} />
      </section>

      <div className="flex flex-wrap gap-sm justify-end sticky bottom-0 bg-background-grey/95 backdrop-blur py-sm -mx-md px-md border-t">
        <Button variant="outline" onClick={saveDraft}><Save className="h-4 w-4 mr-2" /> Save draft</Button>
        <Button onClick={complete} className="bg-success hover:bg-success/90 text-success-foreground"><CheckCircle2 className="h-4 w-4 mr-2" /> Complete visit</Button>
      </div>
    </div>
  );
};
