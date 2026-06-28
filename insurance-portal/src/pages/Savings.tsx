import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Download, Search, ArrowUpDown, FlaskConical, Microscope, Boxes } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
  PieChart, Pie, Legend,
} from "recharts";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { downloadFile } from "@/lib/api/client";
import { insurerApi, insurerKeys, mapSavingsRecord } from "@/lib/api/insurer";
import { fmtKsh, fmtKshShort, fmtNum } from "@/lib/format";
import { toast } from "@/lib/notify";

const CATEGORY_COLORS: Record<string, string> = {
  lab: "hsl(var(--insurer))",
  imaging: "hsl(var(--success))",
  other: "hsl(var(--secondary))",
};

export default function Savings() {
  const [q, setQ] = useState("");

  const { data: savings, isLoading } = useQuery({
    queryKey: insurerKeys.savings(),
    queryFn: () => insurerApi.savings(),
  });

  const { data: recordsRaw } = useQuery({
    queryKey: insurerKeys.savingsRecords,
    queryFn: insurerApi.savingsRecords,
  });

  const records = (recordsRaw ?? []).map(mapSavingsRecord);
  const filtered = records.filter(r =>
    !q || r.testType.toLowerCase().includes(q.toLowerCase()) ||
    r.patientId.toLowerCase().includes(q.toLowerCase()) ||
    r.firstProvider.toLowerCase().includes(q.toLowerCase())
  );

  const hospitals = savings?.breakdown_by_hospital ?? [];
  const breakdown = Object.entries(savings?.breakdown_by_test_type ?? {}).map(([name, value], i) => ({
    name,
    value,
    color: Object.values(CATEGORY_COLORS)[i % 3],
  }));
  const topTests = Object.entries(savings?.breakdown_by_test_type ?? {})
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const exportFile = async (format: "csv" | "pdf") => {
    try {
      const { download_url } = await insurerApi.exportSavings(format);
      await downloadFile(download_url, `insurer-savings.${format}`);
      toast.success("Export ready", { description: "Your download should start shortly." });
    } catch {
      toast.error("Export failed");
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-lg max-w-[1500px] mx-auto">
        <Skeleton className="h-16 w-full" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)}
        </div>
      </div>
    );
  }

  const avgPerClaim = savings?.duplicate_tests_prevented
    ? Math.round((savings.gross_savings ?? 0) / savings.duplicate_tests_prevented)
    : 0;

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Savings dashboard"
        subtitle="Verified duplicate-test savings. Every Franc here is auditable to a claim."
        right={
          <>
            <Tabs defaultValue="month">
              <TabsList className="h-9">
                <TabsTrigger value="month">This month</TabsTrigger>
                <TabsTrigger value="ytd">YTD</TabsTrigger>
              </TabsList>
            </Tabs>
            <Button size="sm" variant="outline" className="gap-sm" onClick={() => void exportFile("csv")}>
              <Download className="h-4 w-4" /> CSV
            </Button>
            <Button size="sm" className="gap-sm bg-insurer hover:bg-insurer/90 text-insurer-foreground" onClick={() => void exportFile("pdf")}>
              <Download className="h-4 w-4" /> PDF
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={FlaskConical} label="Verified savings" value={fmtKshShort(savings?.gross_savings ?? 0)} accent="success" />
        <KpiCard icon={Boxes} label="Duplicates blocked" value={fmtNum(savings?.duplicate_tests_prevented ?? 0)} accent="insurer" />
        <KpiCard icon={Microscope} label="Avg savings / claim" value={fmtKsh(avgPerClaim)} accent="primary" />
        <KpiCard icon={FlaskConical} label="Net savings" value={fmtKshShort(savings?.net_savings ?? 0)} hint="After MiqorAI fee" accent="secondary" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-lg">
        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Savings by hospital</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-72">
              <ResponsiveContainer>
                <BarChart data={hospitals} layout="vertical" margin={{ left: 24, right: 24, top: 4, bottom: 0 }}>
                  <CartesianGrid stroke="hsl(var(--border))" horizontal={false} />
                  <XAxis type="number" stroke="hsl(var(--text-secondary))" fontSize={11} tickFormatter={(v) => `${v / 1000}k`} tickLine={false} axisLine={false} />
                  <YAxis type="category" dataKey="name" stroke="hsl(var(--text-secondary))" fontSize={11} width={140} tickLine={false} axisLine={false} />
                  <Tooltip
                    contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }}
                    formatter={(v: number) => [fmtKsh(v), "Savings"]}
                  />
                  <Bar dataKey="savings" radius={[0, 6, 6, 0]}>
                    {hospitals.map((_, i) => (
                      <Cell key={i} fill="hsl(var(--insurer))" fillOpacity={1 - i * 0.1} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">Breakdown by test type</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-56">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={breakdown} dataKey="value" nameKey="name" innerRadius={48} outerRadius={80} paddingAngle={3}>
                    {breakdown.map((b, i) => <Cell key={i} fill={b.color} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtKsh(v)} contentStyle={{ borderRadius: 8, fontSize: 12, border: "1px solid hsl(var(--border))" }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} iconType="circle" />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-md space-y-1 text-xs">
              <div className="text-text-secondary uppercase tracking-wide text-[10px] mb-1">Top tests by savings</div>
              {topTests.map(([name, amount]) => (
                <div key={name} className="flex justify-between">
                  <span>{name}</span>
                  <span className="num font-medium">{fmtKsh(amount)}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between gap-sm">
          <div>
            <CardTitle className="h3">Audit trail — verified savings</CardTitle>
            <p className="text-xs text-text-secondary">Each row is a duplicate test prevented by MiqorAI.</p>
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
