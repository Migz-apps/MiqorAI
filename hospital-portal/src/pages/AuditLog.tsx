import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldCheck, Download } from "lucide-react";
import { downloadFile } from "@/lib/api/client";
import { hospitalApi } from "@/lib/api/hospital";
import { mapAuditEntry } from "@/lib/mappers";
import { toast } from "@/lib/notify";

export default function AuditLog() {
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["audit-logs"],
    queryFn: async () => {
      const res = await hospitalApi.auditLogs({ limit: "100" }) as { items?: Record<string, unknown>[] };
      return (res.items ?? []).map(row => mapAuditEntry(row));
    },
  });

  const filtered = useMemo(() => {
    const term = q.toLowerCase();
    return (data ?? []).filter(e =>
      !term ||
      e.staffName.toLowerCase().includes(term) ||
      (e.patientId || "").toLowerCase().includes(term) ||
      e.action.toLowerCase().includes(term)
    );
  }, [data, q]);

  const exportCsv = async () => {
    try {
      const res = await hospitalApi.exportAudit();
      const url = (res as { download_url?: string }).download_url;
      if (!url) throw new Error("Missing download URL");
      await downloadFile(url, "hospital-audit-log.csv");
      toast.success("Audit log downloaded");
    } catch {
      toast.error("Export failed");
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="h1 flex items-center gap-sm"><ShieldCheck className="h-6 w-6 text-primary" /> Audit log</h1>
          <p className="body text-text-secondary">Compliance trail for POPIA / GDPR — every patient access is recorded.</p>
        </div>
        <Button variant="outline" onClick={exportCsv}>
          <Download className="h-4 w-4 mr-1" /> Export CSV
        </Button>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading audit log…</div>}

      <Card>
        <CardHeader className="pb-sm">
          <Input placeholder="Filter by staff, patient ID or action…" value={q} onChange={e => setQ(e.target.value)} className="max-w-md" />
        </CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-12 px-md py-sm bg-background-grey text-xs font-medium text-text-secondary border-b">
            <div className="col-span-3">Timestamp</div>
            <div className="col-span-2">Staff</div>
            <div className="col-span-3">Action</div>
            <div className="col-span-2">Patient</div>
            <div className="col-span-1">IP</div>
            <div className="col-span-1">Reason</div>
          </div>
          <div className="divide-y">
            {filtered.map(e => (
              <div key={e.id} className="grid md:grid-cols-12 gap-sm px-md py-sm text-xs">
                <div className="md:col-span-3 text-text-secondary font-mono">{e.timestamp}</div>
                <div className="md:col-span-2 font-medium">{e.staffName}</div>
                <div className="md:col-span-3">{e.action}</div>
                <div className="md:col-span-2">
                  {e.patientId ? <Badge variant="outline" className="font-mono">{e.patientId.slice(0, 8)}…</Badge> : <span className="text-text-secondary">—</span>}
                </div>
                <div className="md:col-span-1 text-text-secondary font-mono">{e.ipAddress}</div>
                <div className="md:col-span-1 text-text-secondary truncate">{e.reason}</div>
              </div>
            ))}
            {!isLoading && filtered.length === 0 && <div className="p-lg text-center text-sm text-text-secondary">No records match.</div>}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
