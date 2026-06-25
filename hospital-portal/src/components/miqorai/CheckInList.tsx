import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useWaitlist } from "@/store/waitlist";
import { mapVisitStatus } from "@/lib/mappers";

const statusStyle: Record<string, string> = {
  "waiting": "bg-secondary/15 text-secondary border-secondary/30",
  "with-nurse": "bg-primary-light text-primary border-primary/20",
  "with-doctor": "bg-success/15 text-success border-success/30",
};

export const CheckInList = () => {
  const nav = useNavigate();
  const entries = useWaitlist(s => s.entries);
  const loading = useWaitlist(s => s.loading);
  const active = entries.filter(e => e.status !== "completed" && e.status !== "no-show");

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-sm">
        <CardTitle className="h3 flex items-center gap-sm">
          <Clock className="h-5 w-5 text-primary" /> Check-in Queue
        </CardTitle>
        <Badge variant="outline">{loading ? "…" : active.length} waiting</Badge>
      </CardHeader>
      <CardContent className="p-0">
        {loading && <div className="p-md text-sm text-text-secondary">Loading queue…</div>}
        <div className="divide-y">
          {active.map(item => {
            const status = mapVisitStatus(item.status.replace(/-/g, "_"));
            const displayStatus = item.status;
            return (
              <div key={item.id} className="flex items-center gap-md px-md py-sm hover:bg-background-grey transition-colors">
                <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {(item.patientName ?? item.patientId).split(" ").map(n => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm">
                    <div className="font-medium truncate">{item.patientName ?? item.patientId}</div>
                  </div>
                  <div className="text-xs text-text-secondary truncate">{item.reason || item.department} · {item.checkInTime}</div>
                </div>
                <Badge variant="outline" className={statusStyle[displayStatus] ?? statusStyle.waiting}>{displayStatus.replace("-", " ")}</Badge>
                <Button size="sm" variant="ghost" onClick={() => nav(`/patients/${item.patientId}`)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
          {!loading && active.length === 0 && (
            <div className="p-md text-sm text-text-secondary">No patients in queue.</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
