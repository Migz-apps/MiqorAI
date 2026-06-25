import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";
import { mapLabListItem } from "@/lib/mappers";

const statusColor: Record<string, string> = {
  ordered: "border-secondary/30 text-secondary bg-secondary/10",
  "in-progress": "border-[hsl(var(--clinical-accent))]/30 text-[hsl(var(--clinical-accent))] bg-[hsl(var(--clinical-light))]",
  completed: "border-success/30 text-success bg-success/10",
};

export default function Labs() {
  const [tab, setTab] = useState<"all" | "trends">("all");

  const { data: labs = [], isLoading } = useQuery({
    queryKey: ["labs"],
    queryFn: async () => {
      const rows = await hospitalApi.labs() as Record<string, unknown>[];
      return rows.map(mapLabListItem);
    },
  });

  const { data: trends = [] } = useQuery({
    queryKey: ["labs", "trends"],
    queryFn: () => hospitalApi.labTrends() as Promise<Array<{ test: string; points: Array<{ date: string; value: unknown }> }>>,
    enabled: tab === "trends",
  });

  const all = useMemo(() => labs.sort((a, b) => b.date.localeCompare(a.date)), [labs]);
  const trendTest = trends[0];
  const points = trendTest?.points ?? [];

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="h1 flex items-center gap-sm"><Activity className="h-6 w-6 text-primary" /> Lab results</h1>
          <p className="body text-text-secondary">{all.length} orders · color-coded by clinical range.</p>
        </div>
        <div className="flex gap-xs">
          <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>All results</Button>
          <Button variant={tab === "trends" ? "default" : "outline"} size="sm" onClick={() => setTab("trends")}>Trends</Button>
        </div>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading labs…</div>}

      {tab === "all" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {all.map(l => (
                <div key={l.id} className="px-md py-sm flex items-center gap-md">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium">{l.test}</div>
                    <div className="text-xs text-text-secondary">{l.patientName} · {l.date} · {l.orderedBy}</div>
                  </div>
                  {l.result && <div className="text-sm font-semibold">{l.result}</div>}
                  <Badge variant="outline" className={statusColor[l.status]}>{l.status}</Badge>
                </div>
              ))}
              {!isLoading && all.length === 0 && (
                <div className="px-md py-sm text-sm text-text-secondary">No lab orders.</div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "trends" && (
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">{trendTest?.test ?? "Lab"} trends</CardTitle>
            <div className="text-xs text-text-secondary flex items-center gap-1">
              {points.length >= 2 ? (
                <><Minus className="h-3 w-3" /> {points.length} data points</>
              ) : (
                <span>Not enough data for trend</span>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {points.length === 0 ? (
              <div className="text-sm text-text-secondary">No trend data available.</div>
            ) : (
              <div className="grid grid-cols-4 gap-sm mt-md text-xs">
                {points.slice(-4).map((p, i) => (
                  <div key={i} className="text-center">
                    <div className="font-semibold">{String(p.value)}</div>
                    <div className="text-text-secondary">{String(p.date).slice(0, 10)}</div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
