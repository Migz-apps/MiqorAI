import { useQuery } from "@tanstack/react-query";
import { Hospital, Pill, ShieldCheck, Check, X, Eye } from "lucide-react";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { timeAgo } from "@/lib/format";

const iconFor = (t: string) => (t === "hospital" ? Hospital : t === "pharmacy" ? Pill : ShieldCheck);

export function PendingApprovals() {
  const { data = [], isLoading } = useQuery({
    queryKey: adminKeys.pending,
    queryFn: () => adminApi.pendingApprovals(),
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
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">Loading…</li>
        ) : data.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">No pending approvals</li>
        ) : (
          data.map((p) => {
            const I = iconFor(p.type);
            return (
              <li key={p.id} className="px-5 py-3 flex items-center gap-3">
                <div className="size-9 rounded-lg border border-border bg-background/60 grid place-items-center text-primary">
                  <I className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono truncate">
                    {p.registrationRef} · {p.location ?? "—"} · {timeAgo(p.createdAt)}
                  </div>
                </div>
                <div className="flex items-center gap-1.5">
                  <button className="h-8 w-8 grid place-items-center rounded-md border border-border hover:bg-accent" title="Review">
                    <Eye className="size-4" />
                  </button>
                  <button className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-medium">
                    <Check className="size-3.5" /> Approve
                  </button>
                  <button className="h-8 w-8 grid place-items-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10" title="Reject">
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
