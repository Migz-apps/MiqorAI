import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PatientSafetyProfile as SafetyProfile } from "@/lib/types";
import { AlertTriangle, ShieldAlert } from "lucide-react";

function Field({ label, value }: { label: string; value?: string | number | null }) {
  const display = value != null && value !== "" ? String(value) : "—";
  return (
    <div className="space-y-0.5">
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</div>
      <div className="text-sm">{display}</div>
    </div>
  );
}

function ListField({ label, items }: { label: string; items: string[] }) {
  return (
    <div className="space-y-xs">
      <div className="text-xs font-medium text-text-secondary uppercase tracking-wide">{label}</div>
      {items.length ? (
        <ul className="text-sm space-y-0.5 list-disc list-inside">
          {items.map((item, i) => (
            <li key={i}>{item}</li>
          ))}
        </ul>
      ) : (
        <div className="text-sm text-text-secondary">None documented</div>
      )}
    </div>
  );
}

function Flag({ active, label }: { active: boolean; label: string }) {
  return (
    <Badge
      variant="outline"
      className={active ? "bg-error/10 text-error border-error/30" : "bg-background-grey text-text-secondary"}
    >
      {label}: {active ? "Yes" : "No"}
    </Badge>
  );
}

export const PatientSafetyProfile = ({ profile }: { profile: SafetyProfile }) => {
  const hasCritical = profile.criticalMedicalInfo.length > 0;

  return (
    <div className="space-y-md">
      {hasCritical && (
        <div className="flex items-start gap-sm p-md rounded-md border border-error/30 bg-error/5">
          <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
          <div>
            <div className="font-medium text-error">Critical medical information</div>
            <ul className="text-sm mt-1 space-y-0.5">
              {profile.criticalMedicalInfo.map((info, i) => (
                <li key={i}>{info}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Identification</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-2 md:grid-cols-4 gap-md">
          <Field label="Patient name" value={profile.name} />
          <Field label="Patient ID" value={profile.patientId} />
          <Field label="Age" value={profile.age} />
          <Field label="Sex" value={profile.sex} />
          <Field label="Date of birth" value={profile.dob} />
          <Field label="Blood group" value={profile.bloodGroup} />
          <Field label="Height (cm)" value={profile.height} />
          <Field label="Weight (kg)" value={profile.weight} />
          <Field label="BMI" value={profile.bmi} />
          <Field label="Emergency contact" value={profile.emergencyContact} />
          {profile.insuranceProvider && (
            <Field label="Insurance provider" value={profile.insuranceProvider} />
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Allergies</CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <ListField label="Drug allergies" items={profile.drugAllergies} />
            <ListField label="Food allergies" items={profile.foodAllergies} />
            <ListField label="Other allergies" items={profile.otherAllergies} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Conditions & medications</CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            <ListField label="Chronic diseases" items={profile.chronicDiseases} />
            <ListField label="Active medical conditions" items={profile.activeConditions} />
            <ListField label="Current medications" items={profile.currentMedications} />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Special status</CardTitle>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {profile.pregnancyStatus && <Field label="Pregnancy status" value={profile.pregnancyStatus} />}
          {profile.transplantStatus && <Field label="Organ transplant status" value={profile.transplantStatus} />}
          <ListField label="Implantable devices" items={profile.implantableDevices} />
          {profile.codeStatus && <Field label="Code status" value={profile.codeStatus} />}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm">
            <ShieldAlert className="h-4 w-4 text-primary" /> Clinical flags
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-sm">
          <Flag active={profile.clinicalFlags.highRisk} label="High-risk patient" />
          <Flag active={profile.clinicalFlags.fallRisk} label="Fall risk" />
          <Flag active={profile.clinicalFlags.seizureHistory} label="Seizure history" />
          <Flag active={profile.clinicalFlags.bleedingDisorder} label="Bleeding disorder" />
          <Flag active={profile.clinicalFlags.immunocompromised} label="Immunocompromised" />
          {profile.clinicalFlags.isolationPrecautions && (
            <Badge variant="outline" className="bg-warning/10 text-warning border-warning/30">
              Isolation: {profile.clinicalFlags.isolationPrecautions}
            </Badge>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
