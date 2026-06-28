import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Pill, Search, AlertTriangle, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { referenceApi, hospitalApi, type PrescriptionAllergyCheckResponse } from "@/lib/api/hospital";
import { aiApi, toVisitContext, type CheckActionResponse } from "@/lib/api/ai";
import { mapDrug, mapDrugInteraction } from "@/lib/mappers";
import type { Patient, VisitDraftState } from "@/lib/types";
import { toast } from "@/lib/notify";
import { AiActionAlertDialog } from "./AiActionAlertDialog";

type Drug = { name: string; class: string; forms: string[] };

type Props = {
  patient: Patient;
  visitDraft?: VisitDraftState;
  onSubmit?: (rx: Record<string, unknown>) => void;
};

export const PrescriptionBuilder = ({ patient, visitDraft, onSubmit }: Props) => {
  const [search, setSearch] = useState("");
  const [drug, setDrug] = useState<Drug | null>(null);
  const [dosage, setDosage] = useState("");
  const [instructions, setInstructions] = useState("1 tablet");
  const [frequency, setFrequency] = useState("1x daily");
  const [duration, setDuration] = useState("30 days");
  const [pharmacyId, setPharmacyId] = useState("");
  const [aiAlert, setAiAlert] = useState<CheckActionResponse | null>(null);
  const [pendingRx, setPendingRx] = useState<Record<string, unknown> | null>(null);

  const { data: drugs = [] } = useQuery({
    queryKey: ["reference", "drugs", search],
    queryFn: async () => {
      const rows = await referenceApi.drugs(search || undefined);
      return (rows as Record<string, unknown>[]).map(mapDrug);
    },
    enabled: search.length > 0,
  });

  const { data: pharmacies = [] } = useQuery({
    queryKey: ["reference", "pharmacies"],
    queryFn: () => referenceApi.pharmacies(),
  });

  const pharmacyOptions = pharmacies as Array<{ id: string; name: string }>;
  const selectedPharmacy =
    pharmacyOptions.find((item) => item.id === pharmacyId) ??
    pharmacyOptions[0] ??
    null;
  const selectedPharmacyId = pharmacyId || selectedPharmacy?.id || "";
  const selectedPharmacyName = selectedPharmacy?.name || "Hospital";

  const { data: interactions = [] } = useQuery({
    queryKey: ["reference", "interactions", drug?.name, patient.prescriptions],
    queryFn: async () => {
      if (!drug) return [];
      const activeMeds = patient.prescriptions
        .filter((p) => p.status === "active" || p.status === "pending")
        .map((p) => p.medication);
      const rows = await referenceApi.interactions([drug.name, ...activeMeds]);
      return Array.isArray(rows) ? (rows as Record<string, unknown>[]).map(mapDrugInteraction) : [];
    },
    enabled: !!drug,
  });

  const matches = drugs.slice(0, 6);
  const strengthOptions = useMemo(() => {
    const suggested = [
      "2.5mg",
      "5mg",
      "10mg",
      "20mg",
      "25mg",
      "40mg",
      "50mg",
      "75mg",
      "100mg",
      "250mg",
      "500mg",
      "850mg",
      "1g",
      "5mg/5mL",
      "10mg/5mL",
      "125mg/5mL",
      "250mg/5mL",
      "100mcg",
      "200mcg",
      "1%",
      "2%",
    ];

    return [...new Set(
      [...(drug?.forms ?? []), ...suggested]
        .map((option) => option.trim())
        .filter((option) => option && option !== "â€”"),
    )];
  }, [drug?.forms]);

  const matchesAllergy = (allergyName: string, medication: Drug) => {
    const normalizedAllergy = allergyName.toLowerCase();
    return normalizedAllergy !== "none known" && (
      medication.name.toLowerCase().includes(normalizedAllergy) ||
      normalizedAllergy.includes(medication.name.toLowerCase()) ||
      medication.class.toLowerCase().includes(normalizedAllergy)
    );
  };

  const allergyWarning = drug
    ? patient.allergies.find((allergy) => matchesAllergy(allergy.name, drug))
    : null;

  const activeRx = patient.prescriptions.filter((p) => p.status === "active" || p.status === "pending");
  const drugInteractions = drug
    ? interactions.filter((i) =>
        (i.a === drug.name && activeRx.some((p) => p.medication.startsWith(i.b))) ||
        (i.b === drug.name && activeRx.some((p) => p.medication.startsWith(i.a)))
      )
    : [];

  const hasSevere = drugInteractions.some((i) => i.severity === "severe");

  const toDurationDays = (value: string) => {
    if (value === "ongoing") return 30;
    const match = value.match(/(\d+)/);
    return match ? Number(match[1]) : 30;
  };

  const estimateQuantity = (frequencyValue: string, durationDays: number) => {
    switch (frequencyValue) {
      case "2x daily":
        return durationDays * 2;
      case "3x daily":
        return durationDays * 3;
      case "4x daily":
        return durationDays * 4;
      case "Every 6 hours":
        return durationDays * 4;
      case "Every 8 hours":
        return durationDays * 3;
      case "Weekly":
        return Math.max(1, Math.ceil(durationDays / 7));
      default:
        return durationDays;
    }
  };

  const finalizePrescription = (payload: Record<string, unknown>) => {
    onSubmit?.(payload);
    toast.success(`Prescription added for ${selectedPharmacyName}`);
    setDrug(null);
    setDosage("");
    setInstructions("1 tablet");
    setSearch("");
    setPharmacyId("");
    setPendingRx(null);
    setAiAlert(null);
  };

  const buildAllergyAlert = (
    medication: Drug,
    conflicts: PrescriptionAllergyCheckResponse["conflicts"],
  ): CheckActionResponse => {
    const matchedAllergies = patient.allergies.filter((allergy) =>
      conflicts.some((conflict) => conflict.allergy_name.toLowerCase() === allergy.name.toLowerCase()) ||
      matchesAllergy(allergy.name, medication)
    );

    const severityRank = { mild: 1, moderate: 2, severe: 3 } as const;
    const topSeverity = matchedAllergies.reduce<"mild" | "moderate" | "severe">(
      (current, allergy) => (severityRank[allergy.severity] > severityRank[current] ? allergy.severity : current),
      "moderate",
    );

    return {
      hasAlert: true,
      severity: topSeverity === "severe" ? "CRITICAL" : "HIGH",
      alertType: "ALLERGY_CONTRAINDICATION",
      title: "Prescription blocked: documented allergy",
      message: `${patient.name} has a documented allergy conflict with ${medication.name}. Choose a safer alternative.`,
      evidence: matchedAllergies.map((allergy) => {
        const matchingConflict = conflicts.find(
          (conflict) => conflict.allergy_name.toLowerCase() === allergy.name.toLowerCase(),
        );
        const detailParts = [
          `Documented allergy: ${allergy.name}`,
          matchingConflict?.reaction ? `Reaction: ${matchingConflict.reaction}` : "",
        ].filter(Boolean);

        return {
          date: "-",
          facility: "Patient profile",
          detail: detailParts.join(" | "),
        };
      }),
      recommendedAction: "Do not prescribe this medication.",
      alternatives: [],
      requiresOverrideReason: false,
    };
  };

  const submit = async () => {
    // Temporary testing override: keep the prescription flow moving even when
    // the builder has not fully captured medication, strength, or directions.
    // if (!drug || !dosage || !instructions.trim()) {
    //   toast.error("Pick a medication, strength, and instructions");
    //   return;
    // }

    const medicationName = drug?.name || search.trim() || "Medication to be confirmed";
    const selectedDrug = drug ?? { name: medicationName, class: "", forms: [] };
    const normalizedStrength = dosage.trim() || "Strength to be confirmed";
    const normalizedInstructions = instructions.trim() || "Take as directed";

    if (hasSevere) {
      toast.error("Severe interaction blocked. Choose an alternative.");
      return;
    }

    const localAllergyConflict = patient.allergies.find((allergy) =>
      matchesAllergy(allergy.name, selectedDrug),
    );
    const allergyCheck = await hospitalApi.checkAllergies(patient.id, [medicationName]).catch(
      () => ({ safe: true, conflicts: [] }) satisfies PrescriptionAllergyCheckResponse,
    );
    if (localAllergyConflict || !allergyCheck.safe) {
      setPendingRx(null);
      setAiAlert(buildAllergyAlert(selectedDrug, allergyCheck.conflicts));
      return;
    }

    const durationDays = toDurationDays(duration);
    const payload = {
      id: crypto.randomUUID(),
      medication: medicationName,
      strength: normalizedStrength,
      instructions: normalizedInstructions,
      frequency,
      duration,
      durationDays,
      quantity: estimateQuantity(frequency, durationDays),
      pharmacyId: selectedPharmacyId || null,
      pharmacyName: selectedPharmacyName,
    };
    const draft = visitDraft ?? { chief: "", symptoms: "", assessment: "", diagnoses: [] };

    try {
      const aiResult = await aiApi.checkAction({
        patientId: patient.id,
        action: {
          type: "PRESCRIPTION",
          name: medicationName,
          dose: `${normalizedStrength} ${normalizedInstructions}`,
          frequency,
          duration,
        },
        visitContext: toVisitContext(draft),
      });
      if (aiResult.hasAlert) {
        setPendingRx(payload);
        setAiAlert(aiResult);
        return;
      }
    } catch {
      // Continue without AI gate if the service is unavailable.
    }

    finalizePrescription(payload);
  };

  const proceedAfterAlert = async (overrideReason?: string) => {
    if (!pendingRx || !drug) return;
    if (aiAlert?.requiresOverrideReason && overrideReason) {
      await aiApi.override({
        patientId: patient.id,
        actionType: "PRESCRIPTION",
        actionName: drug.name,
        aiAlertType: aiAlert.alertType,
        aiSeverity: aiAlert.severity,
        aiMessage: aiAlert.message,
        overrideReason,
      }).catch(() => undefined);
    }
    finalizePrescription(pendingRx);
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
          <Input
            className="pl-9"
            placeholder="Search drug database..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setDrug(null);
            }}
          />
        </div>
        {search && !drug && (
          <div className="border rounded-md divide-y max-h-48 overflow-auto">
            {matches.map((match) => (
              <button
                key={match.name}
                type="button"
                onClick={() => {
                  setDrug(match);
                  setSearch(match.name);
                  setDosage(match.forms.find((form) => form && form !== "â€”") ?? "");
                }}
                className="w-full text-left px-sm py-xs hover:bg-primary-light/40"
              >
                <div className="text-sm font-medium">{match.name}</div>
                <div className="text-xs text-text-secondary">{match.class} | {match.forms.join(", ")}</div>
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
            This medication matches a documented allergy: {allergyWarning.name} ({allergyWarning.severity}).
          </AlertDescription>
        </Alert>
      )}

      {drugInteractions.length > 0 && (
        <div className="space-y-xs">
          {drugInteractions.map((interaction, idx) => {
            const isSevere = interaction.severity === "severe";
            return (
              <Alert key={idx} className={isSevere ? "border-error bg-error/10" : "border-warning bg-warning/10"}>
                <AlertTriangle className={`h-4 w-4 ${isSevere ? "text-error" : "text-warning"}`} />
                <AlertDescription className={`${isSevere ? "text-error" : "text-warning"} font-medium`}>
                  {isSevere ? "Severe" : "Moderate"} interaction: {interaction.a} + {interaction.b}. {interaction.note}
                </AlertDescription>
              </Alert>
            );
          })}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-5 gap-sm">
        <div className="space-y-xs">
          <Label>Strength</Label>
          <Input
            value={dosage}
            onChange={(e) => setDosage(e.target.value)}
            placeholder="Type strength, e.g. 500mg"
          />
          <div className="rounded-md border bg-background-grey/60 p-2">
            <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-text-secondary">
              Suggested strengths
            </div>
            <div className="flex flex-wrap gap-2">
              {strengthOptions.slice(0, 10).map((option) => {
                const active = dosage === option;
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setDosage(option)}
                    className={`rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "border-border bg-background text-foreground hover:border-primary/40 hover:bg-primary-light/40"
                    }`}
                  >
                    {option}
                  </button>
                );
              })}
              {strengthOptions.length === 0 && (
                <div className="text-xs text-text-secondary">
                  Select a medication to see common strengths, or type one manually.
                </div>
              )}
            </div>
          </div>
        </div>
        <div className="space-y-xs">
          <Label>Instructions</Label>
          <Input value={instructions} onChange={(e) => setInstructions(e.target.value)} placeholder="1 tablet" />
        </div>
        <div className="space-y-xs">
          <Label>Frequency</Label>
          <Select value={frequency} onValueChange={setFrequency}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["1x daily", "2x daily", "3x daily", "4x daily", "Every 6 hours", "Every 8 hours", "PRN", "Weekly"].map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-xs">
          <Label>Duration</Label>
          <Select value={duration} onValueChange={setDuration}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["3 days", "7 days", "14 days", "30 days", "60 days", "90 days", "ongoing"].map((option) => (
                <SelectItem key={option} value={option}>{option}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-xs">
          <Label>Pharmacy</Label>
          <Select value={selectedPharmacyId} onValueChange={setPharmacyId}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {pharmacyOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>{option.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Button onClick={() => void submit()} className="bg-primary hover:bg-primary/90">
        <Send className="h-4 w-4 mr-2" /> Prescribe and send to pharmacy
      </Button>

      {aiAlert && (
        <AiActionAlertDialog
          open
          alert={aiAlert}
          onCancel={() => {
            setAiAlert(null);
            setPendingRx(null);
          }}
          onProceed={aiAlert.alertType === "ALLERGY_CONTRAINDICATION" ? undefined : (reason) => void proceedAfterAlert(reason)}
          allowProceed={aiAlert.alertType !== "ALLERGY_CONTRAINDICATION"}
          closeLabel={aiAlert.alertType === "ALLERGY_CONTRAINDICATION" ? "Choose another medication" : undefined}
        />
      )}
    </div>
  );
};
