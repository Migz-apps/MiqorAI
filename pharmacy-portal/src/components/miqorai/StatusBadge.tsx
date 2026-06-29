import { Badge } from "@/components/ui/badge";
import { Clock, CheckCircle2, Package, PauseCircle, XCircle, ShieldCheck } from "lucide-react";
import type { RxStatus } from "@/lib/types";

const META: Record<RxStatus, { label: string; cls: string; icon: any }> = {
  pending:   { label: "Pending",   cls: "bg-secondary/15 text-secondary border-secondary/30",         icon: Clock },
  verified:  { label: "Verified",  cls: "bg-info/15 text-info border-info/30",                          icon: ShieldCheck },
  ready:     { label: "Ready",     cls: "bg-pharmacy/15 text-pharmacy border-pharmacy/30",              icon: Package },
  dispensed: { label: "Dispensed", cls: "bg-success/15 text-success border-success/30",                 icon: CheckCircle2 },
  held:      { label: "On hold",   cls: "bg-secondary/15 text-secondary border-secondary/30",           icon: PauseCircle },
  rejected:  { label: "Rejected",  cls: "bg-error/15 text-error border-error/30",                       icon: XCircle },
};

export const StatusBadge = ({ status }: { status: RxStatus }) => {
  const m = META[status];
  const Icon = m.icon;
  return (
    <Badge variant="outline" className={`gap-1 font-medium ${m.cls}`}>
      <Icon className="h-3 w-3" /> {m.label}
    </Badge>
  );
};
