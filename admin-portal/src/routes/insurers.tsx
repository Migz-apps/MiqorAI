import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { fmtKsh } from "@/lib/format";
import { ShieldCheck } from "lucide-react";
export const Route = createFileRoute("/insurers")({
  head: () => ({ meta: [{ title: "Insurers · MiqorAI Management" }] }),
  component: InsurersPage,
});

function InsurersPage() {
  const { data: insurers = [], isLoading } = useQuery({
    queryKey: adminKeys.insurers,
    queryFn: () => adminApi.insurersStats(),
  });

  return (
    <PageShell title="Insurance Partners" subtitle="Contracts, members & monthly recurring revenue">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading insurers…</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
          {insurers.map((i) => (
            <div key={i.id} className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-start justify-between">
                <div className="size-10 rounded-lg grid place-items-center bg-info/10 border border-info/30 text-info"><ShieldCheck className="size-5" /></div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded border bg-success/10 text-success border-success/30">
                  ACTIVE
                </span>
              </div>
              <div className="mt-3 text-sm font-semibold">{i.name}</div>
              <div className="mt-4 grid grid-cols-2 gap-3">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Members</div>
                  <div className="font-mono text-lg">{i.members.toLocaleString()}</div>
                </div>
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-muted-foreground">MRR</div>
                  <div className="font-mono text-lg text-success">{fmtKsh(i.mrr)}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
