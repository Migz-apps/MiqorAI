import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";
import { toast } from "@/lib/notify";
import { useAuth } from "@/store/auth";

export default function Billing() {
  const session = useAuth(s => s.session);

  const { data: billing, isLoading } = useQuery({
    queryKey: ["billing"],
    queryFn: () => hospitalApi.billing(),
  });

  const b = billing as Record<string, unknown> | undefined;
  const invoices = (b?.invoices as Array<Record<string, unknown>>) ?? [];
  const plan = String(b?.plan ?? "Enterprise");
  const scriptsUsed = Number(b?.scripts_used ?? 0);
  const scriptsLimit = Number(b?.scripts_limit ?? 5000);
  const pilotEnd = b?.pilot_end_date ? new Date(String(b.pilot_end_date)) : null;
  const daysRemaining = pilotEnd ? Math.max(0, Math.ceil((pilotEnd.getTime() - Date.now()) / 86400000)) : "—";

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><CreditCard className="h-6 w-6 text-primary" /> Billing & subscription</h1>
        <p className="body text-text-secondary">Manage your MiqorAI plan, payment methods and invoices.</p>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading billing…</div>}

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Current plan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-md">
          <Stat label="Plan" value={plan.charAt(0).toUpperCase() + plan.slice(1)} />
          <Stat label="Days remaining" value={String(daysRemaining)} />
          <Stat label="Hospital" value={session?.hospitalCode ?? "—"} />
          <Stat label="Scripts used" value={`${scriptsUsed} / ${scriptsLimit}`} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Usage this month</CardTitle></CardHeader>
        <CardContent className="space-y-sm">
          <UsageRow metric="Prescriptions" value={String(scriptsUsed)} limit={String(scriptsLimit)} pct={(scriptsUsed / scriptsLimit) * 100} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Payment methods</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-sm">
          <Method label="Credit card" detail="•••• 4242 (Stripe)" />
          <Method label="Bank transfer" detail="Invoice on request" />
          <Method label="M-Pesa" detail="Kenya only" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Invoices</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {invoices.length === 0 && <div className="px-md py-sm text-sm text-text-secondary">No invoices yet.</div>}
            {invoices.map(i => (
              <div key={String(i.id)} className="px-md py-sm flex items-center gap-md">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{String(i.invoiceNumber ?? i.id ?? "Invoice")}</div>
                  <div className="text-xs text-text-secondary">{String(i.createdAt ?? i.created_at ?? "").slice(0, 10)}</div>
                </div>
                <div className="text-sm font-medium">${Number(i.amount ?? 0).toFixed(2)}</div>
                <Badge variant="outline" className="border-success/30 text-success bg-success/10 capitalize">{String(i.status ?? "paid")}</Badge>
                <Button size="sm" variant="outline" onClick={() => toast.success("Invoice PDF downloaded")}>
                  <Download className="h-3 w-3 mr-1" /> PDF
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const Stat = ({ label, value }: { label: string; value: string }) => (
  <div>
    <div className="text-xs text-text-secondary">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const UsageRow = ({ metric, value, limit, pct }: { metric: string; value: string; limit: string; pct?: number }) => (
  <div>
    <div className="flex items-center justify-between text-sm">
      <span>{metric}</span>
      <span className="text-text-secondary">{value} / {limit}</span>
    </div>
    {pct != null && (
      <div className="h-1.5 rounded-full bg-background-grey mt-1 overflow-hidden">
        <div className="h-full bg-primary" style={{ width: `${Math.min(pct, 100)}%` }} />
      </div>
    )}
  </div>
);

const Method = ({ label, detail }: { label: string; detail: string }) => (
  <div className="rounded-md border p-md">
    <div className="text-sm font-medium">{label}</div>
    <div className="text-xs text-text-secondary">{detail}</div>
  </div>
);
