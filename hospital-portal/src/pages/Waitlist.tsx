import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import { Phone, AlertTriangle, UserX, Clock, Bell } from "lucide-react";
import { PATIENTS, DEPARTMENTS, STAFF } from "@/lib/mockData";
import { useWaitlist, waitMinutes } from "@/store/waitlist";
import type { Department, Priority } from "@/lib/types";
import { toast } from "@/lib/notify";

const priorityBadge: Record<Priority, string> = {
  normal: "border-success/30 text-success bg-success/10",
  urgent: "border-secondary/40 text-secondary bg-secondary/10",
  emergency: "border-error/30 text-error bg-error/10",
};

export default function Waitlist() {
  const entries = useWaitlist(s => s.entries);
  const setStatus = useWaitlist(s => s.setStatus);
  const setPriority = useWaitlist(s => s.setPriority);
  const assign = useWaitlist(s => s.assign);
  const nav = useNavigate();

  const [filter, setFilter] = useState<Department | "all">("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const filtered = useMemo(() => {
    return entries
      .filter(e => filter === "all" || e.department === filter)
      .filter(e => {
        if (!search.trim()) return true;
        const p = PATIENTS.find(x => x.id === e.patientId);
        const q = search.toLowerCase();
        return (p?.name.toLowerCase().includes(q) || e.patientId.toLowerCase().includes(q)) ?? false;
      })
      .sort((a, b) => {
        const order: Record<Priority, number> = { emergency: 0, urgent: 1, normal: 2 };
        if (order[a.priority] !== order[b.priority]) return order[a.priority] - order[b.priority];
        return a.checkInTimestamp - b.checkInTimestamp;
      });
  }, [entries, filter, search]);

  const longWait = filtered.filter(e => waitMinutes(e) > 60 && e.status === "waiting");
  const emergencies = filtered.filter(e => e.priority === "emergency" && e.status === "waiting");

  const toggle = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const callAll = () => {
    if (selected.size === 0) { toast.warning("Select at least one patient first"); return; }
    toast.success(`SMS sent to ${selected.size} patient${selected.size > 1 ? "s" : ""}`);
    setSelected(new Set());
  };

  const markNoShowOldWaits = () => {
    const ids = filtered.filter(e => waitMinutes(e) > 60 && e.status === "waiting").map(e => e.id);
    ids.forEach(id => setStatus(id, "no-show"));
    toast.success(`${ids.length} patients marked no-show`);
  };

  const doctors = STAFF.filter(s => s.role === "doctor" || s.role === "dept_head").map(s => s.name);

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="h1">Waitlist</h1>
          <p className="body text-text-secondary">{entries.length} patients across all departments today.</p>
        </div>
        <div className="flex gap-sm">
          <Button variant="outline" size="sm" onClick={callAll} disabled={!selected.size}>
            <Phone className="h-4 w-4 mr-1" /> Call selected ({selected.size})
          </Button>
          <Button variant="outline" size="sm" onClick={markNoShowOldWaits}>
            <UserX className="h-4 w-4 mr-1" /> Auto no-show {">"} 60min
          </Button>
        </div>
      </div>

      {(longWait.length > 0 || emergencies.length > 0) && (
        <Card className="border-secondary/30 bg-secondary/5">
          <CardContent className="p-md flex items-start gap-sm">
            <AlertTriangle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
            <div className="text-sm space-y-1 flex-1">
              {emergencies.length > 0 && (
                <div className="text-error font-medium">
                  {emergencies.length} EMERGENCY priority patient{emergencies.length > 1 ? "s" : ""} waiting.
                </div>
              )}
              {longWait.length > 0 && (
                <div className="text-foreground">
                  {longWait.length} patient{longWait.length > 1 ? "s" : ""} waiting over 60 minutes:
                  <ul className="list-disc ml-5 text-text-secondary">
                    {longWait.slice(0, 3).map(e => {
                      const p = PATIENTS.find(x => x.id === e.patientId);
                      return <li key={e.id}>{p?.name} ({e.department}) — {waitMinutes(e)} minutes</li>;
                    })}
                  </ul>
                </div>
              )}
            </div>
            <Button size="sm" variant="outline"><Bell className="h-3 w-3 mr-1" /> Notify supervisor</Button>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="pb-sm space-y-sm">
          <div className="flex flex-wrap gap-sm">
            <Input placeholder="Search by name or ID…" value={search} onChange={e => setSearch(e.target.value)} className="max-w-xs" />
            <Select value={filter} onValueChange={v => setFilter(v as any)}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All departments</SelectItem>
                {DEPARTMENTS.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {filtered.length === 0 && <div className="p-lg text-center text-sm text-text-secondary">No patients in queue.</div>}
            {filtered.map(e => {
              const p = PATIENTS.find(x => x.id === e.patientId);
              const wait = waitMinutes(e);
              const longWaitRow = wait > 60 && e.status === "waiting";
              return (
                <div key={e.id} className={`px-md py-sm flex flex-wrap items-center gap-sm ${longWaitRow ? "bg-secondary/5" : ""}`}>
                  <Checkbox checked={selected.has(e.id)} onCheckedChange={() => toggle(e.id)} />
                  <div className="text-xs text-text-secondary w-14">{e.checkInTime}</div>
                  <button onClick={() => nav(`/patients/${e.patientId}`)} className="flex-1 min-w-[160px] text-left">
                    <div className="text-sm font-medium hover:underline">{p?.name || e.patientId}</div>
                    <div className="text-xs text-text-secondary">{e.patientId} · {e.reason || "—"}</div>
                  </button>
                  <Badge variant="outline" className="bg-background-grey">{e.department}</Badge>
                  <Select value={e.priority} onValueChange={v => setPriority(e.id, v as Priority)}>
                    <SelectTrigger className="w-[120px] h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="normal">Normal</SelectItem>
                      <SelectItem value="urgent">Urgent</SelectItem>
                      <SelectItem value="emergency">Emergency</SelectItem>
                    </SelectContent>
                  </Select>
                  <Badge variant="outline" className={`${priorityBadge[e.priority]} capitalize`}>{e.priority}</Badge>
                  <div className={`flex items-center gap-1 text-xs w-20 ${longWaitRow ? "text-secondary font-medium" : "text-text-secondary"}`}>
                    <Clock className="h-3 w-3" /> {wait}m
                  </div>
                  <Select value={e.assignedTo || ""} onValueChange={v => assign(e.id, v)}>
                    <SelectTrigger className="w-[160px] h-8 text-xs"><SelectValue placeholder="Assign…" /></SelectTrigger>
                    <SelectContent>
                      {doctors.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-xs">
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => toast.success(`Calling ${p?.name}…`)}>
                      Call
                    </Button>
                    <Button variant="ghost" size="sm" className="h-8 text-xs" onClick={() => { setStatus(e.id, "no-show"); toast.success("Marked no-show"); }}>
                      No-show
                    </Button>
                    <Select value={e.status} onValueChange={v => setStatus(e.id, v as any)}>
                      <SelectTrigger className="w-[140px] h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="waiting">Waiting</SelectItem>
                        <SelectItem value="with-nurse">With nurse</SelectItem>
                        <SelectItem value="with-doctor">With doctor</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="no-show">No-show</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
