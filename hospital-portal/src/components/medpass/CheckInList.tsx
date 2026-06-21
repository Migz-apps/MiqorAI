import { useNavigate } from "react-router-dom";
import { Clock, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CHECK_IN_QUEUE, PATIENTS } from "@/lib/mockData";

const statusStyle: Record<string, string> = {
  "waiting": "bg-secondary/15 text-secondary border-secondary/30",
  "with-nurse": "bg-primary-light text-primary border-primary/20",
  "with-doctor": "bg-success/15 text-success border-success/30",
};

export const CheckInList = () => {
  const nav = useNavigate();
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-sm">
        <CardTitle className="h3 flex items-center gap-sm">
          <Clock className="h-5 w-5 text-primary" /> Check-in Queue
        </CardTitle>
        <Badge variant="outline">{CHECK_IN_QUEUE.length} waiting</Badge>
      </CardHeader>
      <CardContent className="p-0">
        <div className="divide-y">
          {CHECK_IN_QUEUE.map(item => {
            const p = PATIENTS.find(x => x.id === item.patientId);
            if (!p) return null;
            return (
              <div key={item.patientId} className="flex items-center gap-md px-md py-sm hover:bg-background-grey transition-colors">
                <div className="h-10 w-10 rounded-full bg-primary-light text-primary flex items-center justify-center text-sm font-semibold shrink-0">
                  {p.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-sm">
                    <div className="font-medium truncate">{p.name}</div>
                    {p.allergies.length > 0 && <Badge className="bg-error/15 text-error border-error/30 hover:bg-error/15 text-[10px]">⚠ Allergy</Badge>}
                  </div>
                  <div className="text-xs text-text-secondary truncate">{item.reason} · {item.checkedInAt}</div>
                </div>
                <Badge variant="outline" className={statusStyle[item.status]}>{item.status.replace("-", " ")}</Badge>
                <Button size="sm" variant="ghost" onClick={() => nav(`/patients/${p.id}`)}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};
