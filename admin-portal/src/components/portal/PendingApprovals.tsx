import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Hospital, Pill, ShieldCheck, X } from "lucide-react";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { timeAgo } from "@/lib/format";
import { toast } from "@/lib/notify";

const iconFor = (type: string) =>
  type === "hospital" ? Hospital : type === "pharmacy" ? Pill : ShieldCheck;

export function PendingApprovals() {
  const queryClient = useQueryClient();
  const { data = [], isLoading } = useQuery({
    queryKey: adminKeys.pending,
    queryFn: () => adminApi.pendingApprovals(),
  });

  const refreshPending = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pending }),
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveOnboarding(id),
    onSuccess: async () => {
      toast.success("Approval completed");
      await refreshPending();
    },
    onError: (error) => toast.error(error),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.rejectOnboarding(id, reason),
    onSuccess: async () => {
      toast.success("Request rejected");
      await refreshPending();
    },
    onError: (error) => toast.error(error),
  });

  return (
    <div className="rounded-xl border border-border bg-card-gradient shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <h3 className="text-sm font-semibold">Pending Approvals</h3>
        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-warning/15 text-warning border border-warning/30">
          {data.length} WAITING
        </span>
      </div>
      <ul className="divide-y divide-border/40">
        {isLoading ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">Loading...</li>
        ) : data.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">
            No pending approvals
          </li>
        ) : (
          data.map((request) => {
            const Icon = iconFor(request.type);
            return (
              <li key={request.id} className="px-5 py-3 flex items-center gap-3">
                <div className="size-9 rounded-lg border border-border bg-background/60 grid place-items-center text-primary">
                  <Icon className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{request.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {request.registrationRef} · {request.location ?? "-"} · {timeAgo(request.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      toast.info(
                        `${request.name} was submitted by ${request.submittedByEmail} for ${request.type} approval.`,
                      )
                    }
                    className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent"
                    title="Review"
                  >
                    <Eye className="size-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => approveMutation.mutate(request.id)}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-medium disabled:opacity-60"
                  >
                    <Check className="size-3.5" /> Approve
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const reason = window.prompt("Reason for rejection");
                      if (!reason?.trim()) return;
                      rejectMutation.mutate({ id: request.id, reason: reason.trim() });
                    }}
                    disabled={approveMutation.isPending || rejectMutation.isPending}
                    className="h-8 w-8 grid place-items-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                    title="Reject"
                  >
                    <X className="size-4" />
                  </button>
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
