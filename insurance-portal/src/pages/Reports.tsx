import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileBarChart2, Download, FileText, FileSpreadsheet, Calendar, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { insurerApi, insurerKeys } from "@/lib/api/insurer";
import { toast } from "@/lib/notify";

function fmtDate(d: string | Date): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

export default function Reports() {
  const queryClient = useQueryClient();
  const [metrics, setMetrics] = useState({ savings: true, adherence: true, fraud: true, members: false, contract: false });
  const [format, setFormat] = useState<"pdf" | "csv" | "excel">("pdf");
  const [from, setFrom] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [to, setTo] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: history, isLoading } = useQuery({
    queryKey: insurerKeys.reports,
    queryFn: insurerApi.reportHistory,
  });

  const generateMutation = useMutation({
    mutationFn: () => insurerApi.generateReport({
      date_range: { start: from, end: to },
      metrics: Object.entries(metrics).filter(([, v]) => v).map(([k]) => k),
      format,
    }),
    onSuccess: (res) => {
      window.open(res.report_url, "_blank");
      toast.success("Report generated", { description: "Your download should start shortly." });
      void queryClient.invalidateQueries({ queryKey: insurerKeys.reports });
    },
    onError: () => toast.error("Report generation failed"),
  });

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader title="Reports" subtitle="Build a custom report or download a previously generated one." />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <FileBarChart2 className="h-4 w-4 text-insurer" /> Report builder
            </CardTitle>
            <p className="text-xs text-text-secondary">Pick a date range, the metrics to include, and a delivery format.</p>
          </CardHeader>
          <CardContent className="space-y-lg">
            <div>
              <Label className="text-xs uppercase tracking-wide text-text-secondary mb-sm block">Date range</Label>
              <div className="grid grid-cols-2 gap-sm">
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="pl-9 h-10" />
                </div>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
                  <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="pl-9 h-10" />
                </div>
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-text-secondary mb-sm block">Metrics to include</Label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-sm">
                {[
                  { k: "savings", label: "Savings dashboard", desc: "Verified duplicate-test savings + audit trail" },
                  { k: "adherence", label: "Adherence outcomes", desc: "Medication adherence + at-risk patients" },
                  { k: "fraud", label: "Fraud detection", desc: "Flagged claims + provider rankings" },
                  { k: "members", label: "Member analytics", desc: "Cohort breakdown + risk distribution" },
                  { k: "contract", label: "Contract & billing", desc: "Invoices, fees, allowance usage" },
                ].map(m => (
                  <label key={m.k} className="flex gap-sm items-start p-sm rounded-md border border-border hover:border-insurer/40 cursor-pointer transition">
                    <Checkbox
                      checked={(metrics as Record<string, boolean>)[m.k]}
                      onCheckedChange={(v) => setMetrics(s => ({ ...s, [m.k]: !!v }))}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{m.label}</div>
                      <div className="text-[11px] text-text-secondary">{m.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <Label className="text-xs uppercase tracking-wide text-text-secondary mb-sm block">Format</Label>
              <RadioGroup value={format} onValueChange={(v) => setFormat(v as "pdf" | "csv" | "excel")} className="grid grid-cols-3 gap-sm">
                {[
                  { v: "pdf", label: "PDF", desc: "Board-ready", icon: FileText },
                  { v: "excel", label: "Excel", desc: "Pivots", icon: FileSpreadsheet },
                  { v: "csv", label: "CSV", desc: "Raw data", icon: FileSpreadsheet },
                ].map(f => (
                  <label key={f.v} className={`flex flex-col gap-1 p-sm rounded-md border cursor-pointer transition ${format === f.v ? "border-insurer bg-insurer-light" : "border-border hover:border-insurer/40"}`}>
                    <div className="flex items-center justify-between">
                      <f.icon className={`h-4 w-4 ${format === f.v ? "text-insurer" : "text-text-secondary"}`} />
                      <RadioGroupItem value={f.v} className="h-3.5 w-3.5" />
                    </div>
                    <div className="text-sm font-medium">{f.label}</div>
                    <div className="text-[11px] text-text-secondary">{f.desc}</div>
                  </label>
                ))}
              </RadioGroup>
            </div>

            <div className="flex items-center justify-between pt-md border-t">
              <div className="text-xs text-text-secondary flex items-center gap-1">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                Watermarked with your insurer code and timestamp.
              </div>
              <div className="flex gap-sm">
                <Button variant="outline" size="sm">Schedule monthly</Button>
                <Button
                  size="sm"
                  disabled={generateMutation.isPending}
                  onClick={() => generateMutation.mutate()}
                  className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground"
                >
                  <Download className="h-4 w-4" /> {generateMutation.isPending ? "Generating…" : "Generate report"}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Sample board report</CardTitle>
            <p className="text-xs text-text-secondary">A typical PDF includes:</p>
          </CardHeader>
          <CardContent className="space-y-2">
            {[
              { p: "Executive summary", n: "1 page" },
              { p: "Savings dashboard", n: "2 pages" },
              { p: "Adherence outcomes", n: "2 pages" },
              { p: "Fraud detection summary", n: "1 page" },
              { p: "Appendix: detailed tables", n: "10+ pages" },
            ].map((s, i) => (
              <div key={s.p} className="flex items-center gap-sm text-sm">
                <div className="h-6 w-6 rounded-full bg-insurer-light text-insurer text-xs font-semibold flex items-center justify-center">{i + 1}</div>
                <span className="flex-1">{s.p}</span>
                <span className="text-[11px] text-text-secondary">{s.n}</span>
              </div>
            ))}
            <div className="mt-md p-sm rounded-md bg-background-grey text-[11px] text-text-secondary">
              Generation typically takes &lt;5 seconds for a single month of data.
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Recent reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-md space-y-2">
              {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10" />)}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                  <TableHead>Report</TableHead>
                  <TableHead>Format</TableHead>
                  <TableHead>Generated</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(history ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center text-sm text-text-secondary py-8">No reports generated yet.</TableCell>
                  </TableRow>
                ) : (history ?? []).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium text-sm">{r.title}</TableCell>
                    <TableCell><Badge variant="outline" className="uppercase">{r.format}</Badge></TableCell>
                    <TableCell className="text-xs">{fmtDate(r.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 text-xs gap-1 text-insurer"
                        onClick={() => window.open(r.downloadUrl, "_blank")}
                      >
                        <Download className="h-3 w-3" /> Download
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
