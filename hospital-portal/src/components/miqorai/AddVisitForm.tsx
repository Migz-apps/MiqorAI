import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Save, CheckCircle2, X, Search, Sparkles, FlaskConical } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { referenceApi, hospitalApi } from "@/lib/api/hospital";
import { aiApi, toVisitContext, type CheckActionResponse } from "@/lib/api/ai";
import { mapIcd } from "@/lib/mappers";
import type { Patient, PriorLabMatch, VisitDraftPrescription, VisitDraftState } from "@/lib/types";
import { useNotifications } from "@/store/notifications";
import { toast } from "@/lib/notify";
import { PrescriptionBuilder } from "./PrescriptionBuilder";
import { LabDuplicateDialog } from "./LabDuplicateDialog";
import { AiActionAlertDialog } from "./AiActionAlertDialog";
import { useAuth, can } from "@/store/auth";

type Props = {
  patient: Patient;
  draft: VisitDraftState;
  onDraftChange: (draft: VisitDraftState) => void;
  onAnalyze?: () => void;
  onSaveDraft: () => void | Promise<void>;
  onCompleteVisit: () => void | Promise<void>;
  savingDraft?: boolean;
  completingVisit?: boolean;
};

function priorFromAiAlert(alert: CheckActionResponse, testName: string): PriorLabMatch {
  const evidence = alert.evidence?.[0];
  return {
    test_name: testName,
    taken_on: evidence?.date && evidence.date !== "—" ? evidence.date : "—",
    taken_on_iso: "",
    results: evidence?.detail ?? alert.message ?? "Prior test on file.",
    lab_order_id: "",
  };
}

