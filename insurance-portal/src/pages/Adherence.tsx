import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Activity, AlertTriangle, Phone, Download, MessageSquare } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from "recharts";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { AdherenceGauge } from "@/components/MiqorAI/AdherenceGauge";
import { ProgressBar } from "@/components/MiqorAI/ProgressBar";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { KPI, MED_ADHERENCE, NON_ADHERENT } from "@/lib/mockData";
import { fmtKsh, fmtNum, fmtPct } from "@/lib/format";

export default function Adherence() {
  const colorFor = (rate: number) => rate >= 85 ? "hsl(var(--success))" : rate >= 75 ? "hsl(var(--secondary))" : "hsl(var(--error))";

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Adherence dashboard"
        subtitle="Track medication adherence to prevent the costliest outcome — hospitalisation."
        right={<Button size="sm" variant="outline" className="gap-sm"><Download className="h-4 w-4" /> Export</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-md">
        <Card className="lg:col-span-1">
          <CardContent className="p-md flex flex-col items-center justify-center text-center">
            <AdherenceGauge rate={KPI.adherence} target={KPI.adherenceTarget} size={160} />
            <div className="text-[11px] text-text-secondary mt-sm">Overall adherence rate</div>
          </CardContent>
        </Card>
        <KpiCard icon={Activity} label="Patients tracked" value={fmtNum(73_500)} delta={4} deltaLabel="vs Mar" accent="insurer" />
        <KpiCard icon={Phone}    label="Outreach this month" value={fmtNum(1_842)} delta={12} deltaLabel="reminders sent" accent="primary" />
        <KpiCard icon={AlertTriangle} label="At-risk patients" value={fmtNum(NON_ADHERENT.length * 47)} delta={-6} positive="down-good" deltaLabel="vs Mar" accent="error" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Adherence by medication</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={MED_ADHERENCE} margin={{ left: -8, right: 8, top: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="medication" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} domain={[60, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: any) => [`${v}%`, "Adherence"]} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {MED_ADHERENCE.map((m, i) => <Cell key={i} fill={colorFor(m.rate)} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Estimated savings from adherence</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="num text-3xl font-bold text-success">{fmtKsh(1_240_000)}</div>
            <div className="text-xs text-text-secondary">Hospitalisations prevented this month (modeled).</div>
            <div className="mt-md space-y-sm">
              {[
                { k: "Avoided ER visits", v: 312, c: "bg-success" },
                { k: "Med refills on-time", v: 18_420, c: "bg-insurer" },
                { k: "Reminder outreach", v: 1_842, c: "bg-primary" },
              ].map(s => (
                <div key={s.k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span>{s.k}</span><span className="num font-medium">{fmtNum(s.v)}</span>
                  </div>
                  <ProgressBar value={Math.min(100, s.v / 200)} barClass={s.c} />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Medication detail</CardTitle>
          <p className="text-xs text-text-secondary">Sorted by adherence rate. Action recommended where alerts appear.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead>Medication</TableHead>
                <TableHead>Patients</TableHead>
                <TableHead className="w-[280px]">Adherence</TableHead>
                <TableHead>Trend</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MED_ADHERENCE.map(m => (
                <TableRow key={m.medication}>
                  <TableCell className="font-medium">{m.medication}</TableCell>
                  <TableCell className="num">{fmtNum(m.patients)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="num text-sm font-semibold w-10" style={{ color: colorFor(m.rate) }}>{fmtPct(m.rate)}</div>
                      <div className="flex-1"><ProgressBar value={m.rate} barClass={m.rate >= 85 ? "bg-success" : m.rate >= 75 ? "bg-secondary" : "bg-error"} /></div>
                    </div>
                  </TableCell>
                  <TableCell className={`num text-sm ${m.trend > 0 ? "text-success" : m.trend < 0 ? "text-error" : "text-text-secondary"}`}>
                    {m.trend > 0 ? "↑" : m.trend < 0 ? "↓" : "→"} {Math.abs(m.trend)}%
                  </TableCell>
                  <TableCell>
                    {m.alert
                      ? <Badge variant="outline" className="bg-error/10 text-error border-error/30">Investigate</Badge>
                      : <Badge variant="outline" className="bg-success/10 text-success border-success/30">On track</Badge>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button size="sm" variant="ghost" className="h-7 text-xs text-insurer">View →</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm"><AlertTriangle className="h-4 w-4 text-error" /> Non-adherent patients (highest risk)</CardTitle>
          <p className="text-xs text-text-secondary">Patients overdue for refills. Send a reminder, or escalate to care management.</p>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-error/5 hover:bg-error/5">
                <TableHead>Patient</TableHead>
                <TableHead>Medication</TableHead>
                <TableHead>Days overdue</TableHead>
                <TableHead>Phone</TableHead>
                <TableHead className="text-right">Outreach</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {NON_ADHERENT.map(p => (
                <TableRow key={p.patientId}>
                  <TableCell>
                    <div className="font-medium text-sm">{p.name}</div>
                    <div className="font-mono text-[11px] text-text-secondary">{p.patientId}</div>
                  </TableCell>
                  <TableCell>{p.medication}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={p.daysOverdue >= 14 ? "bg-error/10 text-error border-error/30" : p.daysOverdue >= 7 ? "bg-secondary/15 text-secondary border-secondary/30" : "bg-info/10 text-info border-info/30"}>
                      {p.daysOverdue} days
                    </Badge>
                  </TableCell>
                  <TableCell className="font-mono text-xs">{p.phone}</TableCell>
                  <TableCell className="text-right">
                    <div className="inline-flex gap-1">
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><MessageSquare className="h-3 w-3" /> SMS</Button>
                      <Button size="sm" variant="ghost" className="h-7 text-xs gap-1"><Phone className="h-3 w-3" /> Call</Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
