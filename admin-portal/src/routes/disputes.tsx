import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { timeAgo } from "@/lib/format";
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/disputes")({
  head: () => ({ meta: [{ title: "Disputes · MiqorAI Management" }] }),
  component: DisputesPage,
});

function DisputesPage() {
  const queryClient = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.disputes,
    queryFn: () => adminApi.disputes(),
  });

  const refreshDisputes = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.disputes }),
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
  };

  const disputeMutation = useMutation({
    mutationFn: ({
      disputeId,
      status,
      resolutionNotes,
    }: {
      disputeId: string;
      status: "investigating" | "resolved" | "rejected";
      resolutionNotes?: string;
    }) => adminApi.updateDispute(disputeId, status, resolutionNotes),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "resolved"
          ? "Dispute resolved"
          : variables.status === "investigating"
            ? "Investigation started"
            : "Dispute rejected",
      );
      await refreshDisputes();
    },
    onError: (error) => toast.error(error),
  });

  const disputes = data?.items ?? [];

  return (
    <PageShell
      title="Dispute Resolution"
      subtitle="Open conflicts between patients, hospitals & pharmacies"
    >
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading disputes...</div>
      ) : disputes.length === 0 ? (
        <div className="text-sm text-muted-foreground">No open disputes</div>
      ) : (
        <div className="grid gap-4">
          {disputes.map((dispute) => {
            const patient = `${dispute.patient.firstName} ${dispute.patient.lastName}`;
            const party = dispute.hospital?.name ?? dispute.pharmacy?.name ?? "Unknown";
            return (
              <div
                key={dispute.id}
                className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]"
              >
                <div className="flex items-start gap-4">
                  <div
                    className={cn(
                      "size-10 rounded-lg grid place-items-center border",
                      dispute.priority === "high"
                        ? "bg-destructive/10 text-destructive border-destructive/30 glow-pink"
                        : "bg-warning/10 text-warning border-warning/30",
                    )}
                  >
                    <AlertTriangle className="size-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-xs text-primary">
                        {dispute.id.slice(0, 8).toUpperCase()}
                      </span>
                      <span
                        className={cn(
                          "text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border",
                          dispute.priority === "high"
                            ? "bg-destructive/15 text-destructive border-destructive/40"
                            : "bg-warning/15 text-warning border-warning/40",
                        )}
                      >
                        {dispute.priority}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        · opened {timeAgo(dispute.createdAt)}
                      </span>
                    </div>
                    <div className="mt-1 text-sm font-semibold">
                      {patient} <span className="text-muted-foreground font-normal">vs</span> {party}
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">Type: {dispute.type}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      Status: {dispute.status}
                    </div>
                    <p className="mt-3 text-sm text-foreground/90 italic border-l-2 border-border pl-3">
                      "{dispute.description}"
                    </p>
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        disputeMutation.mutate({
                          disputeId: dispute.id,
                          status: "investigating",
                          resolutionNotes:
                            dispute.status === "investigating"
                              ? undefined
                              : "Investigation opened by admin.",
                        })
                      }
                      disabled={disputeMutation.isPending || dispute.status === "resolved"}
                      className="h-8 px-3 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-xs font-medium disabled:opacity-60"
                    >
                      Investigate
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const resolution = window.prompt(
                          "Resolution notes",
                          "Issue reviewed and resolved by admin.",
                        );
                        if (resolution === null) return;
                        disputeMutation.mutate({
                          disputeId: dispute.id,
                          status: "resolved",
                          resolutionNotes:
                            resolution.trim() || "Issue reviewed and resolved by admin.",
                        });
                      }}
                      disabled={disputeMutation.isPending || dispute.status === "resolved"}
                      className="h-8 px-3 rounded-md border border-border text-xs hover:bg-accent disabled:opacity-60"
                    >
                      Resolve
                    </button>
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
