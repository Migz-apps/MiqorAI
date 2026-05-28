import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Download } from "lucide-react";
import { PageHeader } from "@/components/medpass/PageHeader";
import { KpiCard } from "@/components/medpass/KpiCard";
import { initials, fmtNum } from "@/lib/format";
import { KPI } from "@/lib/mockData";

const MEMBERS = Array.from({ length: 18 }, (_, i) => {
  const names = ["James Otieno","Mary Wanjiru","Peter Kariuki","Aisha Said","Joseph Mutiso","Lucy Atieno","Mark Owino","Grace Muthoni","John Kamau","Sarah Njeri","David Mwangi","Esther Wambui","Samuel Kiprop","Faith Adhiambo","Daniel Mutua","Ruth Chebet","Brian Otieno","Caroline Akinyi"];
  const meds = ["Lisinopril","Metformin","Atorvastatin","Insulin","Salbutamol","Amlodipine"];
  const plans = ["Gold","Silver","Bronze","Platinum"];
  return {
    id: `MP-${8000 + i}-${100 + i}`,
    name: names[i],
    plan: plans[i % 4],
    age: 28 + (i * 3) % 50,
    medications: [meds[i % meds.length], meds[(i+2) % meds.length]],
    adherence: 60 + ((i * 7) % 40),
    risk: i % 5 === 0 ? "high" : i % 3 === 0 ? "medium" : "low",
  };
});

export default function Members() {
  const [q, setQ] = useState("");
  const filtered = MEMBERS.filter(m => !q || m.name.toLowerCase().includes(q.toLowerCase()) || m.id.includes(q));

  return (
    <div className="space-y-lg max-w-[1500px] mx-auto animate-fade-up">
      <PageHeader
        title="Members"
        subtitle="Anonymized member directory with adherence and risk indicators."
        right={<Button size="sm" variant="outline" className="gap-sm"><Download className="h-4 w-4" /> Export</Button>}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={Users} label="Members covered" value={fmtNum(KPI.members)} delta={5} accent="insurer" />
        <KpiCard icon={Users} label="Active this month" value={fmtNum(189_240)} delta={3} accent="success" />
        <KpiCard icon={Users} label="High-risk cohort" value={fmtNum(8_421)} delta={-2} positive="down-good" accent="error" />
        <KpiCard icon={Users} label="New enrollments" value={fmtNum(1_204)} delta={8} accent="primary" />
      </div>

      <Card>
        <CardHeader className="pb-sm flex flex-row items-center justify-between">
          <CardTitle className="h3">Member directory</CardTitle>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} className="pl-8 h-9 w-64" placeholder="Search name or member ID..." />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow className="bg-insurer-light/40 hover:bg-insurer-light/40">
                <TableHead>Member</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Active medications</TableHead>
                <TableHead>Adherence</TableHead>
                <TableHead>Risk</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(m => (
                <TableRow key={m.id}>
                  <TableCell>
                    <div className="flex items-center gap-sm">
                      <div className="h-8 w-8 rounded-full bg-insurer-light text-insurer flex items-center justify-center text-xs font-semibold">
                        {initials(m.name)}
                      </div>
                      <div>
                        <div className="text-sm font-medium">{m.name}</div>
                        <div className="font-mono text-[11px] text-text-secondary">{m.id}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell><Badge variant="outline">{m.plan}</Badge></TableCell>
                  <TableCell className="num">{m.age}</TableCell>
                  <TableCell className="text-xs">{m.medications.join(", ")}</TableCell>
                  <TableCell className={`num font-semibold ${m.adherence >= 85 ? "text-success" : m.adherence >= 75 ? "text-secondary" : "text-error"}`}>
                    {m.adherence}%
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={m.risk === "high" ? "bg-error/10 text-error border-error/30" : m.risk === "medium" ? "bg-secondary/15 text-secondary border-secondary/30" : "bg-success/10 text-success border-success/30"}>
                      {m.risk}
                    </Badge>
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
