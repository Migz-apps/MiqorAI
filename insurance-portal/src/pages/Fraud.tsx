import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, Search, FileSearch, FlaskConical, Building, Download } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { ProgressBar } from "@/components/MiqorAI/ProgressBar";
import { StatusPill } from "@/components/MiqorAI/StatusPill";
import { downloadFile } from "@/lib/api/client";
import { insurerApi, insurerKeys, mapFlaggedClaim, mapProvider } from "@/lib/api/insurer";
import { fmtKsh, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";
import { toast } from "@/lib/notify";

export default function Fraud() {
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");

  const { data: fraud, isLoading: fraudLoading } = useQuery({
    queryKey: insurerKeys.fraud(7),
    queryFn: () => insurerApi.fraud(7),
  });

  const { data: providersRaw, isLoading: provLoading } = useQuery({
    queryKey: insurerKeys.providers,
    queryFn: insurerApi.providers,
  });

  const flaggedClaims = (fraud?.flagged_claims ?? []).map(mapFlaggedClaim);
  const providers = (providersRaw ?? []).map(mapProvider);
  const high = fraud?.high_risk ?? 0;
  const med = fraud?.medium_risk ?? 0;
  const low = fraud?.low_risk ?? 0;
  const totalFlagged = flaggedClaims.length;
  const totalClaims = high + med + low;

  const filtered = flaggedClaims.filter(c =>
    !q ||
    c.id.toLowerCase().includes(q.toLowerCase()) ||
    c.patientName.toLowerCase().includes(q.toLowerCase()) ||
    c.provider.toLowerCase().includes(q.toLowerCase())
  );

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const scoreBand = (s: number) => s >= 90 ? { label: "High",   cls: "bg-error/10 text-error border-error/30" }
                                  : s >= 70 ? { label: "Medium", cls: "bg-secondary/15 text-secondary border-secondary/30" }
                                  :           { label: "Low",    cls: "bg-info/10 text-info border-info/30" };

  const exportData = async () => {
    try {
      const { download_url } = await insurerApi.exportFraud();
      await downloadFile(download_url, "insurer-fraud.csv");
      toast.success("Export ready");
    } catch {
      toast.error("Export failed");
    }
  };

  if (fraudLoading || provLoading) {
    return (
      <div className="space-y-lg max-w-[1500px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Fraud detection"
        subtitle="Anomaly-scored claims requiring investigation. Last 7 days."
        right={
          <Button size="sm" variant="outline" className="gap-sm" onClick={() => void exportData()}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={ShieldAlert} label="High risk (>90)" value={fmtNum(high)} accent="error" hint="Action required" />
        <KpiCard icon={FileSearch} label="Medium risk (70-90)" value={fmtNum(med)} accent="secondary" hint="Review" />
        <KpiCard icon={FlaskConical} label="Low risk (<70)" value={fmtNum(low)} accent="primary" hint="Monitored" />
        <KpiCard icon={Building} label="Total flagged" value={`${totalFlagged} / ${fmtNum(totalClaims)}`} accent="insurer" hint={totalClaims ? `${((totalFlagged / totalClaims) * 100).toFixed(1)}% of claims` : undefined} />
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Anomaly score distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { band: "High Risk (Score > 90)", count: high, color: "bg-error", pct: totalClaims ? (high / totalClaims) * 100 : 0 },
            { band: "Medium Risk (70-90)", count: med, color: "bg-secondary", pct: totalClaims ? (med / totalClaims) * 100 : 0 },
            { band: "Low Risk (< 70)", count: low, color: "bg-info", pct: totalClaims ? (low / totalClaims) * 100 : 0 },
          ].map(b => (
            <div key={b.band}>
              <div className="flex items-center justify-between text-xs mb-1.5">
                <div className="font-medium">{b.band}</div>
                <div className="num text-text-secondary">{fmtNum(b.count)} claims</div>
              </div>
              <ProgressBar value={b.pct} barClass={b.color} />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between gap-sm">
          <div>
            <CardTitle className="h3">Flagged claims</CardTitle>
            <p className="text-xs text-text-secondary">Click any claim to view full audit detail.</p>
          </div>
          <div className="flex items-center gap-sm">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9 w-56" placeholder="Search claim/patient..." />
            </div>
            {selected.length > 0 && (
              <div className="flex items-center gap-1 text-xs">
                <span className="text-text-secondary">{selected.length} selected</span>
                <Button size="sm" variant="outline" className="h-8">Assign investigator</Button>
                <Button size="sm" variant="outline" className="h-8">Mark false-positive</Button>
                <Button size="sm" variant="outline" className="h-8 border-error/30 text-error">Export to legal</Button>
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead className="w-8"></TableHead>
                <TableHead>Claim</TableHead>
                <TableHead>Patient</TableHead>
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Anomaly</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-sm text-text-secondary py-8">No flagged claims in the last 7 days.</TableCell>
                </TableRow>
              ) : filtered.map(c => {
                const sb = scoreBand(c.score);
                return (
                  <TableRow key={c.id} className="cursor-pointer">
                    <TableCell><Checkbox checked={selected.includes(c.id)} onCheckedChange={() => toggle(c.id)} /></TableCell>
                    <TableCell className="font-mono text-xs font-medium">{c.id}</TableCell>
                    <TableCell>
                      <div className="text-sm">{c.patientName}</div>
                      <div className="font-mono text-[11px] text-text-secondary">{c.patientId}</div>
                    </TableCell>
                    <TableCell className="text-sm">{c.provider}</TableCell>
                    <TableCell className="num text-right">{fmtKsh(c.amount)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="num font-semibold w-7">{c.score}</div>
                        <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">{c.pattern}</TableCell>
                    <TableCell><StatusPill status={c.status} /></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Provider ranking by anomaly score</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead>Provider</TableHead>
                <TableHead className="text-right">Total claims</TableHead>
                <TableHead>Anomaly score</TableHead>
                <TableHead className="text-right">Flagged</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {providers.map(p => {
                const sb = scoreBand(p.anomalyScore);
                return (
                  <TableRow key={p.name}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="num text-right">{fmtNum(p.totalClaims)}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="num font-semibold w-7">{p.anomalyScore}</div>
                        <Badge variant="outline" className={sb.cls}>{sb.label}</Badge>
                      </div>
                    </TableCell>
                    <TableCell className="num text-right">{p.flagged}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" className="h-7 text-xs text-insurer">
                        {p.anomalyScore >= 70 ? "Investigate" : "Monitor"} →
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
