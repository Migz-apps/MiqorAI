import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { Pill } from "lucide-react";

export const Route = createFileRoute("/pharmacies")({
  head: () => ({ meta: [{ title: "Pharmacies · MiqorAI Management" }] }),
  component: PharmaciesPage,
});

function PharmaciesPage() {
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.pharmacies("active"),
    queryFn: () => adminApi.pharmaciesStats({ limit: 50 }),
  });

  const pharmacies = data?.items ?? [];

  return (
    <PageShell title="Pharmacies" subtitle="Verified dispensaries across the network">
      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <table className="w-full text-sm">
          <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
            <tr className="border-b border-border/60">
              <th className="text-left font-medium px-5 py-3">Pharmacy</th>
              <th className="text-left font-medium px-2 py-3">Location</th>
              <th className="text-left font-medium px-2 py-3">License</th>
              <th className="text-right font-medium px-2 py-3">Scripts</th>
              <th className="text-left font-medium px-5 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">Loading…</td></tr>
            ) : pharmacies.length === 0 ? (
              <tr><td colSpan={5} className="px-5 py-8 text-center text-muted-foreground">No pharmacies found</td></tr>
            ) : (
              pharmacies.map((p) => (
                <tr key={p.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium flex items-center gap-2"><Pill className="size-4 text-purple" />{p.name}</td>
                  <td className="px-2 py-3 text-muted-foreground">{p.city}</td>
                  <td className="px-2 py-3 font-mono text-xs text-muted-foreground">{p.licenseNumber ?? p.registrationNumber ?? "—"}</td>
                  <td className="px-2 py-3 font-mono text-right">{p.script_volume.toLocaleString()}</td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1.5 text-xs"><span className="size-1.5 rounded-full bg-success pulse-dot text-success" /> {p.verified ? "Active" : "Pending"}</span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </PageShell>
  );
}
