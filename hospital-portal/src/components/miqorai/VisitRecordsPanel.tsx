import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { hospitalApi } from "@/lib/api/hospital";
import type { VisitDraftState, VisitRecordSection } from "@/lib/types";
import { FileText } from "lucide-react";

type Props = {
  patientId: string;
  draft: VisitDraftState;
};

function toApiDraft(draft: VisitDraftState) {
  return {
    chief_complaint: draft.chief,
    duration: draft.duration,
    severity: draft.severity,
    vitals: {
      bp: draft.bp || undefined,
      hr: draft.hr || undefined,
      temp: draft.temp || undefined,
      spo2: draft.spo2 || undefined,
      height: draft.height || undefined,
      weight: draft.weight || undefined,
    },
    diagnoses: draft.diagnoses,
    labs: draft.labs,
    notes: draft.notes,
  };
}

export const VisitRecordsPanel = ({ patientId, draft }: Props) => {
  const [debouncedKey, setDebouncedKey] = useState(JSON.stringify(draft));

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedKey(JSON.stringify(draft)), 400);
    return () => clearTimeout(timer);
  }, [draft]);

  const { data, isLoading } = useQuery({
    queryKey: ["hospital", "visit-record", patientId, debouncedKey],
    queryFn: async () => {
      const res = await hospitalApi.visitRecord(patientId, toApiDraft(JSON.parse(debouncedKey)));
      return res as { sections: VisitRecordSection[]; narrative: string };
    },
    enabled: !!patientId,
  });

  const sections = data?.sections ?? [];

  return (
    <Card>
      <CardHeader className="pb-sm">
        <CardTitle className="h3 flex items-center gap-sm">
          <FileText className="h-4 w-4 text-primary" /> Visit record
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-md">
        {isLoading && <div className="text-sm text-text-secondary">Updating record…</div>}
        {!isLoading && sections.length === 0 && (
          <div className="text-sm text-text-secondary">Enter visit details to build the record.</div>
        )}
        {sections.map((section, i) => (
          <div key={i} className="space-y-xs border-b last:border-0 pb-md last:pb-0">
            <h4 className="text-sm font-semibold">{section.title}</h4>
            <p className="text-sm leading-relaxed text-text-secondary whitespace-pre-wrap">{section.content}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
