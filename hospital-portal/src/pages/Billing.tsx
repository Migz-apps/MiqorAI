import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { CreditCard, Download } from "lucide-react";
import { HOSPITAL } from "@/lib/mockData";
import { toast } from "sonner";

const usage = [
  { metric: "Patient check-ins", value: "3,247", limit: "Unlimited" },
  { metric: "QR scans",          value: "8,432", limit: "Unlimited" },
  { metric: "Storage used",      value: "2.4 GB", limit: "100 GB", pct: 2.4 },
  { metric: "API calls",         value: "127,843", limit: "1,000,000", pct: 12.8 },
];
const invoices = [
  { id: "INV-2026-04", date: "2026-04-01", amount: "$849.00", status: "paid" },
  { id: "INV-2026-03", date: "2026-03-01", amount: "$849.00", status: "paid" },
  { id: "INV-2026-02", date: "2026-02-01", amount: "$849.00", status: "paid" },
];

export default function Billing() {
  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><CreditCard className="h-6 w-6 text-primary" /> Billing & subscription</h1>
        <p className="body text-text-secondary">Manage your Med-Pass plan, payment methods and invoices.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Current plan</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-2 sm:grid-cols-4 gap-md">
          <Stat label="Plan" value={HOSPITAL.plan} />
          <Stat label="Days remaining" value={String(HOSPITAL.daysRemaining)} />
          <Stat label="Hospital" value={HOSPITAL.code} />
          <Stat label="Renewal" value="Auto" />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Usage this month</CardTitle></CardHeader>
        <CardContent className="space-y-sm">
          {usage.map(u => (
            <div key={u.metric}>
              <div className="flex items-center justify-between text-sm">
                <span>{u.metric}</span>
                <span className="text-text-secondary">{u.value} / {u.limit}</span>
              </div>
              {u.pct != null && (
                <div className="h-1.5 rounded-full bg-background-grey mt-1 overflow-hidden">
                  <div className="h-full bg-primary" style={{ width: `${Math.min(u.pct, 100)}%` }} />
                </div>
              )}
            </div>
          ))}
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
            {invoices.map(i => (
              <div key={i.id} className="px-md py-sm flex items-center gap-md">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{i.id}</div>
                  <div className="text-xs text-text-secondary">{i.date}</div>
                </div>
                <div className="text-sm font-medium">{i.amount}</div>
                <Badge variant="outline" className="border-success/30 text-success bg-success/10 capitalize">{i.status}</Badge>
                <Button size="sm" variant="outline" onClick={() => toast.success(`${i.id}.pdf downloaded`)}>
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

const Stat = ({ label, value }: any) => (
  <div>
    <div className="text-xs text-text-secondary">{label}</div>
    <div className="text-lg font-semibold">{value}</div>
  </div>
);

const Method = ({ label, detail }: any) => (
  <div className="rounded-md border p-md">
    <div className="text-sm font-medium">{label}</div>
    <div className="text-xs text-text-secondary">{detail}</div>
  </div>
);
