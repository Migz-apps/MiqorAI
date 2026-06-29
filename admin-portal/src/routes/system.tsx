import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { cn } from "@/lib/utils";
import { Line, LineChart, ResponsiveContainer, Tooltip } from "recharts";

export const Route = createFileRoute("/system")({
  head: () => ({ meta: [{ title: "System · MiqorAI Management" }] }),
  component: SystemPage,
});

function healthRows(health: Awaited<ReturnType<typeof adminApi.systemHealth>> | undefined) {
  if (!health) return [];
  const uptime = health.uptime_30d_pct ?? 99.9;
  return [
    { name: "API Gateway", status: health.api_gateway.status === "up" ? "ok" : "warn", detail: `${Math.round(health.api_gateway.uptime ?? 0)}s uptime`, uptime },
    { name: "Database", status: health.database.status === "up" ? "ok" : "warn", detail: `${health.database.connections ?? 0} conn`, uptime },
    { name: "Sync Queue", status: (health.sync_queue.pending ?? 0) > 50 ? "warn" : "ok", detail: `${health.sync_queue.pending} pending`, uptime },
    { name: "Redis Cache", status: health.redis.status === "up" ? "ok" : "warn", detail: health.redis.status, uptime },
    { name: "Socket.io", status: health.socket_io?.status === "up" ? "ok" : "warn", detail: `${health.socket_io?.connections ?? 0} clients`, uptime },
    { name: "ML Inference", status: health.ml_inference?.status === "up" ? "ok" : "warn", detail: `${health.ml_inference?.latency_ms ?? 0}ms p95`, uptime },
  ];
}

function SystemPage() {
  const { data: health, isLoading } = useQuery({
    queryKey: adminKeys.systemHealth,
    queryFn: () => adminApi.systemHealth(),
  });
  const { data: latency = [] } = useQuery({
    queryKey: adminKeys.latency,
    queryFn: () => adminApi.systemLatency(),
  });

  const rows = healthRows(health);
  const chartData = latency.map((p) => ({ t: p.hour, ms: p.api_ms }));

  return (
    <PageShell title="System Health" subtitle="Real-time observability · the lights of your network">
      {isLoading ? (
        <div className="text-sm text-muted-foreground">Loading system health…</div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => (
            <div key={s.name} className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold">{s.name}</div>
                  <div className="text-[11px] text-muted-foreground font-mono mt-0.5">{s.detail}</div>
                </div>
                <span className={cn("size-2.5 rounded-full pulse-dot",
                  s.status === "ok" ? "bg-success text-success" : s.status === "warn" ? "bg-warning text-warning" : "bg-destructive text-destructive")} />
              </div>
              <div className="mt-3 font-mono text-2xl">{s.uptime}%</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground">uptime / 30d</div>
              <div className="h-12 mt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData}>
                    <Tooltip contentStyle={{ background: "var(--color-popover)", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 11 }} />
                    <Line type="monotone" dataKey="ms" stroke="oklch(0.62 0.11 200)" strokeWidth={1.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
