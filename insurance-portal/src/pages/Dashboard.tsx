import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp, Users, Activity, ShieldAlert, Download, Share2, ArrowRight,
  FileBarChart2, CalendarDays, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { AnomalyAlert } from "@/components/MiqorAI/AnomalyAlert";
import { ProgressBar } from "@/components/MiqorAI/ProgressBar";
import { useAuth } from "@/store/auth";
import { downloadFile } from "@/lib/api/client";
import { insurerApi, insurerKeys, mapAlert, mapMedication } from "@/lib/api/insurer";
import { fmtKshShort, fmtNum, fmtPct } from "@/lib/format";
import { toast } from "@/lib/notify";

export default function Dashboard() {
  const session = useAuth(s => s.session)!;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });
  const reportStart = new Date();
  reportStart.setDate(1);
  const reportFrom = reportStart.toISOString().slice(0, 10);
  const reportTo = new Date().toISOString().slice(0, 10);

  const { data: dashboard, isLoading: dashLoading } = useQuery({
    queryKey: insurerKeys.dashboard,
    queryFn: insurerApi.dashboard,
  });

  const { data: alertsRaw, isLoading: alertsLoading } = useQuery({
    queryKey: insurerKeys.alerts,
    queryFn: insurerApi.alerts,
  });

  const { data: adherence } = useQuery({
    queryKey: insurerKeys.adherence,
    queryFn: insurerApi.adherence,
  });

  const alerts = (alertsRaw ?? []).map(mapAlert);
  const medAdherence = (adherence?.by_medication ?? []).map(mapMedication);
  const trendData = (dashboard?.savings_trend ?? []).map(t => ({
    category: t.category,
    savings: Math.round(t.savings / 1000),
    count: t.count,
  }));
  const maxHospitalFlagged = Math.max(1, ...(dashboard?.top_hospitals ?? []).map(h => h.flagged));

  const downloadSavingsSnapshot = async () => {
    try {
      const { download_url } = await insurerApi.exportSavings("csv");
      await downloadFile(download_url, "insurer-savings.csv");
      toast.success("Savings export downloaded");
    } catch {
      toast.error("Could not export savings");
    }
  };

  const exportAllData = async () => {
    try {
      const { report_url } = await insurerApi.generateReport({
        date_range: { start: reportFrom, end: reportTo },
        metrics: ["savings", "adherence", "fraud", "members", "contract"],
        format: "excel",
      });
      await downloadFile(report_url, "insurer-report.xlsx");
      toast.success("Board report downloaded");
    } catch {
      toast.error("Could not export insurer data");
    }
  };

  if (dashLoading) {
    return (
      <div className="space-y-lg max-w-[1500px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        subtitle={`${today} · Last data sync just now · Showing ${session.insurerName}`}
        right={
          <>
            <Button variant="outline" size="sm" className="gap-sm">
              <CalendarDays className="h-4 w-4" /> This month
            </Button>
            <Button asChild size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground">
              <Link to="/reports"><FileBarChart2 className="h-4 w-4" /> Generate report</Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={TrendingUp} label="Total savings" value={fmtKshShort(dashboard?.total_savings ?? 0)} hint="This month" accent="success" />
        <KpiCard icon={Users} label="Members covered" value={fmtNum(dashboard?.members_covered ?? 0)} accent="insurer" />
        <KpiCard icon={Activity} label="Adherence rate" value={fmtPct(dashboard?.adherence_rate ?? 0)} hint="Population average" accent="secondary" positive="up-good" />
        <KpiCard icon={Sparkles} label="ROI" value={`${dashboard?.roi ?? 0}×`} hint="Net savings ÷ MiqorAI fee" accent="primary" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <div>
              <CardTitle className="h3">Savings by category</CardTitle>
              <p className="text-xs text-text-secondary mt-1">Verified savings (KSh thousands) grouped by test category.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8" onClick={() => void downloadSavingsSnapshot()}><Download className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-8"><Share2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={trendData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="category" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: 8 }}
                    formatter={(v: number) => [`KSh ${v}k`, "Savings"]}
                  />
                  <Bar dataKey="savings" radius={[6, 6, 0, 0]}>
                    {trendData.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--insurer))" fillOpacity={1 - i * 0.15} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <CardTitle className="h3 flex items-center gap-sm">
              <ShieldAlert className="h-4 w-4 text-error" /> Alert center
            </CardTitle>
            <Badge variant="outline" className="bg-error/10 text-error border-error/30">
              {alerts.filter(a => a.severity === "high").length} new
            </Badge>
          </CardHeader>
          <CardContent className="space-y-sm">
            {alertsLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-16" />)
            ) : alerts.length === 0 ? (
              <p className="text-xs text-text-secondary">No active alerts.</p>
            ) : (
              alerts.slice(0, 4).map(a => <AnomalyAlert key={a.id} alert={a} />)
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <Card>
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <CardTitle className="h3">Top providers by risk</CardTitle>
            <Link to="/fraud" className="text-xs text-insurer hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-sm">
            {(dashboard?.top_hospitals ?? []).slice(0, 5).map(h => (
              <div key={h.name} className="grid grid-cols-[1fr_auto_120px] items-center gap-sm">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="text-[11px] text-text-secondary">Anomaly score {h.anomaly_score}</div>
                </div>
                <div className="num text-sm font-semibold text-error whitespace-nowrap">{h.flagged} flagged</div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={(h.flagged / maxHospitalFlagged) * 100} barClass="bg-error" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <CardTitle className="h3">Top medications by adherence</CardTitle>
            <Link to="/adherence" className="text-xs text-insurer hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-sm">
            {medAdherence.slice(0, 5).map(m => (
              <div key={m.medication} className="grid grid-cols-[1fr_auto_120px] items-center gap-sm">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate flex items-center gap-2">
                    {m.medication}
                    {m.alert && <Badge variant="outline" className="bg-error/10 text-error border-error/30 text-[10px]">Alert</Badge>}
                  </div>
                  <div className="text-[11px] text-text-secondary">{fmtNum(m.patients)} patients</div>
                </div>
                <div className={`num text-sm font-semibold whitespace-nowrap ${m.rate >= 85 ? "text-success" : m.rate >= 75 ? "text-secondary" : "text-error"}`}>
                  {fmtPct(m.rate)}
                </div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={m.rate} barClass={m.rate >= 85 ? "bg-success" : m.rate >= 75 ? "bg-secondary" : "bg-error"} />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gradient-to-br from-primary to-[hsl(213_38%_17%)] text-primary-foreground border-0">
        <CardContent className="p-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-md">
          <div>
            <div className="text-xs opacity-75 uppercase tracking-wide">Quick actions</div>
            <div className="text-lg font-semibold mt-1">Ready to share this month's results?</div>
            <div className="text-xs opacity-80 mt-1">
              Generate your monthly board report in PDF, or schedule a sync with the MiqorAI team.
            </div>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Button asChild variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to="/reports">Generate monthly report</Link>
            </Button>
            <Button variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground" onClick={() => void exportAllData()}>
              Export all data
            </Button>
            <Button variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
              Schedule meeting
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
