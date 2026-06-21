import { ArrowDown, ArrowUp, type LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export type KpiCardProps = {
  icon: LucideIcon;
  label: string;
  value: string;
  delta?: number;
  deltaLabel?: string;
  positive?: "up-good" | "down-good";
  accent?: "insurer" | "success" | "secondary" | "error" | "primary";
  hint?: string;
};

const accents: Record<NonNullable<KpiCardProps["accent"]>, string> = {
  insurer:   "bg-insurer/10 text-insurer",
  success:   "bg-success/10 text-success",
  secondary: "bg-secondary/15 text-secondary",
  error:     "bg-error/10 text-error",
  primary:   "bg-primary/10 text-primary",
};

export const KpiCard = ({ icon: Icon, label, value, delta, deltaLabel, positive = "up-good", accent = "primary", hint }: KpiCardProps) => {
  const showDelta = delta !== undefined;
  const isUp = (delta ?? 0) >= 0;
  const isGood = positive === "up-good" ? isUp : !isUp;
  return (
    <Card className="overflow-hidden">
      <CardContent className="p-md">
        <div className="flex items-start justify-between gap-sm">
          <div className={cn("h-9 w-9 rounded-md flex items-center justify-center", accents[accent])}>
            <Icon className="h-4.5 w-4.5" />
          </div>
          {showDelta && (
            <div className={cn("inline-flex items-center gap-0.5 text-[11px] font-medium px-1.5 py-0.5 rounded-md",
              isGood ? "bg-success/10 text-success" : "bg-error/10 text-error")}>
              {isUp ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
              {Math.abs(delta!).toFixed(0)}%
            </div>
          )}
        </div>
        <div className="mt-md">
          <div className="text-[11px] uppercase tracking-wide text-text-secondary font-medium">{label}</div>
          <div className="num text-2xl font-bold leading-tight mt-0.5">{value}</div>
          {(deltaLabel || hint) && (
            <div className="text-[11px] text-text-secondary mt-0.5">{deltaLabel ?? hint}</div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
