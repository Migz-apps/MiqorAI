import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail } from "lucide-react";
import { PageHeader } from "@/components/miqorai/PageHeader";
import { insurerApi, insurerKeys, mapStaffRow, toBackendStaffRole } from "@/lib/api/insurer";
import { ROLE_LABEL, can, useAuth } from "@/store/auth";
import { initials, fmtDateTime } from "@/lib/format";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Role } from "@/lib/types";
import { toast } from "@/lib/notify";

const trackPill: Record<string, string> = {
  analyst: "bg-role-analyst-light role-analyst border-[hsl(var(--analyst-accent))]/20",
  fraud: "bg-role-fraud-light role-fraud border-[hsl(var(--fraud-accent))]/20",
  contracts: "bg-role-contracts-light role-contracts border-[hsl(var(--contracts-accent))]/20",
  executive: "bg-role-executive-light role-executive border-[hsl(var(--executive-accent))]/20",
  admin: "bg-role-admin-light role-admin border-[hsl(var(--admin-accent))]/20",
};

export default function Staff() {
  const session = useAuth((s) => s.session)!;
  const queryClient = useQueryClient();
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("analyst");
  const [editUserId, setEditUserId] = useState<string | null>(null);
  const [editRole, setEditRole] = useState<Role>("analyst");

  const { data: staffRaw, isLoading } = useQuery({
    queryKey: insurerKeys.staff,
    queryFn: insurerApi.staff,
  });

  const staff = (staffRaw ?? []).map(mapStaffRow);

  const inviteMutation = useMutation({
    mutationFn: () => insurerApi.inviteStaff({ email: inviteEmail, role: toBackendStaffRole(inviteRole) }),
    onSuccess: () => {
      setInviteEmail("");
      setInviteRole("analyst");
      toast.success("Invitation sent");
      void queryClient.invalidateQueries({ queryKey: insurerKeys.staff });
    },
    onError: () => toast.error("Could not invite teammate"),
  });

  const updateRoleMutation = useMutation({
    mutationFn: () => insurerApi.updateStaffRole(editUserId!, toBackendStaffRole(editRole)),
    onSuccess: () => {
      setEditUserId(null);
      toast.success("Role updated");
      void queryClient.invalidateQueries({ queryKey: insurerKeys.staff });
    },
    onError: () => toast.error("Could not update role"),
  });

  const deactivateMutation = useMutation({
    mutationFn: (userId: string) => insurerApi.deactivateStaff(userId),
    onSuccess: () => {
      toast.success("Staff member disabled");
      void queryClient.invalidateQueries({ queryKey: insurerKeys.staff });
    },
    onError: () => toast.error("Could not disable staff member"),
  });

  if (isLoading) {
    return (
      <div className="space-y-lg max-w-[1500px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Staff & permissions"
        subtitle="Manage who can access this insurer workspace."
        right={(
          <Dialog>
            <DialogTrigger asChild>
              <Button size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground" disabled={!can(session.role, "manageStaff")}>
                <UserPlus className="h-4 w-4" /> Invite teammate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite teammate</DialogTitle>
              </DialogHeader>
              <div className="space-y-md">
                <div className="space-y-xs">
                  <Label>Email</Label>
                  <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="teammate@insurer.com" />
                </div>
                <div className="space-y-xs">
                  <Label>Role</Label>
                  <Select value={inviteRole} onValueChange={(value) => setInviteRole(value as Role)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="analyst">Analyst</SelectItem>
                      <SelectItem value="fraud">Fraud Investigator</SelectItem>
                      <SelectItem value="contracts">Contracts Manager</SelectItem>
                      <SelectItem value="executive">Executive</SelectItem>
                      <SelectItem value="admin">Administrator</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button onClick={() => inviteMutation.mutate()} disabled={inviteMutation.isPending || !inviteEmail.trim()} className="bg-insurer hover:bg-insurer/90 text-insurer-foreground">
                  {inviteMutation.isPending ? "Sending..." : "Send invite"}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      />

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Team members</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead>Member</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Last login</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staff.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-sm text-text-secondary py-8">No staff members found.</TableCell>
                </TableRow>
              ) : staff.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>
                    <div className="flex items-center gap-sm">
                      <div className="h-9 w-9 rounded-full bg-insurer-light text-insurer flex items-center justify-center text-xs font-semibold">
                        {initials(s.name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{s.name}</div>
                        <div className="text-[11px] text-text-secondary">{s.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`capitalize ${trackPill[s.role]}`}>{ROLE_LABEL[s.role]}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">{fmtDateTime(s.lastLogin)}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={s.active ? "bg-success/10 text-success border-success/30" : "bg-muted text-text-secondary"}>
                      {s.active ? "Active" : "Disabled"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1" asChild><a href={`mailto:${s.email}`}><Mail className="h-3 w-3" /> Email</a></Button>
                    <Dialog>
                      <DialogTrigger asChild>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 text-xs"
                          disabled={!can(session.role, "manageStaff")}
                          onClick={() => {
                            setEditUserId(s.id);
                            setEditRole(s.role);
                          }}
                        >
                          Edit
                        </Button>
                      </DialogTrigger>
                      <DialogContent>
                        <DialogHeader>
                          <DialogTitle>Edit staff role</DialogTitle>
                        </DialogHeader>
                        <div className="space-y-md">
                          <div className="space-y-xs">
                            <Label>Role</Label>
                            <Select value={editRole} onValueChange={(value) => setEditRole(value as Role)}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                <SelectItem value="analyst">Analyst</SelectItem>
                                <SelectItem value="fraud">Fraud Investigator</SelectItem>
                                <SelectItem value="contracts">Contracts Manager</SelectItem>
                                <SelectItem value="executive">Executive</SelectItem>
                                <SelectItem value="admin">Administrator</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                        <DialogFooter>
                          <Button variant="outline" onClick={() => deactivateMutation.mutate(s.id)} disabled={deactivateMutation.isPending}>
                            Disable
                          </Button>
                          <Button onClick={() => updateRoleMutation.mutate()} disabled={updateRoleMutation.isPending || !editUserId} className="bg-insurer hover:bg-insurer/90 text-insurer-foreground">
                            {updateRoleMutation.isPending ? "Saving..." : "Save"}
                          </Button>
                        </DialogFooter>
                      </DialogContent>
                    </Dialog>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Role permissions</CardTitle>
          <p className="text-xs text-text-secondary">A summary of what each role can access.</p>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-sm">
          {[
            { r: "Analyst", d: "Dashboards, run reports, export data" },
            { r: "Fraud Investigator", d: "Claims audit, flag suspicious activity" },
            { r: "Contracts Manager", d: "Savings reports, manage contract & billing" },
            { r: "Executive", d: "High-level KPIs, board reports, ROI" },
            { r: "Administrator", d: "User management, API keys, billing" },
          ].map((p) => (
            <div key={p.r} className="p-sm rounded-md border">
              <div className="text-sm font-semibold">{p.r}</div>
              <div className="text-[11px] text-text-secondary mt-1">{p.d}</div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
