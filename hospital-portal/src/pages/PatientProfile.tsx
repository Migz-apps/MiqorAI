import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Activity, FileText, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { hospitalApi } from "@/lib/api/hospital";
import { emptyVisitDraft, mapPatientFromApi, mapPatientSafetyProfile, visitDraftHasContent } from "@/lib/mappers";
import { PatientHeader } from "@/components/miqorai/PatientHeader";
import { AllergyBanner } from "@/components/miqorai/AllergyBanner";
import { AddVisitForm } from "@/components/miqorai/AddVisitForm";
import { PatientSafetyProfile } from "@/components/miqorai/PatientSafetyProfile";
import { VisitRecordsPanel } from "@/components/miqorai/VisitRecordsPanel";
import { useAuth, can } from "@/store/auth";
import { useMemo, useState } from "react";
import type { VisitDraftState } from "@/lib/types";

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = useAuth(s => s.session)!;
  const [visitDraft, setVisitDraft] = useState<VisitDraftState>(emptyVisitDraft());
  const [activeTab, setActiveTab] = useState("profile");

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hospital", "patient", id],
    queryFn: async () => {
      const raw = await hospitalApi.patient(id!);
      return { raw, patient: mapPatientFromApi(raw) };
    },
    enabled: !!id,
  });

  const patient = data?.patient;
  const rawPatient = data?.raw;

  const safetyProfile = useMemo(
    () => (patient ? mapPatientSafetyProfile(patient, rawPatient, visitDraft) : null),
    [patient, rawPatient, visitDraft],
  );

  const showRecordsTab = visitDraftHasContent(visitDraft);
  const canAddVisit = can(session.role, "addDiagnosis") || can(session.role, "recordVitals");

  if (isLoading) return <div className="p-xl text-center text-sm text-text-secondary">Loading patient…</div>;

  if (isError || !patient || !safetyProfile) return (
    <div className="p-xl text-center">
      <p className="text-text-secondary">Patient not found.</p>
      <Button variant="link" onClick={() => nav("/patients")}>Back to patients</Button>
    </div>
  );

  return (
    <div className="space-y-md max-w-[1400px] mx-auto">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <AllergyBanner allergies={patient.allergies} />
      <PatientHeader patient={patient} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-md">
        <TabsList className="bg-card border">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Patient Profile</TabsTrigger>
          {canAddVisit && (
            <TabsTrigger value="add-visit"><Activity className="h-4 w-4 mr-1" /> Add Visit</TabsTrigger>
          )}
          {showRecordsTab && (
            <TabsTrigger value="records"><FileText className="h-4 w-4 mr-1" /> Records</TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="profile">
          <PatientSafetyProfile profile={safetyProfile} />
        </TabsContent>

        {canAddVisit && (
          <TabsContent value="add-visit">
            <AddVisitForm
              patient={patient}
              draft={visitDraft}
              onDraftChange={setVisitDraft}
            />
          </TabsContent>
        )}

        {showRecordsTab && (
          <TabsContent value="records">
            <VisitRecordsPanel patientId={patient.id} draft={visitDraft} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
