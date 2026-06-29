import { useQuery } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { Cpu } from "lucide-react";
import { adminApi, adminKeys } from "@/lib/api/admin";

function healthRows(health: Awaited<ReturnType<typeof adminApi.systemHealth>> | undefined) {
  if (!health) return [];
  const uptime = health.uptime_30d_pct ?? 99.9;
  return [
    { name: "API Gateway", status: health.api_gateway.status === "up" ? "ok" : "warn", detail: `${Math.round(health.api_gateway.uptime ?? 0)}s uptime`, uptime },
    { name: "Database", status: health.database.status === "up" ? "ok" : "warn", detail: `${health.database.connections ?? 0} conn`, uptime },
    { name: "Redis Cache", status: health.redis.status === "up" ? "ok" : "warn", detail: health.redis.status, uptime },
    { name: "Sync Queue", status: (health.sync_queue.pending ?? 0) > 50 ? "warn" : "ok", detail: `${health.sync_queue.pending} pending`, uptime },
    { name: "Socket.io", status: health.socket_io?.status === "up" ? "ok" : "warn", detail: `${health.socket_io?.connections ?? 0} clients`, uptime },
    { name: "ML Inference", status: health.ml_inference?.status === "up" ? "ok" : "warn", detail: `${health.ml_inference?.latency_ms ?? 0}ms p95`, uptime },
  ];
}

export function SystemHealth() {
  const { data, isLoading } = useQuery({
    queryKey: adminKeys.systemHealth,
    queryFn: () => adminApi.systemHealth(),
  });

  const rows = healthRows(data);
  const allGreen = rows.every((s) => s.status === "ok");

  return (
    <div className="rounded-xl border border-border bg-card-gradient shadow-[var(--shadow-card)]">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
        <div className="flex items-center gap-2">
          <Cpu className="size-4 text-primary" />
          <h3 className="text-sm font-semibold">System Health</h3>
        </div>
        <span
          className={cn(
            "text-[10px] font-mono px-1.5 py-0.5 rounded border",
            allGreen ? "bg-success/15 text-success border-success/30" : "bg-warning/15 text-warning border-warning/30",
          )}
        >
          {allGreen ? "ALL GREEN" : "CHECK"}
        </span>
      </div>
      <ul className="p-3 space-y-1.5">
        {isLoading ? (
          <li className="px-2 py-4 text-center text-sm text-muted-foreground">Loading…</li>
        ) : (
          rows.map((s) => {
            const tone = s.status === "ok" ? "text-success" : s.status === "warn" ? "text-warning" : "text-destructive";
            return (
              <li key={s.name} className="flex items-center gap-3 rounded-md px-2 py-2 hover:bg-accent/40">
                <span
                  className={cn(
                    "size-2 rounded-full pulse-dot",
                    tone,
                    s.status === "ok" ? "bg-success" : s.status === "warn" ? "bg-warning" : "bg-destructive",
                  )}
                />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono">{s.detail}</div>
                </div>
                <div className={cn("font-mono text-xs", tone)}>{s.uptime}%</div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}
