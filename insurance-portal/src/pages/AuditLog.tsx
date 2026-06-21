import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { AUDIT_LOG } from "@/lib/mockData";
import { ROLE_LABEL } from "@/store/auth";
import { fmtDateTime } from "@/lib/format";

export default function AuditLog() {
  const [q, setQ] = useState("");
  const filtered = AUDIT_LOG.filter(e => !q || e.user.toLowerCase().includes(q.toLowerCase()) || e.action.toLowerCase().includes(q.toLowerCase()) || e.resource.toLowerCase().includes(q.toLowerCase()));

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Audit log"
        subtitle="Every login, report generation, and data export — fully traceable."
      />

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between">
          <div className="flex items-center gap-sm">
            <ShieldCheck className="h-4 w-4 text-success" />
            <CardTitle className="h3">Activity</CardTitle>
            <Badge variant="outline" className="bg-success/10 text-success border-success/30">Tamper-evident</Badge>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9 w-64" placeholder="Search user, action, resource..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Resource</TableHead>
                <TableHead>IP</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(e => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs whitespace-nowrap">{fmtDateTime(e.timestamp)}</TableCell>
                  <TableCell className="text-sm">{e.user}</TableCell>
                  <TableCell><Badge variant="outline" className="capitalize">{ROLE_LABEL[e.role]}</Badge></TableCell>
                  <TableCell className="text-sm font-medium">{e.action}</TableCell>
                  <TableCell className="text-xs text-text-secondary">{e.resource}</TableCell>
                  <TableCell className="font-mono text-xs">{e.ip}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
