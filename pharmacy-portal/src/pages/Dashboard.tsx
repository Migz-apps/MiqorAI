import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/MiqorAI/QRScanner";
import { StatusBadge } from "@/components/MiqorAI/StatusBadge";
import { ScanLine, Pill, Package, AlertTriangle, TrendingUp, Activity } from "lucide-react";
import { useAuth } from "@/store/auth";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapAdherenceTrend, mapInventoryItem } from "@/lib/api/mappers";
import { loadPrescriptions, pharmacyKeys } from "@/store/rx";

const StatCard = ({ icon: Icon, label, value, accent, sub }: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string | number;
  accent: string;
  sub?: string;
}) => (
  <Card>
    <CardContent className="p-md flex items-center gap-md">
      <div className={`h-10 w-10 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="min-w-0">
        <div className="text-xs text-text-secondary truncate">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
        {sub && <div className="text-[10px] text-text-secondary">{sub}</div>}
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const session = useAuth((s) => s.session)!;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });

  const { data: dashboard } = useQuery({
    queryKey: pharmacyKeys.dashboard(),
    queryFn: () => pharmacyApi.dashboard(),
  });
  const { data: prescriptions = [] } = useQuery({
    queryKey: pharmacyKeys.prescriptions(),
    queryFn: () => loadPrescriptions(),
  });
  const { data: adherenceData } = useQuery({
    queryKey: pharmacyKeys.adherence(),
    queryFn: () => pharmacyApi.adherence(),
  });

  const adherenceTrend = mapAdherenceTrend(
    (adherenceData?.trend as Array<{ month?: string; adherence_rate?: number }>) ?? [],
  );
  const lowStock = ((dashboard?.low_stock_items as unknown[]) ?? []).map((i) =>
    mapInventoryItem(i as Parameters<typeof mapInventoryItem>[0]),
  );

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div>
        <div className="text-xs text-text-secondary">{today}</div>
        <h1 className="h1">Good day, {session.name.split(" ")[0]}</h1>
        <p className="body text-text-secondary">Here's what's happening at {session.pharmacyName}.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard icon={Pill} label="Pending prescriptions" value={Number(dashboard?.pending_prescriptions ?? 0)} accent="bg-secondary/15 text-secondary" sub="Awaiting verification" />
        <StatCard icon={Package} label="Ready for pickup" value={Number(dashboard?.ready_for_pickup ?? 0)} accent="bg-pharmacy/15 text-pharmacy" sub="Prepared, not dispensed" />
        <StatCard icon={TrendingUp} label="Dispensed today" value={Number(dashboard?.completed_today ?? 0)} accent="bg-success/15 text-success" sub="Today's completions" />
        <StatCard icon={AlertTriangle} label="Low stock items" value={lowStock.length} accent="bg-error/15 text-error" sub="At or below threshold" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <ScanLine className="h-5 w-5 text-pharmacy" /> Scan patient QR
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QRScanner />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <CardTitle className="h3">Incoming prescriptions</CardTitle>
            <Link to="/prescriptions" className="text-xs text-pharmacy hover:underline">View all →</Link>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {prescriptions.slice(0, 5).map((r) => (
                <Link key={r.id} to={`/prescriptions/${r.id}`} className="flex items-center gap-md px-md py-sm hover:bg-background-grey transition">
                  <div className="h-9 w-9 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                    {r.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate flex items-center gap-sm">
                      {r.patientName}
                      {r.allergies.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-error/30 text-error bg-error/10">
                          <AlertTriangle className="h-2.5 w-2.5" /> Allergy
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary truncate">{r.id} · {r.diagnosis} · {r.doctorName}</div>
                  </div>
                  <StatusBadge status={r.status} />
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <Activity className="h-5 w-5 text-pharmacy" /> Average adherence — last 6 months
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={adherenceTrend}>
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
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <AlertTriangle className="h-5 w-5 text-secondary" /> Low stock alerts
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y">
              {lowStock.length === 0 ? (
                <div className="p-md text-sm text-text-secondary">All stock above minimum threshold.</div>
              ) : lowStock.map((it) => (
                <div key={it.id} className="flex items-center justify-between px-md py-sm bg-inventory-low/40">
                  <div>
                    <div className="text-sm font-medium">{it.name} <span className="text-text-secondary text-xs">{it.strength}</span></div>
                    <div className="text-xs text-text-secondary">Min {it.minStock} · {it.supplier}</div>
                  </div>
                  <Badge variant="outline" className="border-error/30 text-error bg-error/10">{it.stock} left</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
