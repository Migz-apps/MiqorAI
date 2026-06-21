import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { ShieldAlert, Search, FileSearch, FlaskConical, Building, Download } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { ProgressBar } from "@/components/MiqorAI/ProgressBar";
import { StatusPill } from "@/components/MiqorAI/StatusPill";
import { FLAGGED_CLAIMS, PROVIDERS } from "@/lib/mockData";
import { fmtKsh, fmtNum } from "@/lib/format";
import { Input } from "@/components/ui/input";

export default function Fraud() {
  const [selected, setSelected] = useState<string[]>([]);
  const [q, setQ] = useState("");
  const totalFlagged = FLAGGED_CLAIMS.length;
  const high = FLAGGED_CLAIMS.filter(c => c.score >= 90).length;
  const med  = FLAGGED_CLAIMS.filter(c => c.score >= 70 && c.score < 90).length;
  const low  = 2_834;

  const filtered = FLAGGED_CLAIMS.filter(c =>
    !q ||
    c.id.toLowerCase().includes(q.toLowerCase()) ||
    c.patientName.toLowerCase().includes(q.toLowerCase()) ||
    c.provider.toLowerCase().includes(q.toLowerCase())
  );

  const toggle = (id: string) => setSelected(s => s.includes(id) ? s.filter(x => x !== id) : [...s, id]);

  const scoreBand = (s: number) => s >= 90 ? { label: "High",   cls: "bg-error/10 text-error border-error/30" }
                                  : s >= 70 ? { label: "Medium", cls: "bg-secondary/15 text-secondary border-secondary/30" }
                                  :           { label: "Low",    cls: "bg-info/10 text-info border-info/30" };

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Fraud detection"
        subtitle="Anomaly-scored claims requiring investigation. Last 7 days."
        right={<Button size="sm" variant="outline" className="gap-sm"><Download className="h-4 w-4" /> Export</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={ShieldAlert} label="High risk (>90)"   value={fmtNum(high)}     accent="error"     hint="Action required" />
        <KpiCard icon={FileSearch}  label="Medium risk (70-90)" value={fmtNum(med)}    accent="secondary" hint="Review" />
        <KpiCard icon={FlaskConical} label="Low risk (<70)"   value={fmtNum(low)}      accent="primary"   hint="Monitored" />
        <KpiCard icon={Building}    label="Total flagged"     value={`${totalFlagged} / ${fmtNum(2_940)}`} accent="insurer"  hint={`${((totalFlagged/2940)*100).toFixed(1)}% of claims`} />
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Anomaly score distribution</CardTitle>
        </CardHeader>
        <CardContent className="space-y-md">
          {[
            { band: "High Risk (Score > 90)",       count: high, color: "bg-error",     pct: 12 / 2940 * 100 },
            { band: "Medium Risk (70-90)",          count: med,  color: "bg-secondary", pct: 47 / 2940 * 100 },
            { band: "Low Risk (< 70)",              count: low,  color: "bg-info",      pct: 100 },
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
              {filtered.map(c => {
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
              {PROVIDERS.map(p => {
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
