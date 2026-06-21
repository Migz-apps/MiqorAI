import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Activity, Pill } from "lucide-react";
import { PATIENTS } from "@/lib/mockData";

export default function Analytics() {
  const total = PATIENTS.length;
  const allergies = PATIENTS.filter(p => p.allergies.length > 0).length;
  const activeRx = PATIENTS.flatMap(p => p.prescriptions).filter(p => p.status === "active").length;
  const visits = PATIENTS.flatMap(p => p.visits).length;

  const rows = [
    { label: "Patients (this hospital)", value: total, icon: Users, accent: "bg-primary-light text-primary" },
    { label: "Visits (all-time)", value: visits, icon: Activity, accent: "bg-success/15 text-success" },
    { label: "Active prescriptions", value: activeRx, icon: Pill, accent: "bg-secondary/15 text-secondary" },
    { label: "Patients with allergies", value: allergies, icon: TrendingUp, accent: "bg-error/15 text-error" },
  ];

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1">Analytics</h1>
        <p className="body text-text-secondary">Hospital-wide overview.</p>
      </div>
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
          {Object.entries(PATIENTS.flatMap(p => p.conditions).reduce<Record<string, number>>((acc, c) => { acc[c] = (acc[c] || 0) + 1; return acc; }, {}))
            .sort((a,b) => b[1] - a[1]).slice(0, 8).map(([cond, n]) => (
              <div key={cond} className="flex items-center gap-sm">
                <div className="text-sm w-56 truncate">{cond}</div>
                <div className="flex-1 h-2 rounded-full bg-background-grey overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${(n / total) * 100}%` }} />
                </div>
                <div className="text-xs text-text-secondary w-8 text-right">{n}</div>
              </div>
            ))}
        </CardContent>
      </Card>
    </div>
  );
}
