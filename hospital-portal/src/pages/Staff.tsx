import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from "@/components/ui/dialog";
import { hospitalApi } from "@/lib/api/hospital";
import { mapDepartment, mapStaffMember } from "@/lib/mappers";
import { Plus, Mail, KeyRound, Power } from "lucide-react";
import type { Role } from "@/lib/types";
import { ROLE_LABEL } from "@/store/auth";
import { toast } from "@/lib/notify";

const roleColor: Record<Role, string> = {
  receptionist: "bg-role-reception-light text-[hsl(var(--reception-accent))]",
  nurse: "bg-role-clinical-light text-[hsl(var(--clinical-accent))]",
  doctor: "bg-primary-light text-primary",
  dept_head: "bg-success/15 text-success",
  admin: "bg-role-admin-light text-[hsl(var(--admin-accent))]",
};

export default function Staff() {
  const qc = useQueryClient();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inv, setInv] = useState({ email: "", role: "nurse" as Role, department: "General" });

  const { data: staff = [], isLoading } = useQuery({
    queryKey: ["staff"],
    queryFn: async () => {
      const rows = await hospitalApi.staff() as Record<string, unknown>[];
      return rows.map(mapStaffMember);
    },
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments"],
    queryFn: async () => {
      const rows = await hospitalApi.departments() as Record<string, unknown>[];
      return rows.map(mapDepartment);
    },
  });

  const sendInvite = async () => {
    if (!inv.email.trim()) { toast.error("Email required"); return; }
    try {
      await hospitalApi.staffInvite({
        email: inv.email.trim(),
        role: inv.role,
        department: inv.department,
      });
      toast.success(`Invite sent to ${inv.email}`);
      qc.invalidateQueries({ queryKey: ["staff"] });
      setInviteOpen(false);
      setInv({ email: "", role: "nurse", department: "General" });
    } catch {
      toast.error("Failed to send invite");
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md">
        <div>
          <h1 className="h1">Staff</h1>
          <p className="body text-text-secondary">Manage hospital accounts, roles and departments.</p>
        </div>
        <Button className="bg-primary hover:bg-primary/90" onClick={() => setInviteOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Invite staff
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">{staff.length} accounts</CardTitle></CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="p-lg text-center text-sm text-text-secondary">Loading…</div>}
          <div className="hidden md:grid grid-cols-12 px-md py-sm bg-background-grey text-xs font-medium text-text-secondary border-b">
            <div className="col-span-3">Name</div>
            <div className="col-span-3">Email</div>
            <div className="col-span-2">Role</div>
            <div className="col-span-2">Department</div>
            <div className="col-span-1">Status</div>
            <div className="col-span-1 text-right">Actions</div>
          </div>
          <div className="divide-y">
            {staff.map(s => (
              <div key={s.id} className="flex md:grid md:grid-cols-12 md:items-center gap-sm px-md py-sm">
                <div className="md:col-span-3 flex items-center gap-sm min-w-0 flex-1">
                  <div className="h-8 w-8 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {s.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="font-medium text-sm truncate">{s.name}</div>
                    <div className="text-xs text-text-secondary truncate md:hidden">{s.email}</div>
                  </div>
                </div>
                <div className="hidden md:block md:col-span-3 text-sm text-text-secondary truncate">{s.email}</div>
                <div className="md:col-span-2">
                  <Badge variant="outline" className={`${roleColor[s.role]} capitalize`}>{ROLE_LABEL[s.role]}</Badge>
                </div>
                <div className="md:col-span-2 text-xs text-text-secondary">{s.department || "—"}</div>
                <div className="md:col-span-1">
                  <Badge variant="outline" className={s.active ? "border-success/30 text-success bg-success/10" : "border-error/30 text-error bg-error/10"}>
                    {s.active ? "Active" : "Inactive"}
                  </Badge>
                </div>
                <div className="md:col-span-1 md:text-right flex gap-1 md:justify-end">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Resend invite" onClick={() => toast.success("Invite resent")}>
                    <Mail className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Reset password" onClick={() => toast.success("Reset link sent")}>
                    <KeyRound className="h-3.5 w-3.5" />
                  </Button>
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Toggle active" onClick={() => toast.info("Contact admin to change status")}>
                    <Power className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Invite a staff member</DialogTitle></DialogHeader>
          <div className="space-y-md">
            <div className="space-y-xs">
              <Label>Email</Label>
              <Input value={inv.email} onChange={e => setInv({ ...inv, email: e.target.value })} placeholder="name@hospital.med" />
            </div>
            <div className="grid grid-cols-2 gap-sm">
              <div className="space-y-xs">
                <Label>Role</Label>
                <Select value={inv.role} onValueChange={v => setInv({ ...inv, role: v as Role })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receptionist">Receptionist</SelectItem>
                    <SelectItem value="nurse">Nurse</SelectItem>
                    <SelectItem value="doctor">Doctor</SelectItem>
                    <SelectItem value="dept_head">Department Head</SelectItem>
                    <SelectItem value="admin">Admin</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-xs">
                <Label>Department</Label>
                <Select value={inv.department} onValueChange={v => setInv({ ...inv, department: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {departments.map(d => <SelectItem key={d.id} value={d.name}>{d.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setInviteOpen(false)}>Cancel</Button>
            <Button onClick={sendInvite} className="bg-primary hover:bg-primary/90">Send invite</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
