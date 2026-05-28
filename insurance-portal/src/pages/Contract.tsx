import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/medpass/PageHeader";
import { ProgressBar } from "@/components/medpass/ProgressBar";
import { StatusPill } from "@/components/medpass/StatusPill";
import { INVOICES } from "@/lib/mockData";
import { fmtKsh } from "@/lib/format";

const USAGE = [
  { label: "API calls", used: 187_843, allow: 1_000_000, unit: "calls", color: "bg-insurer" },
  { label: "Members covered", used: 247_000, allow: 250_000, unit: "members", color: "bg-secondary" },
  { label: "Storage", used: 2.4, allow: 50, unit: "GB", color: "bg-success" },
];

export default function Contract() {
  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader title="Contract management" subtitle="Your active MediPass partnership, billing history, and usage." />

      <Card>
        <CardHeader className="pb-sm flex flex-row items-start justify-between gap-sm">
          <div>
            <CardTitle className="h3 flex items-center gap-sm">
              <FileText className="h-4 w-4 text-insurer" /> Active contract
            </CardTitle>
            <p className="text-xs text-text-secondary">Contract # MPC-JUB-2024-001 · Renews automatically</p>
          </div>
          <Badge variant="outline" className="bg-success/10 text-success border-success/30 gap-1">
            <CheckCircle2 className="h-3 w-3" /> Active
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {[
            { k: "Start date", v: "2024-01-01" },
            { k: "End date", v: "2026-12-31" },
            { k: "MediPass fee", v: "20% of verified savings" },
            { k: "Annual savings guarantee", v: "KSh 5,000,000" },
            { k: "Data access", v: "Anonymized population health" },
            { k: "Support", v: "24/7 email + phone" },
          ].map(t => (
            <div key={t.k} className="p-sm rounded-md bg-background-grey">
              <div className="text-[11px] uppercase tracking-wide text-text-secondary">{t.k}</div>
              <div className="text-sm font-semibold mt-1">{t.v}</div>
            </div>
          ))}
        </CardContent>
        <div className="px-md pb-md flex flex-wrap gap-sm">
          <Button size="sm" variant="outline" className="gap-sm"><Download className="h-3.5 w-3.5" /> Download PDF</Button>
          <Button size="sm" variant="outline">Request amendment</Button>
          <Button size="sm" variant="outline" className="gap-sm"><MessageSquare className="h-3.5 w-3.5" /> Contact MediPass</Button>
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Payment history</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                  <TableHead>Invoice</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead className="text-right">Gross savings</TableHead>
                  <TableHead className="text-right">MediPass fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due / Paid</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {INVOICES.map(inv => (
                  <TableRow key={inv.id}>
                    <TableCell className="font-mono text-xs font-medium">{inv.id}</TableCell>
                    <TableCell className="text-sm">{inv.period}</TableCell>
                    <TableCell className="num text-right text-success font-medium">{fmtKsh(inv.grossSavings)}</TableCell>
                    <TableCell className="num text-right">{fmtKsh(inv.fee)}</TableCell>
                    <TableCell><StatusPill status={inv.status} /></TableCell>
                    <TableCell className="text-xs">
                      <div>{inv.dueDate}</div>
                      {inv.paidDate && <div className="text-success">Paid {inv.paidDate}</div>}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0"><Download className="h-3.5 w-3.5" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Usage vs allowance</CardTitle>
          </CardHeader>
          <CardContent className="space-y-md">
            {USAGE.map(u => {
              const pct = (u.used / u.allow) * 100;
              const warn = pct > 90;
              return (
                <div key={u.label}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium flex items-center gap-1">
                      {warn && <AlertCircle className="h-3 w-3 text-secondary" />}
                      {u.label}
                    </span>
                    <span className="num text-text-secondary">
                      {typeof u.used === "number" && u.used < 100 ? u.used.toFixed(1) : u.used.toLocaleString()} / {u.allow.toLocaleString()} {u.unit}
                    </span>
                  </div>
                  <ProgressBar value={pct} barClass={warn ? "bg-secondary" : u.color} />
                </div>
              );
            })}
            <div className="pt-md border-t flex flex-col gap-sm">
              <Button size="sm" className="bg-insurer hover:bg-insurer/90 text-insurer-foreground">Upgrade plan</Button>
              <Button size="sm" variant="outline">View pricing</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
