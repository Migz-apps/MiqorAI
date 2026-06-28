import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Users, Search, Download } from "lucide-react";
import { PageHeader } from "@/components/MiqorAI/PageHeader";
import { KpiCard } from "@/components/MiqorAI/KpiCard";
import { downloadFile } from "@/lib/api/client";
import { initials, fmtNum } from "@/lib/format";
import { insurerApi, insurerKeys } from "@/lib/api/insurer";
import { toast } from "@/lib/notify";

export default function Members() {
  const [q, setQ] = useState("");

  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: insurerKeys.memberStats,
    queryFn: insurerApi.memberStats,
  });

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: insurerKeys.members(q || undefined),
    queryFn: () => insurerApi.members(q || undefined),
  });

  const exportData = async () => {
    try {
      const { download_url } = await insurerApi.exportMembers();
      await downloadFile(download_url, "insurer-members.csv");
      toast.success("Export ready");
    } catch {
      toast.error("Export failed");
    }
  };

  if (statsLoading) {
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
        title="Members"
        subtitle="Anonymized member directory with adherence and risk indicators."
        right={
          <Button size="sm" variant="outline" className="gap-sm" onClick={() => void exportData()}>
            <Download className="h-4 w-4" /> Export
          </Button>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={Users} label="Members covered" value={fmtNum(stats?.total_members ?? 0)} accent="insurer" />
        <KpiCard icon={Users} label="Active this month" value={fmtNum(stats?.active_this_month ?? 0)} accent="success" />
        <KpiCard icon={Users} label="High-risk cohort" value={fmtNum(stats?.high_risk_cohort ?? 0)} positive="down-good" accent="error" />
        <KpiCard icon={Users} label="New enrollments" value={fmtNum(stats?.new_enrollments ?? 0)} accent="primary" />
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
          {membersLoading ? (
            <div className="p-md space-y-2">
              {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12" />)}
            </div>
          ) : (
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
                {(members ?? []).length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-sm text-text-secondary py-8">No members found.</TableCell>
                  </TableRow>
                ) : (members ?? []).map(m => (
                  <TableRow key={m.member_number}>
                    <TableCell>
                      <div className="flex items-center gap-sm">
                        <div className="h-8 w-8 rounded-full bg-insurer-light text-insurer flex items-center justify-center text-xs font-semibold">
                          {initials(m.name)}
                        </div>
                        <div>
                          <div className="text-sm font-medium">{m.name}</div>
                          <div className="font-mono text-[11px] text-text-secondary">{m.member_number}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell><Badge variant="outline" className="capitalize">{m.plan_tier}</Badge></TableCell>
                    <TableCell className="num">{m.age}</TableCell>
                    <TableCell className="text-xs">{m.active_medications.join(", ") || "—"}</TableCell>
                    <TableCell className={`num font-semibold ${m.adherence_rate >= 85 ? "text-success" : m.adherence_rate >= 75 ? "text-secondary" : "text-error"}`}>
                      {m.adherence_rate}%
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={m.risk_band === "high" ? "bg-error/10 text-error border-error/30" : m.risk_band === "medium" ? "bg-secondary/15 text-secondary border-secondary/30" : "bg-success/10 text-success border-success/30"}>
                        {m.risk_band}
                      </Badge>
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
