import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { formatTs, fmtKsh } from "@/lib/format";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/transactions")({
  head: () => ({ meta: [{ title: "Transactions · MiqorAI Management" }] }),
  component: TransactionsPage,
});

function TransactionsPage() {
  const { data: txns = [], isLoading: txLoading } = useQuery({
    queryKey: adminKeys.transactions,
    queryFn: () => adminApi.transactionsLedger(50),
  });
  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: adminKeys.auditLogs,
    queryFn: () => adminApi.auditLogs(4),
  });

  return (
    <PageShell title="Live Ledger" subtitle="Every scan, prescription and claim — append-only">
      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold">Live Stream</h3>
          <span className="inline-flex items-center gap-1.5 text-xs text-success">
            <span className="size-1.5 rounded-full bg-success pulse-dot text-success" /> streaming
          </span>
        </div>
        {txLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left font-medium px-5 py-3">Tx ID</th>
                <th className="text-left font-medium px-2 py-3">Type</th>
                <th className="text-left font-medium px-2 py-3">Description</th>
                <th className="text-right font-medium px-2 py-3">Amount</th>
                <th className="text-right font-medium px-5 py-3">Time</th>
              </tr>
            </thead>
            <tbody>
              {txns.map((t) => (
                <tr key={t.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-mono text-xs text-primary">{t.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-2 py-3">
                    <span className="text-[11px] font-mono px-1.5 py-0.5 rounded border bg-info/10 text-info border-info/30">
                      {t.kind}
                    </span>
                  </td>
                  <td className="px-2 py-3 text-muted-foreground">{t.description}</td>
                  <td className="px-2 py-3 font-mono text-right">{t.amount ? fmtKsh(t.amount) : "—"}</td>
                  <td className="px-5 py-3 font-mono text-xs text-muted-foreground text-right">{formatTs(t.at).split(" ")[1]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold">Recent audit trail</h3>
        </div>
        {auditLoading ? (
          <div className="px-5 py-6 text-sm text-muted-foreground">Loading…</div>
        ) : (
          <ul className="divide-y divide-border/40">
            {(audit?.items ?? []).map((a) => (
              <li key={a.id} className="px-5 py-2.5 flex items-center gap-3 text-xs font-mono">
                <span className="text-muted-foreground">{formatTs(a.createdAt)}</span>
                <span className="text-foreground">{a.userEmail ?? "System"}</span>
                <span className="text-primary">{a.action}</span>
                <span className="text-muted-foreground truncate">{a.resourceType}:{a.resourceId ?? ""}</span>
                <span className="ml-auto">{a.success ? "✓" : "✕"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageShell>
  );
}
