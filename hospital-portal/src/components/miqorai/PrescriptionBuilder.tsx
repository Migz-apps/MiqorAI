import { useState } from "react";
import { Pill, Search, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { DRUG_DATABASE, PHARMACIES, DRUG_INTERACTIONS } from "@/lib/mockData";
import type { Patient } from "@/lib/types";
import { toast } from "@/lib/notify";

type Props = { patient: Patient; onSubmit?: (rx: any) => void };

export const PrescriptionBuilder = ({ patient, onSubmit }: Props) => {
  const [search, setSearch] = useState("");
  const [drug, setDrug] = useState<typeof DRUG_DATABASE[number] | null>(null);
  const [dosage, setDosage] = useState("");
  const [frequency, setFrequency] = useState("1x daily");
  const [duration, setDuration] = useState("30 days");
  const [pharmacy, setPharmacy] = useState(PHARMACIES[0]);

  const matches = DRUG_DATABASE.filter(d => d.name.toLowerCase().includes(search.toLowerCase())).slice(0,6);

  const allergyWarning = drug ? patient.allergies.find(a =>
    a.name.toLowerCase() === drug.class.toLowerCase() ||
    drug.name.toLowerCase().includes(a.name.toLowerCase()) ||
    drug.class.toLowerCase().includes(a.name.toLowerCase())
  ) : null;

  // CDS — drug-drug interactions vs active prescriptions
  const activeRx = patient.prescriptions.filter(p => p.status === "active" || p.status === "pending");
  const interactions = drug
    ? DRUG_INTERACTIONS.filter(i =>
        (i.a === drug.name && activeRx.some(p => p.medication.startsWith(i.b))) ||
        (i.b === drug.name && activeRx.some(p => p.medication.startsWith(i.a)))
      )
    : [];

  const hasSevere = interactions.some(i => i.severity === "severe");

  const submit = () => {
    if (!drug || !dosage) { toast.error("Pick a medication and dosage"); return; }
    if (hasSevere) { toast.error("Severe interaction blocked. Choose an alternative."); return; }
    onSubmit?.({ medication: drug.name, dosage, frequency, duration, pharmacy });
    toast.success(`Prescription sent to ${pharmacy}`);
    setDrug(null); setDosage(""); setSearch("");
  };

  return (
    <div className="space-y-md p-md rounded-md border bg-card">
      <div className="flex items-center gap-sm">
        <Pill className="h-5 w-5 text-primary" />
        <div className="font-semibold">New prescription</div>
      </div>

      <div className="space-y-xs">
        <Label>Medication</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input className="pl-9" placeholder="Search drug database…" value={search} onChange={e => { setSearch(e.target.value); setDrug(null); }} />
        </div>
        {search && !drug && (
          <div className="border rounded-md divide-y max-h-48 overflow-auto">
            {matches.map(d => (
              <button key={d.name} type="button" onClick={() => { setDrug(d); setSearch(d.name); setDosage(d.forms[0]); }} className="w-full text-left px-sm py-xs hover:bg-primary-light/40">
                <div className="text-sm font-medium">{d.name}</div>
                <div className="text-xs text-text-secondary">{d.class} · {d.forms.join(", ")}</div>
              </button>
            ))}
            {matches.length === 0 && <div className="px-sm py-xs text-xs text-text-secondary">No matches</div>}
          </div>
        )}
      </div>

      {allergyWarning && (
        <Alert className="border-error bg-error/10">
          <AlertTriangle className="h-4 w-4 text-error" />
          <AlertDescription className="text-error font-medium">
            ⚠ Patient has a {allergyWarning.severity} allergy to {allergyWarning.name}. Confirm before prescribing.
          </AlertDescription>
        </Alert>
      )}

      {interactions.length > 0 && (
        <div className="space-y-xs">
          {interactions.map((i, idx) => {
            const isSevere = i.severity === "severe";
            return (
              <Alert key={idx} className={isSevere ? "border-error bg-error/10" : "border-warning bg-warning/10"}>
                <AlertTriangle className={`h-4 w-4 ${isSevere ? "text-error" : "text-warning"}`} />
                <AlertDescription className={`${isSevere ? "text-error" : "text-warning"} font-medium`}>
                  {isSevere ? "⛔ Severe" : "⚠ Moderate"} interaction: {i.a} + {i.b}. {i.note}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-sm">
        <div className="space-y-xs">
          <Label>Dosage</Label>
          <Select value={dosage} onValueChange={setDosage}>
            <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
            <SelectContent>
              {(drug?.forms || ["—"]).map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-xs">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1x daily","2x daily","3x daily","4x daily","Every 6 hours","Every 8 hours","PRN","Weekly"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-xs">
          <Label>Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["3 days","7 days","14 days","30 days","60 days","90 days","ongoing"].map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-xs">
          <Label>Pharmacy</Label>
          <Select value={pharmacy} onValueChange={setPharmacy}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {PHARMACIES.map(f => <SelectItem key={f} value={f}>{f}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={submit} className="bg-primary hover:bg-primary/90">
        <Send className="h-4 w-4 mr-2" /> Prescribe & send to pharmacy
      </Button>
    </div>
  );
};
