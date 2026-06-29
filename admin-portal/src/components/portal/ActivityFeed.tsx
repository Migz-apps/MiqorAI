import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, FileText, Hospital, Pill, UserCheck, Wallet } from "lucide-react";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const iconMap: Record<string, { icon: typeof Activity; tone: string }> = {
  checkin: { icon: UserCheck, tone: "text-info bg-info/10 border-info/30" },
  rx: { icon: Pill, tone: "text-success bg-success/10 border-success/30" },
  request: { icon: Hospital, tone: "text-primary bg-primary/10 border-primary/30" },
  report: { icon: FileText, tone: "text-purple bg-purple/10 border-purple/30" },
  alert: { icon: AlertTriangle, tone: "text-warning bg-warning/10 border-warning/30" },
  invoice: { icon: Wallet, tone: "text-pink bg-pink/10 border-pink/30" },
};

export function ActivityFeed() {
  const { data = [], isLoading } = useQuery({
    queryKey: adminKeys.activity,
    queryFn: () => adminApi.activity(),
  });

  return (
    <div className="rounded-xl border border-border bg-card-gradient shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Activity className="size-4 text-pink" />
          <h3 className="text-sm font-semibold">Live Activity Feed</h3>
          <span className="size-1.5 rounded-full bg-pink pulse-dot text-pink" />
        </div>
        <button className="text-xs text-muted-foreground hover:text-foreground">View all</button>
      </div>
      <ul className="max-h-[420px] overflow-y-auto scrollbar-thin divide-y divide-border/40">
        {isLoading ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">Loading activity…</li>
        ) : data.length === 0 ? (
          <li className="px-5 py-8 text-center text-sm text-muted-foreground">No recent activity</li>
        ) : (
          data.map((a, i) => {
            const m = iconMap[a.kind] ?? iconMap.request;
            const I = m.icon;
            return (
              <li key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-accent/30 transition-colors">
                <div className={cn("size-8 rounded-md grid place-items-center border", m.tone)}>
                  <I className="size-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm leading-snug">{a.text}</p>
                  <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                    <span>{timeAgo(a.createdAt)}</span>
                    {a.actor ? (
                      <>
                        <span>·</span>
                        <span>{a.actor}</span>
                      </>
                    ) : null}
                  </div>
                </div>
                {i === 0 && (
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">NEW</span>
                )}
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
