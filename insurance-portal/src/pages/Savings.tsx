import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, ArrowUpDown, FlaskConical, Microscope, Boxes } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend, LineChart, Line,
} from "recharts";
import { PageHeader } from "@/components/medpass/PageHeader";
import { KpiCard } from "@/components/medpass/KpiCard";
import {
  HOSPITALS, SAVINGS_TREND, KPI, SAVINGS_RECORDS,
} from "@/lib/mockData";
import { fmtKsh, fmtKshShort, fmtNum } from "@/lib/format";

const breakdown = [
  { name: "Lab tests", value: 798_000, color: "hsl(var(--insurer))" },
  { name: "Imaging", value: 374_000, color: "hsl(var(--success))" },
  { name: "Other", value: 75_000, color: "hsl(var(--secondary))" },
];

export default function Savings() {
  const [q, setQ] = useState("");
  const filtered = SAVINGS_RECORDS.filter(r =>
    !q || r.testType.toLowerCase().includes(q.toLowerCase()) ||
    r.patientId.toLowerCase().includes(q.toLowerCase()) ||
    r.firstProvider.toLowerCase().includes(q.toLowerCase())
  );

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Savings dashboard"
        subtitle="Verified duplicate-test savings. Every Franc here is auditable to a claim."
        right={
          <>
            <Tabs defaultValue="apr">
              <TabsList className="h-9">
                <TabsTrigger value="jan">Jan</TabsTrigger>
                <TabsTrigger value="feb">Feb</TabsTrigger>
                <TabsTrigger value="mar">Mar</TabsTrigger>
                <TabsTrigger value="apr">Apr</TabsTrigger>
                <TabsTrigger value="ytd">YTD</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" className="gap-sm"><Download className="h-4 w-4" /> CSV</Button>
            <Button size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground">
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={FlaskConical} label="Verified savings" value={fmtKshShort(KPI.totalSavings)} delta={KPI.totalSavingsDelta} deltaLabel="vs Mar" accent="success" />
        <KpiCard icon={Boxes} label="Duplicates blocked" value={fmtNum(KPI.duplicateTests)} delta={18} deltaLabel="vs Mar" accent="insurer" />
        <KpiCard icon={Microscope} label="Avg savings / claim" value={fmtKsh(97)} delta={4} deltaLabel="vs Mar" accent="primary" />
        <KpiCard icon={FlaskConical} label="Hospitalizations prevented" value={fmtNum(KPI.hospitalizationsPrevented)} delta={9} deltaLabel="modeled" accent="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Savings by hospital</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={HOSPITALS} layout="vertical" margin={{ left: 24, right: 24, top: 4, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--text-secondary))" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--text-secondary))" fontSize={11} width={140} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: any) => [fmtKsh(v as number), "Savings"]}
                  />
                  <Bar dataKey="savings" radius={[0, 6, 6, 0]}>
                    {HOSPITALS.map((_, i) => (
                      <Cell key={i} fill={i === 0 ? "hsl(var(--insurer))" : "hsl(var(--insurer))"} fillOpacity={1 - i * 0.1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Breakdown by category</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                    {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: any) => fmtKsh(v as number)} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-md space-y-1 text-xs">
              <div className="text-text-secondary uppercase tracking-wide text-[10px] mb-1">Top tests by savings</div>
              <div className="flex justify-between"><span>Complete Blood Count</span><span className="num font-medium">{fmtKsh(312_000)}</span></div>
              <div className="flex justify-between"><span>Chest X-ray</span><span className="num font-medium">{fmtKsh(156_000)}</span></div>
              <div className="flex justify-between"><span>Lipid Panel</span><span className="num font-medium">{fmtKsh(89_000)}</span></div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Historical trend</CardTitle>
          <p className="text-xs text-text-secondary">Quarterly verified savings · Projected 2026: KSh 15.2M (↑ 18% vs 2025)</p>
        </CardHeader>
        <CardContent>
          <div className="h-60">
            <ResponsiveContainer>
              <LineChart data={SAVINGS_TREND.map(t => ({ ...t, total: t.duplicates + t.adherence + t.fraud }))} margin={{ left: -8, right: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis dataKey="month" stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} tickLine={false} axisLine={false} tickFormatter={(v) => `${v}k`} />
                <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} formatter={(v: any) => [`KSh ${v}k`, "Savings"]} />
                <Line type="monotone" dataKey="total" stroke="hsl(var(--insurer))" strokeWidth={2.5} dot={{ r: 3, fill: "hsl(var(--insurer))" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between gap-sm">
          <div>
            <CardTitle className="h3">Audit trail — verified savings</CardTitle>
            <p className="text-xs text-text-secondary">Each row is a duplicate test prevented by MediPass.</p>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9 w-64" placeholder="Search test, patient, provider..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                  <TableHead>Patient</TableHead>
                  <TableHead>Test</TableHead>
                  <TableHead>First test</TableHead>
                  <TableHead>Duplicate attempted</TableHead>
                  <TableHead>Prevention</TableHead>
                  <TableHead className="text-right">
                    <button className="inline-flex items-center gap-1 text-xs">Savings <ArrowUpDown className="h-3 w-3" /></button>
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.slice(0, 12).map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">{r.patientId}</TableCell>
                    <TableCell>
                      <div className="font-medium text-sm">{r.testType}</div>
                      <Badge variant="outline" className="capitalize text-[10px] mt-0.5">{r.category}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{r.firstTestDate}</div>
                      <div className="text-text-secondary">{r.firstProvider}</div>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div>{r.attemptedDate}</div>
                      <div className="text-text-secondary">{r.attemptedProvider}</div>
                    </TableCell>
                    <TableCell className="text-xs text-text-secondary">{r.preventionMethod}</TableCell>
                    <TableCell className="num text-right font-semibold text-success">{fmtKsh(r.savings)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
