import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";

export default function SystemHealth() {
  const { data: health, isLoading } = useQuery({
    queryKey: ["system", "health"],
    queryFn: () => hospitalApi.systemHealth(),
  });

  const h = health as Record<string, unknown> | undefined;
  const services = [
    { service: "API Gateway", status: (h?.api_gateway as { status?: string })?.status === "up" ? "Operational" : "Degraded", lastCheck: "Now", responseTime: `${Math.round(Number((h?.api_gateway as { uptime?: number })?.uptime ?? 0))}s uptime` },
    { service: "Database", status: (h?.database as { status?: string })?.status === "up" ? "Operational" : "Degraded", lastCheck: "Now", responseTime: `${(h?.database as { connections?: number })?.connections ?? 0} conn` },
    { service: "Redis", status: (h?.redis as { status?: string })?.status === "up" ? "Operational" : "Degraded", lastCheck: "Now", responseTime: "—" },
    { service: "Sync Queue", status: Number((h?.sync_queue as { pending?: number })?.pending ?? 0) > 50 ? "Degraded" : "Operational", lastCheck: "Now", responseTime: `${(h?.sync_queue as { pending?: number })?.pending ?? 0} pending` },
  ];

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><Activity className="h-6 w-6 text-primary" /> System health</h1>
        <p className="body text-text-secondary">Real-time status of every MiqorAI service.</p>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading health status…</div>}

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Services</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-12 px-md py-sm bg-background-grey text-xs font-medium text-text-secondary border-b">
            <div className="col-span-4">Service</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-3">Last check</div>
            <div className="col-span-2 text-right">Response</div>
          </div>
          <div className="divide-y">
            {services.map(s => {
              const ok = s.status === "Operational";
              return (
                <div key={s.service} className="grid md:grid-cols-12 gap-sm px-md py-sm items-center">
                  <div className="md:col-span-4 font-medium text-sm">{s.service}</div>
                  <div className="md:col-span-3">
                    <Badge variant="outline" className={ok ? "border-success/30 text-success bg-success/10" : "border-secondary/30 text-secondary bg-secondary/10"}>
                      {ok ? <CheckCircle2 className="h-3 w-3 mr-1" /> : <AlertTriangle className="h-3 w-3 mr-1" />}
                      {s.status}
                    </Badge>
                  </div>
                  <div className="md:col-span-3 text-xs text-text-secondary">{s.lastCheck}</div>
                  <div className="md:col-span-2 md:text-right text-xs font-mono text-text-secondary">{s.responseTime}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
