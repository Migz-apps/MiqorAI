import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Download, MessageSquare, CheckCircle2, AlertCircle } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { ProgressBar } from "@/components/MiqorAI/ProgressBar";
import { StatusPill } from "@/components/MiqorAI/StatusPill";
import { downloadFile } from "@/lib/api/client";
import { insurerApi, insurerKeys, mapInvoice } from "@/lib/api/insurer";
import { fmtKsh } from "@/lib/format";
import { toast } from "@/lib/notify";

function dateStr(d: string | Date): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

export default function Contract() {
  const { data: contract, isLoading: contractLoading } = useQuery({
    queryKey: insurerKeys.contract,
    queryFn: insurerApi.contract,
  });

  const { data: invoicesRaw, isLoading: invLoading } = useQuery({
    queryKey: insurerKeys.invoices,
    queryFn: insurerApi.invoices,
  });

  const { data: usage, isLoading: usageLoading } = useQuery({
    queryKey: insurerKeys.contractUsage,
    queryFn: insurerApi.contractUsage,
  });

  const invoices = (invoicesRaw ?? []).map(mapInvoice);
  const isLoading = contractLoading || invLoading || usageLoading;

  const downloadPdf = async () => {
    try {
      const { download_url } = await insurerApi.contractPdf();
      await downloadFile(download_url, "insurer-contract.pdf");
    } catch {
      toast.error("Could not download contract PDF");
    }
  };

  const downloadInvoicePdf = async (invoiceId: string) => {
    try {
      const { download_url } = await insurerApi.invoicePdf(invoiceId);
      await downloadFile(download_url, `insurer-invoice-${invoiceId}.pdf`);
      toast.success("Invoice downloaded");
    } catch {
      toast.error("Could not download invoice PDF");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-lg max-w-[1500px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  const usageItems = [
    { label: "API calls", used: usage?.api_calls_30d ?? 0, allow: usage?.api_call_limit ?? 1, unit: "calls", color: "bg-insurer" },
    { label: "Members covered", used: usage?.members_enrolled ?? 0, allow: usage?.member_allowance ?? 1, unit: "members", color: "bg-secondary" },
    { label: "Storage", used: usage?.storage_used_mb ?? 0, allow: usage?.storage_limit_mb ?? 1, unit: "MB", color: "bg-success" },
  ];

  const statusActive = contract?.status === "active";

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader title="Contract management" subtitle="Your active MiqorAI partnership, billing history, and usage." />

      <Card>
        <CardHeader className="pb-sm flex flex-row items-start justify-between gap-sm">
          <div>
            <CardTitle className="h3 flex items-center gap-sm">
              <FileText className="h-4 w-4 text-insurer" /> Active contract
            </CardTitle>
            <p className="text-xs text-text-secondary">
              {contract?.contract_id ? `Contract # ${contract.contract_id.slice(0, 12).toUpperCase()}` : "Default partnership"} · Renews automatically
            </p>
          </div>
          <Badge variant="outline" className={statusActive ? "bg-success/10 text-success border-success/30 gap-1" : "bg-secondary/15 text-secondary border-secondary/30 gap-1"}>
            <CheckCircle2 className="h-3 w-3" /> {contract?.status ?? "active"}
          </Badge>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-md">
          {[
            { k: "Start date", v: contract?.start_date ? dateStr(contract.start_date) : "—" },
            { k: "End date", v: contract?.end_date ? dateStr(contract.end_date) : "—" },
            { k: "MiqorAI fee", v: `${contract?.fee_percentage ?? usage?.fee_percentage ?? 20}% of verified savings` },
            { k: "Status", v: contract?.status ?? "active" },
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
          <Button size="sm" variant="outline" className="gap-sm" onClick={() => void downloadPdf()}>
            <Download className="h-3.5 w-3.5" /> Download PDF
          </Button>
          <Button size="sm" variant="outline">Request amendment</Button>
          <Button size="sm" variant="outline" className="gap-sm"><MessageSquare className="h-3.5 w-3.5" /> Contact MiqorAI</Button>
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
                  <TableHead className="text-right">MiqorAI fee</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due / Paid</TableHead>
                  <TableHead className="text-right">PDF</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-sm text-text-secondary py-8">No invoices yet.</TableCell>
                  </TableRow>
                ) : invoices.map(inv => (
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
                      <Button size="sm" variant="ghost" className="h-7 w-7 p-0" onClick={() => void downloadInvoicePdf(inv.sourceId)}>
                        <Download className="h-3.5 w-3.5" />
                      </Button>
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
            {usageItems.map(u => {
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
