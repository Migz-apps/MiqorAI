import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Building2, Plus } from "lucide-react";
import { DEPARTMENTS, STAFF } from "@/lib/mockData";
import { useWaitlist, waitMinutes } from "@/store/waitlist";
import { toast } from "@/lib/notify";

export default function Departments() {
  const [depts, setDepts] = useState(DEPARTMENTS);
  const entries = useWaitlist(s => s.entries);

  const toggle = (id: string) => setDepts(depts.map(d => d.id === id ? { ...d, isActive: !d.isActive } : d));

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md">
        <div>
          <h1 className="h1 flex items-center gap-sm"><Building2 className="h-6 w-6 text-primary" /> Departments</h1>
          <p className="body text-text-secondary">Manage queues, head doctors and intake configuration.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => toast.success("Department created (demo)")}>
          <Plus className="h-4 w-4 mr-1" /> Add department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {depts.map(d => {
          const queue = entries.filter(e => e.department === d.name && e.status !== "completed" && e.status !== "no-show");
          const avgWait = queue.length ? Math.round(queue.reduce((s, e) => s + waitMinutes(e), 0) / queue.length) : 0;
          const head = STAFF.find(s => s.id === d.headDoctorId);
          const overSLA = avgWait > d.targetWaitTimeMin;
          return (
            <Card key={d.id} className={!d.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="h3">{d.name}</CardTitle>
                  <Switch checked={d.isActive} onCheckedChange={() => toggle(d.id)} />
                </div>
                <div className="text-xs text-text-secondary">Head: {head?.name || "—"}</div>
              </CardHeader>
              <CardContent className="space-y-sm">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">In queue</span>
                  <span className="font-semibold">{queue.length}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Avg wait</span>
                  <Badge variant="outline" className={overSLA ? "border-secondary/30 text-secondary bg-secondary/10" : "border-success/30 text-success bg-success/10"}>
                    {avgWait}m / target {d.targetWaitTimeMin}m
                  </Badge>
                </div>
                <Button variant="outline" size="sm" className="w-full" onClick={() => toast("Edit configuration (demo)")}>Configure</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
