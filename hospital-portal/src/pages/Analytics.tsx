import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity, Pill } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";

export default function Analytics() {
  const { data: analytics, isLoading: loadingA } = useQuery({
    queryKey: ["analytics"],
    queryFn: () => hospitalApi.analytics(),
  });

  const { data: extended, isLoading: loadingE } = useQuery({
    queryKey: ["analytics", "extended"],
    queryFn: () => hospitalApi.analyticsExtended(),
  });

  const a = analytics as Record<string, unknown> | undefined;
  const e = extended as Record<string, unknown> | undefined;
  const total = Number(a?.total_patients ?? 0);
  const visitsWeek = Number(e?.visits_this_week ?? 0);
  const topConditions = (e?.top_conditions as Array<{ code: string; count: number }>) ?? [];

  const rows = [
    { label: "Patients (period)", value: total, icon: Users, accent: "bg-primary-light text-primary" },
    { label: "Visits this week", value: visitsWeek, icon: Activity, accent: "bg-success/15 text-success" },
    { label: "Avg wait (min)", value: Number(a?.average_wait_time ?? 0), icon: Pill, accent: "bg-secondary/15 text-secondary" },
    { label: "QR scans (period)", value: Number(e?.qr_scans_today ?? 0), icon: TrendingUp, accent: "bg-error/15 text-error" },
  ];

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1">Analytics</h1>
        <p className="body text-text-secondary">Hospital-wide overview.</p>
      </div>

      {(loadingA || loadingE) && <div className="text-sm text-text-secondary">Loading analytics…</div>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-md">
        {rows.map(r => (
          <Card key={r.label}>
            <CardContent className="p-md flex items-center gap-md">
              <div className={`h-10 w-10 rounded-md flex items-center justify-center ${r.accent}`}><r.icon className="h-5 w-5" /></div>
              <div>
                <div className="text-xs text-text-secondary">{r.label}</div>
                <div className="text-2xl font-bold">{r.value}</div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Top conditions</CardTitle></CardHeader>
        <CardContent className="space-y-sm">
          {topConditions.length === 0 && <div className="text-sm text-text-secondary">No diagnosis data yet.</div>}
          {topConditions.slice(0, 8).map(({ code, count }) => (
            <div key={code} className="flex items-center gap-sm">
              <div className="text-sm w-56 truncate">{code}</div>
              <div className="flex-1 h-2 rounded-full bg-background-grey overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${total ? (count / total) * 100 : count * 10}%` }} />
              </div>
              <div className="text-xs text-text-secondary w-8 text-right">{count}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
