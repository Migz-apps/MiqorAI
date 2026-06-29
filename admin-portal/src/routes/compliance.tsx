import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { downloadFile } from "@/lib/api/client";
import { formatTs } from "@/lib/format";
import { toast } from "@/lib/notify";
import { Download } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/compliance")({
  head: () => ({ meta: [{ title: "Compliance · MiqorAI Management" }] }),
  component: CompliancePage,
});

function CompliancePage() {
  const { data: summary, isLoading: sumLoading } = useQuery({
    queryKey: adminKeys.compliance,
    queryFn: () => adminApi.complianceSummary(),
  });
  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: adminKeys.auditLogs,
    queryFn: () => adminApi.auditLogs(50),
  });

  const cards = summary
    ? [
        { k: "Events Today", v: summary.events_today.toLocaleString(), t: "primary" as const },
        { k: "Failed Logins", v: String(summary.failed_logins), t: "destructive" as const },
        { k: "Data Exports", v: String(summary.data_exports), t: "warning" as const },
      ]
    : [];

  const exportCsv = async () => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - 30);
    try {
      const { download_url } = await adminApi.exportAudit({
        date_range: {
          start: start.toISOString().slice(0, 10),
          end: end.toISOString().slice(0, 10),
        },
        format: "csv",
      });
      await downloadFile(download_url, "admin-audit-log.csv");
      toast.success("Audit log downloaded");
    } catch {
      toast.error("Audit export failed");
    }
  };

  return (
    <PageShell title="Compliance & Audit" subtitle="Append-only log · POPIA / GDPR ready">
      <div className="grid md:grid-cols-3 gap-4">
        {sumLoading ? (
          <div className="col-span-3 text-sm text-muted-foreground">Loading summary…</div>
        ) : (
          cards.map((c) => (
            <div key={c.k} className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
              <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{c.k}</div>
              <div className={cn("font-mono text-3xl font-semibold mt-2",
                c.t === "destructive" && "text-destructive", c.t === "warning" && "text-warning")}>{c.v}</div>
            </div>
          ))
        )}
      </div>

      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <h3 className="text-sm font-semibold">Audit Log</h3>
          <button type="button" onClick={() => void exportCsv()} className="h-8 px-3 inline-flex items-center gap-1.5 rounded-md border border-border text-xs hover:bg-accent">
            <Download className="size-3.5" /> Export CSV
          </button>
        </div>
        {auditLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading audit log…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left font-medium px-5 py-3">Timestamp</th>
                <th className="text-left font-medium px-2 py-3">User</th>
                <th className="text-left font-medium px-2 py-3">Action</th>
                <th className="text-left font-medium px-2 py-3">Resource</th>
                <th className="text-left font-medium px-2 py-3">IP</th>
                <th className="text-right font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {(audit?.items ?? []).map((a) => (
                <tr key={a.id} className="border-b border-border/30 hover:bg-accent/30 font-mono text-xs">
                  <td className="px-5 py-3 text-muted-foreground">{formatTs(a.createdAt)}</td>
                  <td className="px-2 py-3">{a.userEmail ?? "System"}</td>
                  <td className="px-2 py-3 text-primary">{a.action}</td>
                  <td className="px-2 py-3 text-muted-foreground">{a.resourceType}:{a.resourceId ?? ""}</td>
                  <td className="px-2 py-3 text-muted-foreground">{a.ipAddress ?? "—"}</td>
                  <td className={cn("px-5 py-3 text-right", a.success ? "text-success" : "text-destructive")}>{a.success ? "SUCCESS" : "FAILED"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </PageShell>
  );
}
