import { Link } from "react-router-dom";
import {
  TrendingUp, Users, Activity, ShieldAlert, Download, Share2, ArrowRight,
  FileBarChart2, CalendarDays, Sparkles,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid, Legend,
} from "recharts";
import { KpiCard } from "@/components/medpass/KpiCard";
import { PageHeader } from "@/components/medpass/PageHeader";
import { AnomalyAlert } from "@/components/medpass/AnomalyAlert";
import { ProgressBar } from "@/components/medpass/ProgressBar";
import { useAuth } from "@/store/auth";
import {
  KPI, SAVINGS_TREND, HOSPITALS, MED_ADHERENCE, ALERTS,
} from "@/lib/mockData";
import { fmtKsh, fmtKshShort, fmtNum, fmtPct } from "@/lib/format";

export default function Dashboard() {
  const session = useAuth(s => s.session)!;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const trendData = SAVINGS_TREND.map(t => ({
    month: t.month,
    Total: t.duplicates + t.adherence + t.fraud,
    Duplicates: t.duplicates,
    Adherence: t.adherence,
    Fraud: t.fraud,
  }));

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        subtitle={`${today} · Last data sync just now · Showing ${session.insurerName}`}
        right={
          <>
            <Button variant="outline" size="sm" className="gap-sm">
              <CalendarDays className="h-4 w-4" /> Apr 2026
            </Button>
            <Button asChild size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground">
              <Link to="/reports"><FileBarChart2 className="h-4 w-4" /> Generate report</Link>
            </Button>
          </>
        }
      />

      {/* KPI row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={TrendingUp} label="Total savings" value={fmtKshShort(KPI.totalSavings)} delta={KPI.totalSavingsDelta} deltaLabel="vs last month" accent="success" />
        <KpiCard icon={Users} label="Members covered" value={fmtNum(KPI.members)} delta={KPI.membersDelta} deltaLabel="vs Mar 2026" accent="insurer" />
        <KpiCard icon={Activity} label="Adherence rate" value={fmtPct(KPI.adherence)} delta={-3} deltaLabel={`Target ${KPI.adherenceTarget}%`} accent="secondary" positive="up-good" />
        <KpiCard icon={Sparkles} label="ROI" value={`${KPI.roi}×`} hint="Net savings ÷ MediPass fee" accent="primary" />
      </div>

      {/* Main row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-lg">
        <Card className="xl:col-span-2">
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <div>
              <CardTitle className="h3">Savings trend — last 12 months</CardTitle>
              <p className="text-xs text-text-secondary mt-1">Stacked monthly savings (KSh thousands), broken down by category.</p>
            </div>
            <div className="flex items-center gap-1">
              <Button variant="ghost" size="sm" className="h-8"><Download className="h-3.5 w-3.5" /></Button>
              <Button variant="ghost" size="sm" className="h-8"><Share2 className="h-3.5 w-3.5" /></Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <AreaChart data={trendData} margin={{ left: -8, right: 8, top: 8, bottom: 0 }}>
                  <defs>
                    <linearGradient id="dup" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--insurer))" stopOpacity={0.5} />
                      <stop offset="100%" stopColor="hsl(var(--insurer))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="adh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--success))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--success))" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="fra" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity={0.05} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="month" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12, padding: 8 }}
                    formatter={(v: any) => [`KSh ${v}k`, ""]}
                  />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                  <Area type="monotone" stackId="1" dataKey="Duplicates" stroke="hsl(var(--insurer))" fill="url(#dup)" strokeWidth={2} />
                  <Area type="monotone" stackId="1" dataKey="Adherence" stroke="hsl(var(--success))" fill="url(#adh)" strokeWidth={2} />
                  <Area type="monotone" stackId="1" dataKey="Fraud" stroke="hsl(var(--secondary))" fill="url(#fra)" strokeWidth={2} />
                </AreaChart>
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
              {ALERTS.filter(a => a.severity === "high").length} new
            </Badge>
          </CardHeader>
          <CardContent className="space-y-sm">
            {ALERTS.map(a => <AnomalyAlert key={a.id} alert={a} />)}
          </CardContent>
        </Card>
      </div>

      {/* Two list cards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
        <Card>
          <CardHeader className="pb-sm flex flex-row items-center justify-between">
            <CardTitle className="h3">Top hospitals by savings</CardTitle>
            <Link to="/savings" className="text-xs text-insurer hover:underline inline-flex items-center gap-1">
              View all <ArrowRight className="h-3 w-3" />
            </Link>
          </CardHeader>
          <CardContent className="space-y-sm">
            {HOSPITALS.slice(0, 5).map(h => (
              <div key={h.name} className="grid grid-cols-[1fr_auto_120px] items-center gap-sm">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{h.name}</div>
                  <div className="text-[11px] text-text-secondary">{h.region}</div>
                </div>
                <div className="num text-sm font-semibold text-success whitespace-nowrap">{fmtKsh(h.savings)}</div>
                <div className="flex items-center gap-2">
                  <ProgressBar value={h.share} max={20} barClass="bg-insurer" />
                  <div className="num text-[11px] text-text-secondary w-9 text-right">{h.share}%</div>
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
            {MED_ADHERENCE.slice(0, 5).map(m => (
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
                  <div className="num text-[11px] text-text-secondary w-9 text-right">{m.trend > 0 ? "+" : ""}{m.trend}%</div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <Card className="bg-gradient-to-br from-primary to-[hsl(213_38%_17%)] text-primary-foreground border-0">
        <CardContent className="p-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-md">
          <div>
            <div className="text-xs opacity-75 uppercase tracking-wide">Quick actions</div>
            <div className="text-lg font-semibold mt-1">Ready to share this month's results?</div>
            <div className="text-xs opacity-80 mt-1">
              Generate your monthly board report in PDF, or schedule a sync with the MediPass team.
            </div>
          </div>
          <div className="flex flex-wrap gap-sm">
            <Button asChild variant="secondary" className="bg-primary-foreground text-primary hover:bg-primary-foreground/90">
              <Link to="/reports">Generate monthly report</Link>
            </Button>
            <Button variant="outline" className="bg-transparent border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground">
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
