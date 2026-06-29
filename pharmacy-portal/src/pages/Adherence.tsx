import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar, CartesianGrid } from "recharts";
import { Badge } from "@/components/ui/badge";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapAdherenceTrend, mapPatientListItem } from "@/lib/api/mappers";
import { pharmacyKeys } from "@/store/rx";

export default function Adherence() {
  const { data: adherenceData } = useQuery({
    queryKey: pharmacyKeys.adherence(),
    queryFn: () => pharmacyApi.adherence(),
  });

  const { data: patients = [] } = useQuery({
    queryKey: pharmacyKeys.patients(),
    queryFn: async () => {
      const rows = await pharmacyApi.patients();
      return (rows as Array<{ id: string; name: string; phone?: string | null }>).map(mapPatientListItem);
    },
  });

  const adherenceTrend = mapAdherenceTrend(
    (adherenceData?.trend as Array<{ month?: string; adherence_rate?: number }>) ?? [],
  );

  const bucketsRaw = (adherenceData?.buckets as Record<string, number>) ?? {};
  const buckets = [
    { range: "Excellent", color: "hsl(var(--success))", value: bucketsRaw.excellent ?? 0 },
    { range: "Good", color: "hsl(var(--pharmacy))", value: bucketsRaw.good ?? 0 },
    { range: "Fair", color: "hsl(var(--secondary))", value: bucketsRaw.fair ?? 0 },
    { range: "Poor", color: "hsl(var(--error))", value: bucketsRaw.poor ?? 0 },
  ];

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div>
        <h1 className="h1">Adherence monitoring</h1>
        <p className="body text-text-secondary">Refill cadence vs prescribed days. Helps unlock insurer payments.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Average adherence — 6 months</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adherenceTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" stroke="hsl(var(--text-secondary))" fontSize={11} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} domain={[60, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--pharmacy))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Patient adherence buckets</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={buckets}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="range" stroke="hsl(var(--text-secondary))" fontSize={11} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} allowDecimals={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--pharmacy))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Patients needing follow-up</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {patients.filter((p) => p.adherence < 80).map((p) => (
              <div key={p.id} className="flex items-center gap-md px-md py-sm">
                <div className="h-9 w-9 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                  {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{p.name}</div>
                  <div className="text-xs text-text-secondary">{p.id} · {p.conditions[0] || "—"}</div>
                </div>
                <Badge variant="outline" className={p.adherence < 60 ? "border-error/30 text-error bg-error/10" : "border-secondary/30 text-secondary bg-secondary/10"}>
                  {p.adherence}%
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
