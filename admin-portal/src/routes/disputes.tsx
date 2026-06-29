import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { timeAgo } from "@/lib/format";
import { AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/disputes")({
  head: () => ({ meta: [{ title: "Disputes · MiqorAI Management" }] }),
  component: DisputesPage,
});

function DisputesPage() {
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.disputes,
    queryFn: () => adminApi.disputes(),
  });

  const disputes = data?.items ?? [];

  return (
    <PageShell title="Dispute Resolution" subtitle="Open conflicts between patients, hospitals & pharmacies">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading disputes…</div>
      ) : disputes.length === 0 ? (
        <div className="text-sm text-muted-foreground">No open disputes</div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((d) => {
            const patient = `${d.patient.firstName} ${d.patient.lastName}`;
            const party = d.hospital?.name ?? d.pharmacy?.name ?? "Unknown";
            return (
              <div key={d.id} className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
                <div className="flex items-start gap-4">
                  <div className={cn("size-10 rounded-lg grid place-items-center border",
                    d.priority === "high" ? "bg-destructive/10 text-destructive border-destructive/30 glow-pink" : "bg-warning/10 text-warning border-warning/30")}>
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-primary">{d.id.slice(0, 8).toUpperCase()}</span>
                      <span className={cn("text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border",
                        d.priority === "high" ? "bg-destructive/15 text-destructive border-destructive/40" : "bg-warning/15 text-warning border-warning/40")}>
                        {d.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">· opened {timeAgo(d.createdAt)}</span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">{patient} <span className="text-muted-foreground font-normal">vs</span> {party}</div>
                    <div className="mt-1 text-xs text-muted-foreground">Type: {d.type}</div>
                    <p className="mt-3 text-sm text-foreground/90 italic border-l-2 border-border pl-3">&quot;{d.description}&quot;</p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button type="button" className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs font-medium">Investigate</button>
                    <button type="button" className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent">Resolve</button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </PageShell>
  );
}
