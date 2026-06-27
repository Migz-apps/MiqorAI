import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { aiApi, toVisitContext } from "@/lib/api/ai";
import type { VisitDraftState } from "@/lib/types";
import { FileText, Sparkles } from "lucide-react";

type Props = {
  patientId: string;
  draft: VisitDraftState;
  analyzeToken: number;
};

function hasAnalyzableContent(draft: VisitDraftState): boolean {
  return Boolean(
    draft.chief.trim() ||
      draft.symptoms.trim() ||
      draft.assessment.trim() ||
      draft.diagnoses.length,
  );
}

export const RelevantHistoryPanel = ({ patientId, draft, analyzeToken }: Props) => {
  const [debouncedDraft, setDebouncedDraft] = useState(draft);

  useEffect(() => {
    if (!hasAnalyzableContent(draft)) return;
    const timer = setTimeout(() => setDebouncedDraft(draft), 600);
    return () => clearTimeout(timer);
  }, [draft, analyzeToken]);

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["ai", "relevant-history", patientId, debouncedDraft, analyzeToken],
    queryFn: async () =>
      aiApi.relevantHistory({
        patientId,
        visitContext: toVisitContext(debouncedDraft),
      }),
    enabled: !!patientId && hasAnalyzableContent(debouncedDraft),
  });

  const items = data?.relevantHistory ?? [];

  return (
    <Card>
      <CardHeader className="pb-sm flex flex-row items-center justify-between gap-sm">
        <CardTitle className="h3 flex items-center gap-sm">
          <FileText className="h-4 w-4 text-primary" /> Relevant history
        </CardTitle>
        <Button
          type="button"
          size="sm"
          variant="outline"
          disabled={!hasAnalyzableContent(draft) || isFetching}
          onClick={() => void refetch()}
        >
          <Sparkles className="h-4 w-4 mr-1" /> Analyze visit
        </Button>
      </CardHeader>
      <CardContent className="space-y-md">
        {!hasAnalyzableContent(draft) && (
          <div className="text-sm text-text-secondary">
            Enter chief complaint, symptoms, assessment, or diagnosis to surface relevant prior records.
          </div>
        )}
        {data?.aiUnavailable && (
          <div className="text-sm text-warning">{data.message}</div>
        )}
        {(isLoading || isFetching) && hasAnalyzableContent(draft) && (
          <div className="text-sm text-text-secondary">Searching patient history…</div>
        )}
        {!isLoading && hasAnalyzableContent(draft) && items.length === 0 && !data?.aiUnavailable && (
          <div className="text-sm text-text-secondary">No closely matching prior records found.</div>
        )}
        {data?.keywords && data.keywords.length > 0 && (
          <div className="flex flex-wrap gap-xs">
            {data.keywords.slice(0, 8).map((kw) => (
              <Badge key={kw} variant="outline" className="text-xs">{kw}</Badge>
            ))}
          </div>
        )}
        {items.map((item, i) => (
          <div key={i} className="space-y-xs border-b last:border-0 pb-md last:pb-0">
            <div className="flex items-center justify-between gap-sm flex-wrap">
              <h4 className="text-sm font-semibold">{item.summary}</h4>
              <span className="text-xs text-text-secondary">{item.date} · {item.facility}</span>
            </div>
            <p className="text-xs text-primary">{item.reason}</p>
            {item.tests.length > 0 && (
              <p className="text-sm text-text-secondary">Tests: {item.tests.join(", ")}</p>
            )}
            {item.medications.length > 0 && (
              <p className="text-sm text-text-secondary">Medications: {item.medications.join(", ")}</p>
            )}
            {item.imaging.length > 0 && (
              <p className="text-sm text-text-secondary">Imaging: {item.imaging.join(", ")}</p>
            )}
          </div>
        ))}
      </CardContent>
    </Card>
  );
};
