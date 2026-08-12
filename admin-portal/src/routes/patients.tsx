import { createFileRoute } from "@tanstack/react-router";
import { useDeferredValue, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { toast } from "@/lib/notify";

export const Route = createFileRoute("/patients")({
  head: () => ({ meta: [{ title: "Patients · MiqorAI Management" }] }),
  component: PatientsPage,
});

function PatientsPage() {
  const queryClient = useQueryClient();
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim());

  const { data, isLoading } = useQuery({
    queryKey: deferredQuery ? adminKeys.patientSearch(deferredQuery) : adminKeys.patients,
    queryFn: () =>
      deferredQuery
        ? adminApi.searchPatients(deferredQuery, 50)
        : adminApi.patientsEnriched(50).then((items) => ({ items, total: items.length })),
  });

  const statusMutation = useMutation({
    mutationFn: ({ patientId, flagged }: { patientId: string; flagged: boolean }) =>
      adminApi.setPatientStatus(patientId, flagged),
    onSuccess: async (_, variables) => {
      toast.success(variables.flagged ? "Patient flagged" : "Patient restored");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminKeys.patients }),
        queryClient.invalidateQueries({ queryKey: adminKeys.patientSearch(deferredQuery) }),
      ]);
    },
    onError: (error) => toast.error(error),
  });

  const patients = data?.items ?? [];

  return (
    <PageShell
      title="Patients"
      subtitle="Search, audit and protect patient identities across the network"
    >
      <div className="flex items-center gap-2 h-11 px-3 rounded-md border border-border bg-card/60">
        <Search className="size-4 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by name, email, or patient ID..."
          className="flex-1 bg-transparent outline-none text-sm"
        />
        <kbd className="font-mono text-[10px] px-1.5 py-0.5 rounded border border-border bg-background/60">
          /
        </kbd>
      </div>
      <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        {isLoading ? (
          <div className="px-5 py-8 text-sm text-muted-foreground">Loading patients...</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr className="border-b border-border/60">
                <th className="text-left font-medium px-5 py-3">Patient ID</th>
                <th className="text-left font-medium px-2 py-3">Name</th>
                <th className="text-left font-medium px-2 py-3">Email</th>
                <th className="text-left font-medium px-2 py-3">Insurer</th>
                <th className="text-right font-medium px-2 py-3">Visits</th>
                <th className="text-left font-medium px-2 py-3">Status</th>
                <th className="text-right font-medium px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {patients.map((patient) => (
                <tr key={patient.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-mono text-xs">
                    {patient.id.slice(0, 8).toUpperCase()}
                  </td>
                  <td className="px-2 py-3 font-medium">{patient.name}</td>
                  <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                    {patient.email ?? "-"}
                  </td>
                  <td className="px-2 py-3">{patient.insurer ?? "-"}</td>
                  <td className="px-2 py-3 font-mono text-right">{patient.visit_count}</td>
                  <td className="px-2 py-3">
                    {!patient.flagged ? (
                      <span className="inline-flex items-center gap-1.5 text-xs">
                        <span className="size-1.5 rounded-full bg-success pulse-dot text-success" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 text-xs text-warning">
                        <span className="size-1.5 rounded-full bg-warning pulse-dot text-warning" />
                        Flagged
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(
                            [patient.email, "phone" in patient ? patient.phone : null]
                              .filter(Boolean)
                              .join(" · ") || "No contact details available.",
                          )
                        }
                        className="h-8 px-2.5 rounded-md border border-border text-xs hover:bg-accent"
                      >
                        Review
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          statusMutation.mutate({
                            patientId: patient.id,
                            flagged: !patient.flagged,
                          })
                        }
                        disabled={statusMutation.isPending}
                        className="h-8 px-2.5 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-60"
                      >
                        {patient.flagged ? "Unflag" : "Flag"}
                      </button>
                    </div>
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
