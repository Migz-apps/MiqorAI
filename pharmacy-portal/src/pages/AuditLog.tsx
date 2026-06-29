import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapAuditLog } from "@/lib/api/mappers";
import { pharmacyKeys } from "@/store/rx";

export default function AuditLog() {
  const { data: logs = [], isLoading } = useQuery({
    queryKey: pharmacyKeys.auditLogs(),
    queryFn: async () => {
      const res = await pharmacyApi.auditLogs({ limit: "50" });
      return (res.items as Parameters<typeof mapAuditLog>[0][]).map(mapAuditLog);
    },
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div>
        <h1 className="h1">Audit log</h1>
        <p className="body text-text-secondary">Tamper-evident record of every clinical and inventory action.</p>
      </div>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><ShieldCheck className="h-5 w-5 text-pharmacy" /> Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="p-md text-sm text-text-secondary">Loading audit log…</div>}
            {logs.map((a) => (
              <div key={a.id} className="flex items-start gap-md px-md py-sm">
                <div className={`mt-1 h-2 w-2 rounded-full ${a.level === "warning" ? "bg-secondary" : a.level === "success" ? "bg-success" : "bg-info"}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm">{a.action}</div>
                  <div className="text-xs text-text-secondary">{a.actor} · {formatDistanceToNow(new Date(a.at), { addSuffix: true })}</div>
                </div>
                <Badge variant="outline" className={
                  a.level === "warning" ? "border-secondary/30 text-secondary bg-secondary/10"
                    : a.level === "success" ? "border-success/30 text-success bg-success/10"
                      : "border-info/30 text-info bg-info/10"
                }>{a.level}</Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
