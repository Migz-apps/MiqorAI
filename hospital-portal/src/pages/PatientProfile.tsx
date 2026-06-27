import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Activity,
  ClipboardList,
  FileText,
  RotateCcw,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { hospitalApi } from "@/lib/api/hospital";
import {
  emptyVisitDraft,
  mapDoctorPatientWorkspace,
  mapPatientFromApi,
  mapPatientSafetyProfile,
  visitDraftHasAnalyzableContent,
  visitDraftHasContent,
} from "@/lib/mappers";
import { PatientHeader } from "@/components/miqorai/PatientHeader";
import { AllergyBanner } from "@/components/miqorai/AllergyBanner";
import { AddVisitForm } from "@/components/miqorai/AddVisitForm";
import { PatientSafetyProfile } from "@/components/miqorai/PatientSafetyProfile";
import { RelevantHistoryPanel } from "@/components/miqorai/RelevantHistoryPanel";
import { useAuth, can } from "@/store/auth";
import type { DraftVisitWorkspace, VisitDraftState } from "@/lib/types";
import { toast } from "@/lib/notify";

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const queryClient = useQueryClient();
  const session = useAuth((state) => state.session)!;

  const [visitDraft, setVisitDraft] = useState<VisitDraftState>(emptyVisitDraft());
  const [activeTab, setActiveTab] = useState("profile");
  const [analyzeToken, setAnalyzeToken] = useState(0);
  const [activeDraftId, setActiveDraftId] = useState<string>();
  const [linkedVisitId, setLinkedVisitId] = useState<string>();
  const [draftHydrated, setDraftHydrated] = useState(false);
  const canAddVisit = can(session.role, "addDiagnosis") || can(session.role, "recordVitals");
  const latestDraftRef = useRef({
    patientId: id,
    canAddVisit,
    draftHydrated,
    activeDraftId,
    linkedVisitId,
    visitDraft,
  });

  const { data, isLoading, isError } = useQuery({
    queryKey: ["hospital", "patient", id],
    queryFn: async () => {
      const raw = await hospitalApi.patient(id!);
      return { raw, patient: mapPatientFromApi(raw) };
    },
    enabled: !!id,
  });

  const workspaceQuery = useQuery({
    queryKey: ["hospital", "workspace", id],
    queryFn: async () => mapDoctorPatientWorkspace(await hospitalApi.patientWorkspace(id!)),
    enabled: !!id && canAddVisit,
  });

  const patient = data?.patient;
  const rawPatient = data?.raw;
  const workspace = workspaceQuery.data;

  const safetyProfile = useMemo(
    () => (patient ? mapPatientSafetyProfile(patient, rawPatient, visitDraft) : null),
    [patient, rawPatient, visitDraft],
  );

  const showRecordsTab = visitDraftHasAnalyzableContent(visitDraft);

  useEffect(() => {
    latestDraftRef.current = {
      patientId: id,
      canAddVisit,
      draftHydrated,
      activeDraftId,
      linkedVisitId,
      visitDraft,
    };
  }, [id, canAddVisit, draftHydrated, activeDraftId, linkedVisitId, visitDraft]);

  useEffect(() => {
    setVisitDraft(emptyVisitDraft());
    setActiveDraftId(undefined);
    setLinkedVisitId(undefined);
    setDraftHydrated(false);
  }, [id]);

  useEffect(() => {
    if (!workspace || draftHydrated) return;

    const latestDraft = workspace.activeDrafts[0];
    if (latestDraft) {
      setVisitDraft(latestDraft.draft);
      setActiveDraftId(latestDraft.draftId);
      setLinkedVisitId(latestDraft.visitId ?? workspace.openVisit?.id ?? undefined);
      setActiveTab("add-visit");
    } else if (workspace.openVisit?.id) {
      setLinkedVisitId(workspace.openVisit.id);
    }

    setDraftHydrated(true);
  }, [workspace, draftHydrated]);

  const saveDraftMutation = useMutation({
    mutationFn: async (draft: VisitDraftState) => {
      if (!id) throw new Error("Missing patient id");
      return hospitalApi.saveVisitDraft(id, {
        draft_id: activeDraftId,
        visit_id: linkedVisitId,
        draft,
      });
    },
    onSuccess: async (raw) => {
      const savedDraft = raw as Record<string, unknown>;
      const draftId = String(savedDraft.draft_id ?? "");
      const visitId = savedDraft.visit_id ? String(savedDraft.visit_id) : undefined;
      if (draftId) setActiveDraftId(draftId);
      if (visitId) setLinkedVisitId(visitId);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital", "workspace", id] }),
        queryClient.invalidateQueries({ queryKey: ["hospital", "patients"] }),
      ]);
    },
  });

  const completeVisitMutation = useMutation({
    mutationFn: async () => {
      if (!id) throw new Error("Missing patient id");
      let draftId = activeDraftId;

      if (!draftId) {
        const saved = await hospitalApi.saveVisitDraft(id, {
          visit_id: linkedVisitId,
          draft: visitDraft,
        });
        draftId = String((saved as Record<string, unknown>).draft_id ?? "");
      }

      if (!draftId) throw new Error("Could not create a draft visit");
      return hospitalApi.completeVisitDraft(id, draftId);
    },
    onSuccess: async () => {
      toast.success("Visit completed and saved");
      setVisitDraft(emptyVisitDraft());
      setActiveDraftId(undefined);
      setLinkedVisitId(undefined);
      setAnalyzeToken(0);
      setActiveTab("profile");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital", "patient", id] }),
        queryClient.invalidateQueries({ queryKey: ["hospital", "workspace", id] }),
        queryClient.invalidateQueries({ queryKey: ["hospital", "patients"] }),
        queryClient.invalidateQueries({ queryKey: ["prescriptions"] }),
        queryClient.invalidateQueries({ queryKey: ["labs"] }),
      ]);
    },
  });

  const discardDraftMutation = useMutation({
    mutationFn: async (draftId: string) => {
      if (!id) throw new Error("Missing patient id");
      return hospitalApi.deleteVisitDraft(id, draftId);
    },
    onSuccess: async () => {
      toast.success("Draft visit cleared");
      setVisitDraft(emptyVisitDraft());
      setActiveDraftId(undefined);
      setAnalyzeToken(0);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["hospital", "workspace", id] }),
        queryClient.invalidateQueries({ queryKey: ["hospital", "patients"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!id || !canAddVisit || !draftHydrated || !visitDraftHasContent(visitDraft)) return;
    const timer = window.setTimeout(() => {
      if (!saveDraftMutation.isPending) {
        saveDraftMutation.mutate(visitDraft);
      }
    }, 900);

    return () => window.clearTimeout(timer);
  }, [
    id,
    canAddVisit,
    draftHydrated,
    visitDraft,
    saveDraftMutation,
  ]);

  useEffect(() => {
    return () => {
      const latest = latestDraftRef.current;
      if (
        !latest.patientId ||
        !latest.canAddVisit ||
        !latest.draftHydrated ||
        !visitDraftHasContent(latest.visitDraft)
      ) {
        return;
      }

      void hospitalApi.saveVisitDraft(latest.patientId, {
        draft_id: latest.activeDraftId,
        visit_id: latest.linkedVisitId,
        draft: latest.visitDraft,
      }).catch(() => undefined);
    };
  }, []);

  const resumeDraft = (draft: DraftVisitWorkspace) => {
    setVisitDraft(draft.draft);
    setActiveDraftId(draft.draftId);
    setLinkedVisitId(draft.visitId ?? workspace?.openVisit?.id ?? undefined);
    setActiveTab("add-visit");
    toast.success("Unfinished visit loaded");
  };

  const startFromOpenVisit = () => {
    setVisitDraft(emptyVisitDraft());
    setActiveDraftId(undefined);
    setLinkedVisitId(workspace?.openVisit?.id ?? undefined);
    setActiveTab("add-visit");
  };

  const handleSaveDraft = async () => {
    if (!visitDraftHasContent(visitDraft)) {
      toast.error("Add visit details before saving a draft");
      return;
    }

    await saveDraftMutation.mutateAsync(visitDraft);
    toast.success("Draft saved to the database");
  };

  const handleCompleteVisit = async () => {
    if (!visitDraft.chief.trim()) {
      toast.error("Add the chief complaint before completing the visit");
      return;
    }

    await completeVisitMutation.mutateAsync();
  };

  if (isLoading) {
    return <div className="p-xl text-center text-sm text-text-secondary">Loading patient…</div>;
  }

  if (isError || !patient || !safetyProfile) {
    return (
      <div className="p-xl text-center">
        <p className="text-text-secondary">Patient not found.</p>
        <Button variant="link" onClick={() => nav("/patients")}>Back to patients</Button>
      </div>
    );
  }

  return (
    <div className="space-y-md max-w-[1400px] mx-auto">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <AllergyBanner allergies={patient.allergies} />
      <PatientHeader patient={patient} />

      {canAddVisit && (
        <div className="grid gap-md lg:grid-cols-2">
          <Card>
            <CardHeader className="pb-sm">
              <CardTitle className="h3 flex items-center gap-sm">
                <RotateCcw className="h-4 w-4 text-primary" /> Unfinished Visit
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-sm">
              {workspace?.activeDrafts.length ? (
                workspace.activeDrafts.map((draft) => (
                  <div key={draft.draftId} className="rounded-md border p-sm space-y-xs">
                    <div className="flex items-center justify-between gap-sm flex-wrap">
                      <div className="text-sm font-medium">
                        {draft.openVisit?.status ? `Visit ${draft.openVisit.status.replace("_", " ")}` : "Draft visit"}
                      </div>
                      <Badge variant="outline">Updated {new Date(draft.updatedAt).toLocaleString()}</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {draft.draft.chief || "No chief complaint yet"}
                    </div>
                    <div className="flex gap-sm">
                      <Button size="sm" onClick={() => resumeDraft(draft)}>Resume</Button>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={discardDraftMutation.isPending}
                        onClick={() => discardDraftMutation.mutate(draft.draftId)}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                ))
              ) : workspace?.openVisit ? (
                <div className="rounded-md border p-sm space-y-xs">
                  <div className="text-sm font-medium">
                    Open visit in {workspace.openVisit.department}
                  </div>
                  <div className="text-xs text-text-secondary">
                    Status: {workspace.openVisit.status.replace("_", " ")}
                  </div>
                  <Button size="sm" onClick={startFromOpenVisit}>Start from this visit</Button>
                </div>
              ) : (
                <div className="text-sm text-text-secondary">
                  No unfinished visit for you on this patient.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-sm">
              <CardTitle className="h3 flex items-center gap-sm">
                <ClipboardList className="h-4 w-4 text-primary" /> My Prescriptions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-sm">
              {workspace?.doctorPrescriptions.length ? (
                workspace.doctorPrescriptions.slice(0, 6).map((prescription) => (
                  <div key={prescription.id} className="rounded-md border p-sm space-y-xs">
                    <div className="flex items-center justify-between gap-sm flex-wrap">
                      <div className="text-sm font-medium">
                        {prescription.items.map((item) => item.medication).join(", ")}
                      </div>
                      <Badge variant="outline">{prescription.status}</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">
                      {new Date(prescription.prescribedAt).toLocaleString()}
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-sm text-text-secondary">
                  You have not written any prescriptions for this patient yet.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-md">
        <TabsList className="bg-card border">
          <TabsTrigger value="profile"><User className="h-4 w-4 mr-1" /> Patient Profile</TabsTrigger>
          {canAddVisit && (
            <TabsTrigger value="add-visit"><Activity className="h-4 w-4 mr-1" /> Add Visit</TabsTrigger>
          )}
          {showRecordsTab && (
            <TabsTrigger value="records"><FileText className="h-4 w-4 mr-1" /> Relevant History</TabsTrigger>
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
              onAnalyze={() => setAnalyzeToken((count) => count + 1)}
              onSaveDraft={handleSaveDraft}
              onCompleteVisit={handleCompleteVisit}
              savingDraft={saveDraftMutation.isPending}
              completingVisit={completeVisitMutation.isPending}
            />
          </TabsContent>
        )}

        {showRecordsTab && (
          <TabsContent value="records">
            <RelevantHistoryPanel patientId={patient.id} draft={visitDraft} analyzeToken={analyzeToken} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
