import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { fmtKsh, timeAgo } from "@/lib/format";
import { Check, Eye, MapPin, X } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hospitals")({
  head: () => ({ meta: [{ title: "Hospitals · MiqorAI Management" }] }),
  component: HospitalsPage,
});

function HospitalsPage() {
  const [tab, setTab] = useState(0);
  const { data: pending } = useQuery({
    queryKey: adminKeys.pending,
    queryFn: () => adminApi.pendingApprovals(),
    enabled: tab === 0,
  });
  const { data: active } = useQuery({
    queryKey: adminKeys.hospitals("active"),
    queryFn: () => adminApi.hospitalsStats({ status: "active", limit: 50 }),
    enabled: tab === 1,
  });
  const { data: pilot } = useQuery({
    queryKey: adminKeys.hospitalsPilot,
    queryFn: () => adminApi.hospitalsPilotEnding(),
    enabled: tab === 2,
  });

  const tabs = [
    `Pending (${pending?.length ?? "…"})`,
    `Active (${active?.total ?? "…"})`,
    `Pilots Ending Soon (${pilot?.total ?? "…"})`,
    "All",
  ];

  return (
    <PageShell title="Hospital Management" subtitle="Approve, monitor & manage every hospital in the network">
      <div className="flex flex-wrap gap-2">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setTab(i)}
            className={cn("h-9 px-3.5 rounded-md text-xs font-medium border transition-all",
              tab === i ? "bg-primary/15 text-primary border-primary/40 glow-primary" : "border-border bg-card/60 text-muted-foreground hover:text-foreground")}>
            {t}
          </button>
        ))}
      </div>

      {tab === 0 && <PendingTable rows={pending ?? []} />}
      {tab === 1 && <ActiveTable hospitals={active?.items ?? []} total={active?.total} />}
      {tab === 2 && <ActiveTable hospitals={pilot?.items ?? []} total={pilot?.total} />}
      {tab === 3 && <AllHospitalsTable />}
    </PageShell>
  );
}

function PendingTable({ rows }: { rows: Array<{ id: string; name: string; location?: string | null; registrationRef: string; submittedByEmail: string; createdAt: string }> }) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Pending Approvals</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">{rows.length} WAITING</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/60">
            <th className="text-left font-medium px-5 py-3">Hospital</th>
            <th className="text-left font-medium px-2 py-3">Location</th>
            <th className="text-left font-medium px-2 py-3">Registration</th>
            <th className="text-left font-medium px-2 py-3">Requested by</th>
            <th className="text-left font-medium px-2 py-3">When</th>
            <th className="text-right font-medium px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-border/30 hover:bg-accent/30">
              <td className="px-5 py-3 font-medium">{r.name}</td>
              <td className="px-2 py-3 text-muted-foreground"><span className="inline-flex items-center gap-1"><MapPin className="size-3" />{r.location ?? "—"}</span></td>
              <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{r.registrationRef}</td>
              <td className="px-2 py-3">{r.submittedByEmail}</td>
              <td className="px-2 py-3 text-muted-foreground font-mono text-xs">{timeAgo(r.createdAt)}</td>
              <td className="px-5 py-3">
                <div className="flex justify-end gap-1.5">
                  <button type="button" className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md border border-border text-xs hover:bg-accent"><Eye className="size-3.5" /> Review</button>
                  <button type="button" className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-medium"><Check className="size-3.5" /> Approve</button>
                  <button type="button" className="h-8 w-8 grid place-items-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10"><X className="size-3.5" /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function ActiveTable({ hospitals, total }: { hospitals: Array<{ id: string; name: string; city: string; patient_count: number; total_savings: number; pilot_days_remaining: number | null; verified: boolean }>; total?: number }) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold">Hospitals</h3>
        <span className="text-xs text-muted-foreground font-mono">{hospitals.length} of {total ?? hospitals.length}</span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/60">
            <th className="text-left font-medium px-5 py-3">Hospital</th>
            <th className="text-left font-medium px-2 py-3">Location</th>
            <th className="text-right font-medium px-2 py-3">Patients</th>
            <th className="text-right font-medium px-2 py-3">Savings</th>
            <th className="text-left font-medium px-2 py-3">Pilot</th>
            <th className="text-left font-medium px-5 py-3">Status</th>
          </tr>
        </thead>
        <tbody>
          {hospitals.map((h) => {
            const days = h.pilot_days_remaining ?? 0;
            const ending = days <= 7;
            return (
              <tr key={h.id} className="border-b border-border/30 hover:bg-accent/30">
                <td className="px-5 py-3 font-medium">{h.name}</td>
                <td className="px-2 py-3 text-muted-foreground">{h.city}</td>
                <td className="px-2 py-3 font-mono text-right">{h.patient_count.toLocaleString()}</td>
                <td className="px-2 py-3 font-mono text-right text-success">{fmtKsh(h.total_savings)}</td>
                <td className="px-2 py-3">
                  <span className={cn("text-xs font-mono px-1.5 py-0.5 rounded border",
                    ending ? "bg-warning/10 text-warning border-warning/30" : "bg-info/10 text-info border-info/30")}>
                    {days}d left
                  </span>
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span className={cn("size-1.5 rounded-full pulse-dot",
                      h.verified ? "bg-success text-success" : "bg-warning text-warning")} />
                    {h.verified ? "Active" : "Needs review"}
                  </span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function AllHospitalsTable() {
  const { data } = useQuery({
    queryKey: adminKeys.hospitals("all"),
    queryFn: () => adminApi.hospitalsStats({ limit: 100 }),
  });
  return <ActiveTable hospitals={data?.items ?? []} total={data?.total} />;
}
