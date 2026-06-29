import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Receipt, Download, Search, Wallet, Building2, ShieldCheck,
  TrendingUp, ArrowUpRight, Printer, Filter,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { downloadFile } from "@/lib/api/client";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapBillingReceipt } from "@/lib/api/mappers";
import { toast } from "@/lib/notify";
import { pharmacyKeys } from "@/store/rx";

type Filter = "all" | "cash" | "insurance";

export default function Billing() {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");

  const { data: receipts = [], isLoading } = useQuery({
    queryKey: pharmacyKeys.billing(),
    queryFn: async () => {
      const rows = await pharmacyApi.billingReceipts();
      return (rows as Parameters<typeof mapBillingReceipt>[0][]).map(mapBillingReceipt);
    },
  });

  const total = useMemo(() => receipts.reduce((s, r) => s + r.total, 0), [receipts]);
  const cashTotal = useMemo(
    () => receipts.filter((r) => r.paymentType === "cash").reduce((s, r) => s + r.total, 0),
    [receipts],
  );
  const insuranceTotal = useMemo(
    () => receipts.filter((r) => r.paymentType === "insurance").reduce((s, r) => s + r.total, 0),
    [receipts],
  );

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (filter === "cash" && r.paymentType !== "cash") return false;
      if (filter === "insurance" && r.paymentType !== "insurance") return false;
      if (!q) return true;
      const t = q.toLowerCase();
      return r.id.toLowerCase().includes(t) || r.patientName.toLowerCase().includes(t);
    });
  }, [receipts, filter, q]);

  const exportBilling = async () => {
    try {
      const { download_url } = await pharmacyApi.exportBilling("csv");
      await downloadFile(download_url, "pharmacy-billing.csv");
      toast.success("Billing export downloaded");
    } catch {
      toast.error("Billing export failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <div className="text-xs text-text-secondary uppercase tracking-wider">Finance</div>
          <h1 className="h1">Billing &amp; Receipts</h1>
          <p className="body text-text-secondary">Cash, insurance and MiqorAI claims for today.</p>
        </div>
        <div className="flex gap-sm">
          <Button variant="outline" className="h-10"><Printer className="h-4 w-4 mr-2" />Print day-end</Button>
          <Button className="h-10 bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground" onClick={() => void exportBilling()}>
            <Download className="h-4 w-4 mr-2" />Export CSV
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={Receipt} label="Receipts today" value={receipts.length.toString()} accent="bg-pharmacy/10 text-pharmacy" delta={`${receipts.length} receipts`} />
        <KpiCard icon={TrendingUp} label="Revenue today" value={`KES ${total.toLocaleString()}`} accent="bg-success/10 text-success" highlight />
        <KpiCard icon={Wallet} label="Cash collected" value={`KES ${cashTotal.toLocaleString()}`} accent="bg-info/10 text-info" delta={`${receipts.filter((r) => r.paymentType === "cash").length} receipts`} />
        <KpiCard icon={ShieldCheck} label="Insurance pending" value={`KES ${insuranceTotal.toLocaleString()}`} accent="bg-secondary/15 text-secondary" delta={`${receipts.filter((r) => r.paymentType === "insurance").length} claims`} />
      </div>

      <Card className="border-border/70 shadow-sm">
        <CardHeader className="pb-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-md">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search receipt #, patient, insurer…" className="pl-9 h-10" />
            </div>
            <div className="flex items-center gap-1">
              <Filter className="h-3.5 w-3.5 text-text-secondary mr-1" />
              {(["all", "cash", "insurance"] as Filter[]).map((f) => (
                <Button key={f} size="sm" variant={filter === f ? "default" : "outline"} className={filter === f ? "bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground h-8 capitalize" : "h-8 capitalize"} onClick={() => setFilter(f)}>
                  {f}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="px-md py-xl text-center text-sm text-text-secondary">Loading receipts…</div>}
            {!isLoading && filtered.length === 0 && (
              <div className="px-md py-xl text-center">
                <Receipt className="h-10 w-10 text-text-secondary/40 mx-auto mb-sm" />
                <div className="text-sm text-text-secondary">No receipts yet. Dispense a prescription to see it here.</div>
              </div>
            )}
            {filtered.map((r) => (
              <div key={r.id} className="group flex items-center gap-md px-md py-md hover:bg-background-grey transition">
                <div className="h-10 w-10 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold shrink-0">
                  {r.patientName.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">
                    {r.patientName}
                    <span className="text-text-secondary font-normal ml-2">· {r.id}</span>
                  </div>
                  <div className="text-xs text-text-secondary truncate">
                    {formatDistanceToNow(new Date(r.dispensedAt), { addSuffix: true })}
                  </div>
                </div>
                {r.paymentType === "insurance" ? (
                  <Badge variant="outline" className="border-info/30 text-info bg-info/10 gap-1">
                    <Building2 className="h-3 w-3" /> Insurance
                  </Badge>
                ) : (
                  <Badge variant="outline" className="border-success/30 text-success bg-success/10 gap-1">
                    <Wallet className="h-3 w-3" /> Cash
                  </Badge>
                )}
                <div className="text-right">
                  <div className="font-bold text-sm tabular-nums">KES {r.total.toLocaleString()}</div>
                  <div className="text-[10px] text-text-secondary">Total billed</div>
                </div>
                <Button size="icon" variant="ghost" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition" title="Open receipt">
                  <ArrowUpRight className="h-4 w-4" />
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function KpiCard({
  icon: Icon,
  label,
  value,
  accent,
  delta,
  highlight,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  accent: string;
  delta?: string;
  highlight?: boolean;
}) {
  return (
    <Card className={highlight ? "border-pharmacy/30 bg-gradient-to-br from-pharmacy-light/60 to-card shadow-sm" : "border-border/70 shadow-sm"}>
      <CardContent className="p-md">
        <div className="flex items-start justify-between gap-sm">
          <div className={`h-9 w-9 rounded-lg flex items-center justify-center ${accent}`}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        <div className="mt-md">
          <div className="text-[11px] uppercase tracking-wider text-text-secondary">{label}</div>
          <div className="text-2xl font-bold tabular-nums mt-1">{value}</div>
          {delta && <div className="text-[11px] text-text-secondary mt-1">{delta}</div>}
        </div>
      </CardContent>
    </Card>
  );
}
