import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { fmtKsh } from "@/lib/format";
import { Wallet, FileText, TrendingUp } from "lucide-react";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { StatCard } from "@/components/portal/StatCard";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/billing")({
  head: () => ({ meta: [{ title: "Billing · MiqorAI Management" }] }),
  component: BillingPage,
});

function BillingPage() {
  const { data: revenue, isLoading: revLoading } = useQuery({
    queryKey: adminKeys.revenue,
    queryFn: () => adminApi.revenue(),
  });
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: adminKeys.invoices,
    queryFn: () => adminApi.invoices(),
  });
  const { data: dash } = useQuery({
    queryKey: adminKeys.dashboard,
    queryFn: () => adminApi.dashboard(),
  });

  const revenueSeries = (revenue?.by_customer_type ?? []).slice().reverse().map((r) => ({
    month: r.month,
    insurers: Math.round(Number(r.insurers) / 1000),
    hospitals: Math.round(Number(r.hospitals) / 1000),
    pharmacies: Math.round(Number(r.pharmacies) / 1000),
  }));

  if (revLoading) {
    return (
      <PageShell title="Revenue & Billing" subtitle="Track every shilling flowing through MiqorAI">
        <div className="text-sm text-muted-foreground">Loading…</div>
      </PageShell>
    );
  }

  return (
    <PageShell title="Revenue & Billing" subtitle="Track every shilling flowing through MiqorAI">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="MRR" value={fmtKsh(revenue?.mrr ?? 0)} delta={23} icon={Wallet} accent="success" />
        <StatCard label="ARR" value={fmtKsh(revenue?.arr ?? 0)} delta={18} icon={TrendingUp} accent="primary" />
        <StatCard label="Total To Date" value={fmtKsh(revenue?.total_revenue ?? dash?.total_savings ?? 0)} delta={12} icon={FileText} accent="purple" />
        <StatCard label="Invoices" value={String(invoices.length)} delta={4} icon={TrendingUp} accent="pink" />
      </div>

      <div className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Revenue by customer type</div>
            <div className="text-lg font-semibold mt-0.5">Stacked Revenue (KSh ‘000)</div>
          </div>
        </div>
        <div className="h-72">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={revenueSeries}>
              <XAxis dataKey="month" tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 11, fill: "var(--color-muted-foreground)" }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }} cursor={{ fill: "oklch(1 0 0 / 0.04)" }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="insurers" stackId="a" fill="oklch(0.62 0.11 200)" radius={[0,0,0,0]} />
              <Bar dataKey="hospitals" stackId="a" fill="oklch(0.65 0.2 295)" />
              <Bar dataKey="pharmacies" stackId="a" fill="oklch(0.7 0.22 350)" radius={[6,6,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold">Invoices</h3>
        </div>
        {invLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading invoices…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left font-medium px-5 py-3">Invoice</th>
                <th className="text-left font-medium px-2 py-3">Customer</th>
                <th className="text-right font-medium px-2 py-3">Amount</th>
                <th className="text-left font-medium px-2 py-3">Period</th>
                <th className="text-left font-medium px-2 py-3">Due</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((i) => (
                <tr key={i.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-mono text-xs text-primary">{i.id.slice(0, 12).toUpperCase()}</td>
                  <td className="px-2 py-3 font-medium">{i.customerName}</td>
                  <td className="px-2 py-3 font-mono text-right">{fmtKsh(Number(i.amount))}</td>
                  <td className="px-2 py-3 text-muted-foreground">{i.period}</td>
                  <td className="px-2 py-3 text-muted-foreground">{new Date(i.dueDate).toLocaleDateString()}</td>
                  <td className="px-5 py-3">
                    <span className={cn("text-[10px] font-mono px-1.5 py-0.5 rounded border",
                      i.status === "paid" ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30")}>
                      {i.status.toUpperCase()}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
