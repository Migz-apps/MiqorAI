import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Building2, Plus } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";
import { mapDepartment, mapStaffMember } from "@/lib/mappers";
import type { DepartmentRecord } from "@/lib/types";
import { useWaitlist, waitMinutes } from "@/store/waitlist";
import { useEffect } from "react";
import { toast } from "@/lib/notify";

export default function Departments() {
  const qc = useQueryClient();
  const entries = useWaitlist((s) => s.entries);
  const refresh = useWaitlist((s) => s.refresh);
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<DepartmentRecord | null>(null);
  const [createForm, setCreateForm] = useState({ name: "", code: "", sla: "30" });
  const [editForm, setEditForm] = useState({ sla: "30", headId: "__none__" });

  useEffect(() => { void refresh(); }, [refresh]);

  const { data: depts = [], isLoading } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const rows = await hospitalApi.departments() as Record<string, unknown>[];
      return rows.map(mapDepartment);
    },
  });

  const { data: staff = [] } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const rows = await hospitalApi.staff() as Record<string, unknown>[];
      return rows.map(mapStaffMember);
    },
  });

  const doctors = staff.filter((s) => s.role === "doctor" || s.role === "dept_head");

  const createDept = async () => {
    if (!createForm.name.trim() || !createForm.code.trim()) {
      toast.error("Name and code are required");
      return;
    }
    try {
      await hospitalApi.createDepartment({
        name: createForm.name.trim(),
        code: createForm.code.trim().toUpperCase(),
        sla_target_minutes: parseInt(createForm.sla, 10) || 30,
      });
      await qc.invalidateQueries({ queryKey: ["departments"] });
      setCreateOpen(false);
      setCreateForm({ name: "", code: "", sla: "30" });
      toast.success("Department created");
    } catch {
      toast.error("Failed to create department");
    }
  };

  const toggleActive = async (d: DepartmentRecord) => {
    try {
      await hospitalApi.updateDepartment(d.id, { is_active: !d.isActive });
      await qc.invalidateQueries({ queryKey: ["departments"] });
      toast.success(d.isActive ? "Department deactivated" : "Department activated");
    } catch {
      toast.error("Failed to update department");
    }
  };

  const openEdit = (d: DepartmentRecord) => {
    setEditDept(d);
    setEditForm({
      sla: String(d.targetWaitTimeMin),
      headId: d.headDoctorId || "__none__",
    });
  };

  const saveEdit = async () => {
    if (!editDept) return;
    try {
      await hospitalApi.updateDepartment(editDept.id, {
        sla_target_minutes: parseInt(editForm.sla, 10) || 30,
        head_staff_id: editForm.headId === "__none__" ? null : editForm.headId,
      });
      await qc.invalidateQueries({ queryKey: ["departments"] });
      setEditDept(null);
      toast.success("Department updated");
    } catch {
      toast.error("Failed to update department");
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md">
        <div>
          <h1 className="h1 flex items-center gap-sm"><Building2 className="h-6 w-6 text-primary" /> Departments</h1>
          <p className="body text-text-secondary">Manage queues, head doctors and intake configuration.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Add department
        </Button>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading departments…</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-md">
        {depts.map((d) => {
          const queue = entries.filter((e) => e.department === d.name && e.status !== "completed" && e.status !== "no-show");
          const avgWait = queue.length ? Math.round(queue.reduce((s, e) => s + waitMinutes(e), 0) / queue.length) : 0;
          const head = staff.find((s) => s.id === d.headDoctorId || s.userId === d.headDoctorId);
          const overSLA = avgWait > d.targetWaitTimeMin;
          return (
            <Card key={d.id} className={!d.isActive ? "opacity-60" : ""}>
              <CardHeader className="pb-sm">
                <div className="flex items-center justify-between">
                  <CardTitle className="h3">{d.name}</CardTitle>
                  <Switch checked={d.isActive} onCheckedChange={() => void toggleActive(d)} />
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
                <Button variant="outline" size="sm" className="w-full" onClick={() => openEdit(d)}>Configure</Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add department</DialogTitle></DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <Label>Name</Label>
              <Input value={createForm.name} onChange={(e) => setCreateForm({ ...createForm, name: e.target.value })} placeholder="e.g. Dermatology" />
            </div>
            <div className="space-y-xs">
              <Label>Code</Label>
              <Input value={createForm.code} onChange={(e) => setCreateForm({ ...createForm, code: e.target.value })} placeholder="e.g. DERM" />
            </div>
            <div className="space-y-xs">
              <Label>Target wait (minutes)</Label>
              <Input type="number" value={createForm.sla} onChange={(e) => setCreateForm({ ...createForm, sla: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button onClick={() => void createDept()}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!editDept} onOpenChange={(o) => !o && setEditDept(null)}>
        <DialogContent>
          <DialogHeader><DialogTitle>Configure {editDept?.name}</DialogTitle></DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <Label>Head doctor</Label>
              <Select value={editForm.headId} onValueChange={(v) => setEditForm({ ...editForm, headId: v })}>
                <SelectTrigger><SelectValue placeholder="Select head…" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None</SelectItem>
                  {doctors.map((doc) => (
                    <SelectItem key={doc.id} value={doc.userId ?? doc.id}>{doc.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-xs">
              <Label>Target wait (minutes)</Label>
              <Input type="number" value={editForm.sla} onChange={(e) => setEditForm({ ...editForm, sla: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDept(null)}>Cancel</Button>
            <Button onClick={() => void saveEdit()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
