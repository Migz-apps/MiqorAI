import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { StatCard } from "@/components/portal/StatCard";
import { GlobalMap } from "@/components/portal/GlobalMap";
import { ActivityFeed } from "@/components/portal/ActivityFeed";
import { SystemHealth } from "@/components/portal/SystemHealth";
import { PendingApprovals } from "@/components/portal/PendingApprovals";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { downloadFile } from "@/lib/api/client";
import { fmtKsh } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { toast } from "@/lib/notify";
import {
  Wallet, Hospital, Pill, Users, Zap, FileText, ShieldCheck, UserPlus,
  TrendingUp, ArrowUpRight, Sparkles, Calendar, Download,
} from "lucide-react";
import {
  Area, AreaChart, ResponsiveContainer, Tooltip, XAxis, Bar, BarChart,
} from "recharts";

export const Route = createFileRoute("/")({
  beforeLoad: () => {
    const session = useAuth.getState().session;
    if (!session) {
      throw redirect({ to: "/login" });
    }
  },
  head: () => ({
    meta: [
      { title: "Dashboard · MiqorAI Management" },
      { name: "description", content: "Real-time command center for the MiqorAI network." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const { data: dash, isLoading } = useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: () => adminApi.dashboard(),
  });
  const { data: revenue } = useQuery({
    queryKey: adminKeys.revenue,
    queryFn: () => adminApi.revenue(),
  });
  const { data: hourly = [] } = useQuery({
    queryKey: adminKeys.hourly,
    queryFn: () => adminApi.hourlyMetrics(),
  });
  const { data: hospitals } = useQuery({
    queryKey: adminKeys.hospitals("active"),
    queryFn: () => adminApi.hospitalsStats({ status: "active", limit: 10 }),
  });

  if (isLoading || !dash) {
    return (
      <PageShell title="Dashboard" subtitle="Real-time command center · Africa network">
        <div className="text-sm text-muted-foreground">Loading dashboard…</div>
      </PageShell>
    );
  }

  const revenueSeries = (revenue?.by_customer_type ?? []).slice().reverse().map((r) => ({
    month: r.month,
    insurers: Math.round(r.insurers / 1000),
    hospitals: Math.round(r.hospitals / 1000),
    pharmacies: Math.round(r.pharmacies / 1000),
  }));

  const activityHourly = hourly.map((h) => ({
    h: new Date(h.hour).toLocaleTimeString("en-US", { hour: "numeric" }),
    scans: h.scans,
    scripts: h.scripts,
  }));

  const topHospitals = [...(hospitals?.items ?? [])]
    .sort((a, b) => b.total_savings - a.total_savings)
    .slice(0, 5);

  return (
    <PageShell title="Dashboard" subtitle="Real-time command center · Africa network">
      <HeroBanner dash={dash} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Total Savings" value={fmtKsh(dash.total_savings)} delta={23} icon={Wallet} accent="success" />
        <StatCard label="Hospitals Live" value={String(dash.total_hospitals)} delta={5} deltaLabel="this week" icon={Hospital} accent="primary" />
        <StatCard label="Pharmacies" value={String(dash.total_pharmacies)} delta={3} deltaLabel="this week" icon={Pill} accent="purple" />
        <StatCard label="Patients" value={dash.total_patients.toLocaleString()} delta={10} deltaLabel="this month" icon={Users} accent="pink" />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <GlobalMap />
          <NetworkPulse data={activityHourly} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <RevenueSnapshot series={revenueSeries} />
            <TopHospitals hospitals={topHospitals} />
          </div>
          <PendingApprovals />
        </div>
        <div className="space-y-6">
          <ActivityFeed />
          <SystemHealth />
          <QuickActions disputes={dash.open_disputes} />
        </div>
      </div>
    </PageShell>
  );
}

function HeroBanner({ dash }: { dash: Awaited<ReturnType<typeof adminApi.dashboard>> }) {
  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  const downloadInsurerReport = async () => {
    try {
      const { download_url } = await adminApi.insurerReport();
      await downloadFile(download_url, "insurer-report.pdf");
      toast.success("Insurer report downloaded");
    } catch {
      toast.error("Report generation failed");
    }
  };

  const downloadSnapshot = async () => {
    try {
      const { download_url } = await adminApi.exportDashboard();
      await downloadFile(download_url, "admin-snapshot.pdf");
      toast.success("Snapshot downloaded");
    } catch {
      toast.error("Snapshot export failed");
    }
  };

  return (
    <div className="relative overflow-hidden rounded-2xl border border-border bg-card-gradient p-6 lg:p-7 shadow-[var(--shadow-card)]">
      <div className="absolute inset-0 grid-bg opacity-40" />
      <div className="absolute -top-24 -right-16 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="absolute -bottom-24 -left-16 size-72 rounded-full bg-pink/15 blur-3xl" />

      <div className="relative flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
        <div className="space-y-3 max-w-2xl">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success text-[11px] font-mono">
            <span className="size-1.5 rounded-full bg-success pulse-dot text-success" />
            ALL SYSTEMS NOMINAL
            <span className="text-muted-foreground">·</span>
            <Calendar className="size-3" /> {today}
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Welcome back, <span className="text-gradient">Founder</span>.
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            The network saved patients <span className="text-foreground font-semibold">{fmtKsh(dash.total_savings)}</span> so
            far — {dash.total_hospitals} hospitals and {dash.total_pharmacies} pharmacies are live across the network.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3 min-w-[280px]">
          <RibbonStat label="MRR" value={fmtKsh(dash.mrr)} tone="text-primary" />
          <RibbonStat label="ARR" value={fmtKsh(dash.arr)} tone="text-pink" />
          <RibbonStat label="Pending" value={String(dash.pending_approvals)} tone="text-success" />
        </div>
      </div>

      <div className="relative mt-6 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void downloadInsurerReport()}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md bg-gradient-primary text-primary-foreground text-sm font-medium glow-primary hover:opacity-95"
        >
          <Sparkles className="size-4" /> Generate Insurer Report
        </button>
        <button
          type="button"
          onClick={() => void downloadSnapshot()}
          className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md border border-border bg-card/60 text-sm hover:bg-accent"
        >
          <Download className="size-4" /> Export Snapshot
        </button>
        {dash.open_disputes > 0 && (
          <Link to="/disputes" className="inline-flex items-center gap-2 h-9 px-3.5 rounded-md border border-warning/30 bg-warning/10 text-warning text-sm hover:bg-warning/20">
            <Zap className="size-4" /> {dash.open_disputes} dispute{dash.open_disputes === 1 ? "" : "s"} need review
          </Link>
        )}
      </div>
    </div>
  );
}

function RibbonStat({ label, value, tone }: { label: string; value: string; tone: string }) {
  return (
    <div className="rounded-lg border border-border bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
      <div className={`mt-1 font-mono text-base font-semibold ${tone}`}>{value}</div>
    </div>
  );
}

function NetworkPulse({ data }: { data: Array<{ h: string; scans: number; scripts: number }> }) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Network Pulse · last 24h</div>
          <div className="text-lg font-semibold mt-0.5">Scans & Prescriptions</div>
        </div>
        <div className="flex items-center gap-3 text-xs">
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-primary" /> QR Scans</span>
          <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-sm bg-pink" /> Prescriptions</span>
        </div>
      </div>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.11 200)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="oklch(0.62 0.11 200)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="g2" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="oklch(0.7 0.22 350)" stopOpacity={0.7} />
                <stop offset="100%" stopColor="oklch(0.7 0.22 350)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="h" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} interval={2} />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Area type="monotone" dataKey="scans" stroke="oklch(0.62 0.11 200)" fill="url(#g1)" strokeWidth={2} />
            <Area type="monotone" dataKey="scripts" stroke="oklch(0.7 0.22 350)" fill="url(#g2)" strokeWidth={2} />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function RevenueSnapshot({ series }: { series: Array<{ month: string; insurers: number; hospitals: number; pharmacies: number }> }) {
  const total = series[series.length - 1];
  const sum = total ? total.insurers + total.hospitals + total.pharmacies : 0;
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Revenue · recent months</div>
          <div className="mt-1 font-mono text-2xl font-semibold">KSh {sum}k</div>
        </div>
        <Link to="/billing" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          View billing <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <div className="h-32 mt-3">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={series} margin={{ top: 8, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" tick={{ fontSize: 10, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} />
            <Bar dataKey="insurers" stackId="a" fill="oklch(0.62 0.11 200)" radius={[0,0,0,0]} />
            <Bar dataKey="hospitals" stackId="a" fill="oklch(0.65 0.2 295)" />
            <Bar dataKey="pharmacies" stackId="a" fill="oklch(0.7 0.22 350)" radius={[4,4,0,0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

function TopHospitals({ hospitals }: { hospitals: Array<{ id: string; name: string; city: string; patient_count: number; total_savings: number }> }) {
  const max = hospitals[0]?.total_savings ?? 1;
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Leaderboard</div>
          <div className="text-base font-semibold">Top Performing Hospitals</div>
        </div>
        <Link to="/hospitals" className="text-[11px] text-muted-foreground hover:text-foreground inline-flex items-center gap-1">
          View all <ArrowUpRight className="size-3" />
        </Link>
      </div>
      <ul className="space-y-3">
        {hospitals.map((h, i) => {
          const pct = (h.total_savings / max) * 100;
          return (
            <li key={h.id} className="space-y-1.5">
              <div className="flex items-center gap-2 text-sm">
                <span className="font-mono text-[10px] w-5 text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 truncate font-medium">{h.name}</span>
                <span className="font-mono text-xs">{fmtKsh(h.total_savings)}</span>
              </div>
              <div className="relative h-1.5 rounded-full bg-background/60 overflow-hidden">
                <div className="absolute inset-y-0 left-0 bg-gradient-primary rounded-full" style={{ width: `${pct}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground font-mono">
                {h.city} · {h.patient_count.toLocaleString()} patients
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function QuickActions({ disputes }: { disputes: number }) {
  const items = [
    { label: "Approve Hospital", icon: Hospital, tone: "text-primary", to: "/hospitals" },
    { label: "Approve Pharmacy", icon: Pill, tone: "text-purple", to: "/pharmacies" },
    { label: "Insurer Report", icon: FileText, tone: "text-info", to: "/insurers" },
    { label: "Compliance Check", icon: ShieldCheck, tone: "text-success", to: "/compliance" },
    { label: disputes > 0 ? `View Disputes (${disputes})` : "View Disputes", icon: Zap, tone: "text-warning", to: "/disputes" },
    { label: "Invite Team Member", icon: UserPlus, tone: "text-pink", to: "/settings" },
  ] as const;
  return (
    <div className="rounded-xl border border-border bg-card-gradient p-3 shadow-[var(--shadow-card)]">
      <div className="px-2 py-2 text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Quick Actions</div>
      <div className="grid grid-cols-2 gap-2">
        {items.map(({ label, icon: I, tone, to }) => (
          <Link key={label} to={to} className="group flex items-center gap-2 rounded-md border border-border bg-background/40 p-2.5 text-left text-sm hover:border-primary/50 hover:bg-accent/40 transition-all">
            <I className={`size-4 ${tone}`} />
            <span className="truncate">{label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