export const AddVisitForm = ({
  patient,
  draft,
  onDraftChange,
  onAnalyze,
  onSaveDraft,
  onCompleteVisit,
  savingDraft = false,
  completingVisit = false,
}: Props) => {
  const session = useAuth(s => s.session)!;
  const pushNotification = useNotifications(s => s.push);

  const update = (patch: Partial<VisitDraftState>) => onDraftChange({ ...draft, ...patch });

  const [diagSearch, setDiagSearch] = useState("");
  const [labInput, setLabInput] = useState("");
  const [orderingLab, setOrderingLab] = useState(false);
  const [pendingLab, setPendingLab] = useState<string | null>(null);
  const [priorLab, setPriorLab] = useState<PriorLabMatch | null>(null);
  const [aiAlert, setAiAlert] = useState<CheckActionResponse | null>(null);
  const [duplicateFromAi, setDuplicateFromAi] = useState(false);

  const { data: icdMatches = [] } = useQuery({
    queryKey: ["icd", diagSearch],
    queryFn: async () => {
      const rows = await referenceApi.icd(diagSearch || undefined) as Record<string, unknown>[];
      return rows.map(mapIcd);
    },
    enabled: diagSearch.length > 0,
  });

  const diagMatches = icdMatches.slice(0, 5);

  const clearLabModal = () => {
    setPendingLab(null);
    setPriorLab(null);
    setAiAlert(null);
    setDuplicateFromAi(false);
    setLabInput("");
  };

  const addLabToList = (name: string) => {
    if (!name.trim()) return;
    if (!draft.labs.some((l) => l.toLowerCase() === name.trim().toLowerCase())) {
      update({ labs: [...draft.labs, name.trim()] });
      toast.success(`${name.trim()} added to lab orders`);
    }
    clearLabModal();
  };

  const addPrescription = (item: Record<string, unknown>) => {
    const prescription: VisitDraftPrescription = {
      id: String(item.id ?? crypto.randomUUID()),
      medication: String(item.medication ?? ""),
      strength: String(item.strength ?? ""),
      instructions: String(item.instructions ?? ""),
      frequency: String(item.frequency ?? ""),
      duration: String(item.duration ?? ""),
      durationDays: Number(item.durationDays ?? 0),
      quantity: Number(item.quantity ?? 0),
      pharmacyId: item.pharmacyId ? String(item.pharmacyId) : null,
      pharmacyName: item.pharmacyName ? String(item.pharmacyName) : undefined,
    };

    update({ prescriptions: [...draft.prescriptions, prescription] });
    toast.success(`${prescription.medication} added to this draft visit`);
  };

  const removePrescription = (id: string) => {
    update({ prescriptions: draft.prescriptions.filter((item) => item.id !== id) });
  };

  const notifyDuplicate = (name: string, prior: PriorLabMatch) => {
    const message = `A similar test has already been taken on ${prior.taken_on}`;
    pushNotification({
      type: "lab_ready",
      title: "Similar test found",
      body: `${name}: ${message}`,
      audience: ["doctor", "nurse", "dept_head", "admin", "receptionist"],
    });
    toast.warning(message, { description: `${name} — review prior results before ordering again.` });
  };

  const showDuplicateModal = (name: string, prior: PriorLabMatch, fromAi = false) => {
    setPendingLab(name);
    setPriorLab(prior);
    setDuplicateFromAi(fromAi);
    setAiAlert(null);
    notifyDuplicate(name, prior);
  };

  const fetchPriorLab = async (name: string): Promise<PriorLabMatch | null> => {
    try {
      const res = await hospitalApi.labPrior(patient.id, name) as {
        found: boolean;
        prior: PriorLabMatch | null;
      };
      return res.found && res.prior ? res.prior : null;
    } catch {
      return null;
    }
  };

  const orderTest = async () => {
    const name = labInput.trim();
    if (!name) {
      toast.error("Enter a test name to order");
      return;
    }

    setOrderingLab(true);
    try {
      try {
        const aiResult = await aiApi.checkAction({
          patientId: patient.id,
          action: { type: "LAB_ORDER", name },
          visitContext: toVisitContext(draft),
        });

        if (aiResult.hasAlert && aiResult.alertType === "DUPLICATE_TEST") {
          const prior = (await fetchPriorLab(name)) ?? priorFromAiAlert(aiResult, name);
          showDuplicateModal(name, prior, true);
          return;
        }

        if (aiResult.hasAlert) {
          setPendingLab(name);
          setAiAlert(aiResult);
          setDuplicateFromAi(false);
          pushNotification({
            type: "system",
            title: aiResult.title ?? "Clinical alert",
            body: aiResult.message ?? "Review before proceeding.",
            audience: ["doctor", "nurse", "dept_head", "admin"],
          });
          toast.warning(aiResult.title ?? "Clinical alert", { description: aiResult.message });
          return;
        }

        if (!aiResult.aiUnavailable) {
          addLabToList(name);
          return;
        }
      } catch {
        // fall through to database duplicate check
      }

      const prior = await fetchPriorLab(name);
      if (prior) {
        showDuplicateModal(name, prior, false);
        return;
      }

      addLabToList(name);
    } finally {
      setOrderingLab(false);
    }
  };

  const orderRegardless = async () => {
    if (!pendingLab) return;
    if (duplicateFromAi) {
      await aiApi.override({
        patientId: patient.id,
        actionType: "LAB_ORDER",
        actionName: pendingLab,
        aiAlertType: "DUPLICATE_TEST",
        aiSeverity: "HIGH",
        aiMessage: `Doctor reordered ${pendingLab} despite prior test on ${priorLab?.taken_on ?? "file"}`,
        overrideReason: "Doctor chose to order test despite prior result on file",
      }).catch(() => undefined);
    }
    addLabToList(pendingLab);
  };

  const proceedLabAfterAlert = async (overrideReason?: string) => {
    if (!pendingLab) return;
    if (aiAlert?.requiresOverrideReason && overrideReason) {
      await aiApi.override({
        patientId: patient.id,
        actionType: "LAB_ORDER",
        actionName: pendingLab,
        aiAlertType: aiAlert.alertType,
        aiSeverity: aiAlert.severity,
        aiMessage: aiAlert.message,
        overrideReason,
      }).catch(() => undefined);
    }
    addLabToList(pendingLab);
  };

  return (
    <div className="space-y-lg">
      <div className="flex justify-end">
        <Button type="button" variant="outline" size="sm" onClick={onAnalyze}>
          <Sparkles className="h-4 w-4 mr-1" /> Analyze visit
        </Button>
      </div>

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

      <section className="space-y-sm p-md rounded-md border bg-card">
        <h3 className="h3">2. Symptoms & assessment</h3>
        <div className="space-y-sm">
          <div className="space-y-xs">
            <Label>Symptoms</Label>
            <Textarea
              placeholder="Current symptoms, onset, progression…"
              value={draft.symptoms}
              onChange={e => update({ symptoms: e.target.value })}
              rows={2}
            />
          </div>
          <div className="space-y-xs">
            <Label>Assessment</Label>
            <Textarea
              placeholder="Clinical assessment and working impression…"
              value={draft.assessment}
              onChange={e => update({ assessment: e.target.value })}
              rows={2}
            />
          </div>
        </div>
      </section>

      {can(session.role, "recordVitals") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">3. Vitals</h3>
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
          <h3 className="h3">4. Diagnosis (ICD-11)</h3>
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
          <h3 className="h3">5. Prescriptions</h3>
          <PrescriptionBuilder patient={patient} visitDraft={draft} onSubmit={addPrescription} />
          {draft.prescriptions.length > 0 && (
            <div className="rounded-md border bg-card p-md space-y-sm">
              <div className="text-sm font-medium">Pending prescriptions in this visit</div>
              <div className="space-y-xs">
                {draft.prescriptions.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start justify-between gap-sm rounded-md border px-sm py-xs"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.medication}</div>
                      <div className="text-xs text-text-secondary">
                        {item.strength} · {item.instructions} · {item.frequency} · {item.duration}
                      </div>
                      <div className="text-xs text-text-secondary">
                        {item.pharmacyName ?? "Hospital"} · Qty {item.quantity}
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-8 px-2"
                      onClick={() => removePrescription(item.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {can(session.role, "orderLabs") && (
        <section className="space-y-sm p-md rounded-md border bg-card">
          <h3 className="h3">6. Lab orders</h3>
          <div className="flex flex-col sm:flex-row gap-sm">
            <Input
              className="flex-1"
              placeholder="e.g. CBC, Lipid Panel, HbA1c"
              value={labInput}
              onChange={e => setLabInput(e.target.value)}
              onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); void orderTest(); } }}
            />
            <Button
              type="button"
              className="bg-primary hover:bg-primary/90 shrink-0"
              disabled={orderingLab || !labInput.trim()}
              onClick={() => void orderTest()}
            >
              <FlaskConical className="h-4 w-4 mr-1" />
              {orderingLab ? "Checking…" : "Order test"}
            </Button>
          </div>
          <p className="text-xs text-text-secondary">
            Orders are checked against patient history and clinical safety before being added.
          </p>
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
        <h3 className="h3">7. Notes</h3>
        <Textarea placeholder="Clinical notes, observations, follow-up plan…" value={draft.notes} onChange={e => update({ notes: e.target.value })} rows={4} />
      </section>

      <div className="flex flex-wrap gap-sm justify-end sticky bottom-0 bg-background-grey/95 backdrop-blur py-sm -mx-md px-md border-t">
        <Button variant="outline" onClick={onSaveDraft} disabled={savingDraft || completingVisit}>
          <Save className="h-4 w-4 mr-2" /> {savingDraft ? "Saving..." : "Save draft"}
        </Button>
        <Button
          onClick={onCompleteVisit}
          disabled={savingDraft || completingVisit}
          className="bg-success hover:bg-success/90 text-success-foreground"
        >
          <CheckCircle2 className="h-4 w-4 mr-2" />
          {completingVisit ? "Completing..." : "Complete visit"}
        </Button>
      </div>

      {pendingLab && priorLab && (
        <LabDuplicateDialog
          open
          testName={pendingLab}
          prior={priorLab}
          onCancel={clearLabModal}
          onConfirm={() => void orderRegardless()}
        />
      )}

      {aiAlert && pendingLab && !priorLab && (
        <AiActionAlertDialog
          open
          alert={aiAlert}
          onCancel={clearLabModal}
          onProceed={(reason) => void proceedLabAfterAlert(reason)}
        />
      )}
    </div>
  );
};
