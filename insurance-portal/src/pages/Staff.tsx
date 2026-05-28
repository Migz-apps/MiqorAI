import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { UserPlus, Mail } from "lucide-react";
import { PageHeader } from "@/components/medpass/PageHeader";
import { STAFF } from "@/lib/mockData";
import { ROLE_LABEL } from "@/store/auth";
import { initials, fmtDateTime } from "@/lib/format";

const trackPill: Record<string, string> = {
  analyst:   "bg-role-analyst-light role-analyst border-[hsl(var(--analyst-accent))]/20",
  fraud:     "bg-role-fraud-light role-fraud border-[hsl(var(--fraud-accent))]/20",
  contracts: "bg-role-contracts-light role-contracts border-[hsl(var(--contracts-accent))]/20",
  executive: "bg-role-executive-light role-executive border-[hsl(var(--executive-accent))]/20",
  admin:     "bg-role-admin-light role-admin border-[hsl(var(--admin-accent))]/20",
};

export default function Staff() {
  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Staff & permissions"
        subtitle="Manage who can access this insurer workspace."
        right={<Button size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground"><UserPlus className="h-4 w-4" /> Invite teammate</Button>}
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
              {STAFF.map(s => (
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
                    <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Mail className="h-3 w-3" /> Email</Button>
                    <Button size="sm" variant="ghost" className="h-7 text-xs">Edit</Button>
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
            { r: "Analyst",            d: "Dashboards, run reports, export data" },
            { r: "Fraud Investigator", d: "Claims audit, flag suspicious activity" },
            { r: "Contracts Manager",  d: "Savings reports, manage contract & billing" },
            { r: "Executive",          d: "High-level KPIs, board reports, ROI" },
            { r: "Administrator",      d: "User management, API keys, billing" },
          ].map(p => (
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
