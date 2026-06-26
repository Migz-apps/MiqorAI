import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, CheckCircle2, Plus, X, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { referenceApi, hospitalApi } from "@/lib/api/hospital";
import { mapIcd } from "@/lib/mappers";
import type { Patient, PriorLabMatch, VisitDraftState } from "@/lib/types";
import { useSync } from "@/store/sync";
import { toast } from "@/lib/notify";
import { PrescriptionBuilder } from "./PrescriptionBuilder";
import { LabDuplicateDialog } from "./LabDuplicateDialog";
import { useAuth, can } from "@/store/auth";

type Props = {
  patient: Patient;
  draft: VisitDraftState;
  onDraftChange: (draft: VisitDraftState) => void;
};

export const AddVisitForm = ({ patient, draft, onDraftChange }: Props) => {
  const session = useAuth(s => s.session)!;
  const enqueue = useSync(s => s.enqueue);

  const update = (patch: Partial<VisitDraftState>) => onDraftChange({ ...draft, ...patch });

  const [diagSearch, setDiagSearch] = useState("");
  const [labInput, setLabInput] = useState("");
  const [pendingLab, setPendingLab] = useState<string | null>(null);
  const [priorLab, setPriorLab] = useState<PriorLabMatch | null>(null);

  const { data: icdMatches = [] } = useQuery({
    queryKey: ["icd", diagSearch],
    queryFn: async () => {
      const rows = await referenceApi.icd(diagSearch || undefined) as Record<string, unknown>[];
      return rows.map(mapIcd);
    },
    enabled: diagSearch.length > 0,
  });

  const diagMatches = icdMatches.slice(0, 5);

  useEffect(() => {
    const saved = localStorage.getItem(`draft-visit-${patient.id}`);
    if (!saved) return;
    try {
      const parsed = JSON.parse(saved) as Partial<VisitDraftState>;
      onDraftChange({
        ...draft,
        ...parsed,
        diagnoses: parsed.diagnoses ?? draft.diagnoses,
        labs: parsed.labs ?? draft.labs,
      });
    } catch { /* ignore corrupt draft */ }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  const saveDraft = () => {
    localStorage.setItem(`draft-visit-${patient.id}`, JSON.stringify(draft));
    toast.success("Draft saved locally");
  };

  const complete = () => {
    if (!draft.chief) { toast.error("Add chief complaint"); return; }
    enqueue({ type: "visit", patientName: patient.name });
    toast.success("Visit completed and queued for sync");
    localStorage.removeItem(`draft-visit-${patient.id}`);
    onDraftChange({
      chief: "",
      duration: "3 days",
      severity: "Moderate",
      bp: "",
      hr: "",
      temp: "",
      spo2: "",
      height: "",
      weight: "",
      diagnoses: [],
      labs: [],
      notes: "",
    });
  };

  const addLabToList = (name: string) => {
    if (!name.trim()) return;
    if (!draft.labs.some((l) => l.toLowerCase() === name.trim().toLowerCase())) {
      update({ labs: [...draft.labs, name.trim()] });
    }
    setLabInput("");
    setPendingLab(null);
    setPriorLab(null);
  };

  const tryAddLab = async () => {
    const name = labInput.trim();
    if (!name) return;

    try {
      const res = await hospitalApi.labPrior(patient.id, name) as {
        found: boolean;
        prior: PriorLabMatch | null;
      };
      if (res.found && res.prior) {
        setPendingLab(name);
        setPriorLab(res.prior);
        return;
      }
    } catch {
      // If lookup fails, still allow ordering
    }
    addLabToList(name);
  };

  return (
    <div className="space-y-lg">
      <section className="space-y-sm p-md rounded-md border bg-card">
        <h3 className="h3">1. Chief complaint</h3>
        <Textarea
          placeholder="What is the patient here for?"
          value={draft.chief}
          onChange={e => update({ chief: e.target.value })}
          rows={3}
        />
        <div className="grid grid-cols-2 gap-sm">
          <div className="space-y-xs">
            <Label>Duration</Label>
            <Select value={draft.duration} onValueChange={v => update({ duration: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Today","1 day","3 days","1 week","2 weeks","1 month","3+ months"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-xs">
            <Label>Severity</Label>
            <Select value={draft.severity} onValueChange={v => update({ severity: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["Mild","Moderate","Severe","Critical"].map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {can(session.role, "recordVitals") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">2. Vitals</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-sm">
            <div className="space-y-xs"><Label>BP (mmHg)</Label><Input placeholder="120/80" value={draft.bp} onChange={e => update({ bp: e.target.value })} /></div>
            <div className="space-y-xs"><Label>HR (bpm)</Label><Input placeholder="72" value={draft.hr} onChange={e => update({ hr: e.target.value })} /></div>
            <div className="space-y-xs"><Label>Temp (°C)</Label><Input placeholder="36.8" value={draft.temp} onChange={e => update({ temp: e.target.value })} /></div>
            <div className="space-y-xs"><Label>SpO₂ (%)</Label><Input placeholder="98" value={draft.spo2} onChange={e => update({ spo2: e.target.value })} /></div>
            <div className="space-y-xs"><Label>Height (cm)</Label><Input placeholder="165" value={draft.height} onChange={e => update({ height: e.target.value })} /></div>
            <div className="space-y-xs"><Label>Weight (kg)</Label><Input placeholder="70" value={draft.weight} onChange={e => update({ weight: e.target.value })} /></div>
          </div>
        </section>
      )}

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
                <button
                  key={c.code}
                  type="button"
                  onClick={() => {
                    update({ diagnoses: [...draft.diagnoses, c] });
                    setDiagSearch("");
                  }}
                  className="w-full text-left px-sm py-xs hover:bg-primary-light/40 text-sm"
                >
                  <span className="font-mono text-xs text-primary">{c.code}</span> — {c.label}
                </button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-xs">
            {draft.diagnoses.map((d, i) => (
              <Badge key={i} className="bg-primary-light text-primary border-primary/20 hover:bg-primary-light gap-1">
                {d.code} — {d.label}
                <button onClick={() => update({ diagnoses: draft.diagnoses.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </section>
      )}

      {can(session.role, "prescribe") && (
        <section className="space-y-sm">
          <h3 className="h3">4. Prescriptions</h3>
          <PrescriptionBuilder patient={patient} />
        </section>
      )}

      {can(session.role, "orderLabs") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">5. Lab orders</h3>
          <div className="flex gap-sm">
            <Input
              placeholder="e.g. CBC, Lipid Panel, HbA1c"
              value={labInput}
              onChange={e => setLabInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void tryAddLab(); } }}
            />
            <Button type="button" variant="outline" onClick={() => void tryAddLab()}>
              <Plus className="h-4 w-4 mr-1" /> Add
            </Button>
          </div>
          <div className="flex flex-wrap gap-xs">
            {draft.labs.map((l, i) => (
              <Badge key={i} variant="outline" className="gap-1">
                {l}
                <button onClick={() => update({ labs: draft.labs.filter((_, j) => j !== i) })}><X className="h-3 w-3" /></button>
              </Badge>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-sm p-md rounded-md border bg-card">
        <h3 className="h3">6. Notes</h3>
        <Textarea placeholder="Clinical notes, observations, follow-up plan…" value={draft.notes} onChange={e => update({ notes: e.target.value })} rows={4} />
      </section>

      <div className="flex flex-wrap gap-sm justify-end sticky bottom-0 bg-background-grey/95 backdrop-blur py-sm -mx-md px-md border-t">
        <Button variant="outline" onClick={saveDraft}><Save className="h-4 w-4 mr-2" /> Save draft</Button>
        <Button onClick={complete} className="bg-success hover:bg-success/90 text-success-foreground"><CheckCircle2 className="h-4 w-4 mr-2" /> Complete visit</Button>
      </div>

      {pendingLab && priorLab && (
        <LabDuplicateDialog
          open
          testName={pendingLab}
          prior={priorLab}
          onCancel={() => {
            setPendingLab(null);
            setPriorLab(null);
            setLabInput("");
          }}
          onConfirm={() => addLabToList(pendingLab)}
        />
      )}
    </div>
  );
};
