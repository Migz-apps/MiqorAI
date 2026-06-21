import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, AlertTriangle, CheckCircle2 } from "lucide-react";
import { SYSTEM_SERVICES, RECENT_INCIDENTS } from "@/lib/mockData";

export default function SystemHealth() {
  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><Activity className="h-6 w-6 text-primary" /> System health</h1>
        <p className="body text-text-secondary">Real-time status of every MiqorAI service.</p>
      </div>

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
            {SYSTEM_SERVICES.map(s => {
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

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Recent incidents</CardTitle></CardHeader>
        <CardContent>
          <ul className="space-y-sm text-sm">
            {RECENT_INCIDENTS.map(i => (
              <li key={i} className="flex items-start gap-sm">
                <CheckCircle2 className="h-4 w-4 text-success mt-0.5 shrink-0" />
                <span>{i}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
