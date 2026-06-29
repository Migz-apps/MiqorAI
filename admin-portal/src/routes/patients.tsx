import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { Search } from "lucide-react";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patients · MiqorAI Management" }] }),
  component: PatientsPage,
});

function PatientsPage() {
  const { data: patients = [], isLoading } = useQuery({
    queryKey: adminKeys.patients,
    queryFn: () => adminApi.patientsEnriched(50),
  });

  return (
    <PageShell title="Patients" subtitle="Search, audit and protect patient identities across the network">
      <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-border bg-card/60">
        <Search className="size-4 text-muted-foreground" />
        <input placeholder="Search by name, email, or patient ID…" className="flex-1 bg-transparent outline-none text-sm" />
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">/</kbd>
      </div>
      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading patients…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left font-medium px-5 py-3">Patient ID</th>
                <th className="text-left font-medium px-2 py-3">Name</th>
                <th className="text-left font-medium px-2 py-3">Email</th>
                <th className="text-left font-medium px-2 py-3">Insurer</th>
                <th className="text-right font-medium px-2 py-3">Visits</th>
                <th className="text-left font-medium px-5 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((p) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-mono text-xs">{p.id.slice(0, 8).toUpperCase()}</td>
                  <td className="px-2 py-3 font-medium">{p.name}</td>
                  <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{p.email ?? "—"}</td>
                  <td className="px-2 py-3">{p.insurer ?? "—"}</td>
                  <td className="px-2 py-3 font-mono text-right">{p.visit_count}</td>
                  <td className="px-5 py-3">
                    {!p.flagged
                      ? <span className="inline-flex items-center gap-1.5 text-xs"><span className="size-1.5 rounded-full bg-success pulse-dot text-success" /> Active</span>
                      : <span className="inline-flex items-center gap-1.5 text-xs text-warning"><span className="size-1.5 rounded-full bg-warning pulse-dot text-warning" /> Flagged</span>}
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
