import { AlertTriangle, AlertCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Alert } from "@/lib/types";
import { fmtDateTime } from "@/lib/format";

const palette = {
  high:   { wrap: "bg-error/10 border-error/30 text-error",       icon: AlertTriangle },
  medium: { wrap: "bg-secondary/15 border-secondary/30 text-secondary", icon: AlertCircle },
  low:    { wrap: "bg-info/10 border-info/30 text-info",          icon: Info },
} as const;

export const AnomalyAlert = ({ alert, onAction }: { alert: Alert; onAction?: () => void }) => {
  const p = palette[alert.severity];
  const Icon = p.icon;
  return (
    <div className={cn("flex items-start gap-sm p-sm rounded-md border", p.wrap)}>
      <Icon className="h-4 w-4 mt-0.5 shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs font-semibold text-foreground">{alert.title}</div>
        <div className="text-[11px] text-foreground/80 mt-0.5">{alert.message}</div>
        <div className="text-[10px] text-text-secondary mt-1">{fmtDateTime(alert.timestamp)}</div>
      </div>
      {onAction && (
        <button onClick={onAction} className="text-[11px] font-medium underline-offset-2 hover:underline shrink-0">
          View
        </button>
      )}
    </div>
  );
};
