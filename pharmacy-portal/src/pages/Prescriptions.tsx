import { useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/MiqorAI/StatusBadge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, Search, Filter } from "lucide-react";
import type { RxStatus } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";
import { loadPrescriptions, pharmacyKeys } from "@/store/rx";

const STATUSES: { key: RxStatus | "all"; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "verified", label: "Verified" },
  { key: "ready", label: "Ready" },
  { key: "dispensed", label: "Dispensed" },
  { key: "held", label: "On hold" },
  { key: "rejected", label: "Rejected" },
];

export default function Prescriptions() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<RxStatus | "all">("all");

  const { data: prescriptions = [], isLoading } = useQuery({
    queryKey: pharmacyKeys.prescriptions(status !== "all" ? { status } : undefined),
    queryFn: () => loadPrescriptions(status !== "all" ? { status } : undefined),
  });

  const list = prescriptions.filter((r) => {
    if (!q) return true;
    const t = q.toLowerCase();
    return r.patientName.toLowerCase().includes(t) || r.id.toLowerCase().includes(t) || r.doctorName.toLowerCase().includes(t);
  });

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="h1">Prescriptions</h1>
          <p className="body text-text-secondary">Queue from connected hospitals · {list.length} of {prescriptions.length} shown</p>
        </div>
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by patient, RX-ID, doctor…" className="pl-9 h-10" />
            </div>
            <div className="flex items-center gap-1 flex-wrap">
              <Filter className="h-3.5 w-3.5 text-text-secondary mr-1" />
              {STATUSES.map((s) => (
                <Button
                  key={s.key}
                  size="sm"
                  variant={status === s.key ? "default" : "outline"}
                  className={status === s.key ? "bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground h-8" : "h-8"}
                  onClick={() => setStatus(s.key)}
                >
                  {s.label}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="p-lg text-center text-sm text-text-secondary">Loading prescriptions…</div>}
            {!isLoading && list.length === 0 && (
              <div className="p-lg text-center text-sm text-text-secondary">No prescriptions match.</div>
            )}
            {list.map((r) => (
              <Link key={r.id} to={`/prescriptions/${r.id}`} className="grid grid-cols-12 items-center gap-md px-md py-sm hover:bg-background-grey transition">
                <div className="col-span-12 sm:col-span-4 flex items-center gap-md min-w-0">
                  <div className="h-9 w-9 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                    {r.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate flex items-center gap-sm">
                      {r.patientName}
                      {r.allergies.length > 0 && (
                        <Badge variant="outline" className="text-[10px] gap-1 border-error/30 text-error bg-error/10">
                          <AlertTriangle className="h-2.5 w-2.5" /> Allergy
                        </Badge>
                      )}
                    </div>
                    <div className="text-xs text-text-secondary truncate">{r.id} · age {r.patientAge}</div>
                  </div>
                </div>
                <div className="col-span-6 sm:col-span-3 text-xs text-text-secondary truncate">{r.doctorName} · {r.hospital}</div>
                <div className="col-span-3 sm:col-span-2 text-xs">{r.items.length} item(s)</div>
                <div className="col-span-3 sm:col-span-1 text-xs text-text-secondary">{formatDistanceToNow(new Date(r.issuedAt), { addSuffix: true })}</div>
                <div className="col-span-12 sm:col-span-2 flex sm:justify-end"><StatusBadge status={r.status} /></div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
