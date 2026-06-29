import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

export function StatCard({
  label, value, delta, deltaLabel, icon: Icon, accent = "primary",
}: {
  label: string; value: string; delta?: number; deltaLabel?: string;
  icon: LucideIcon; accent?: "primary" | "success" | "warning" | "purple" | "pink" | "info";
}) {
  const accentMap: Record<string, string> = {
    primary: "from-primary/30 to-primary/0 text-primary",
    success: "from-success/30 to-success/0 text-success",
    warning: "from-warning/30 to-warning/0 text-warning",
    purple: "from-purple/30 to-purple/0 text-purple",
    pink: "from-pink/30 to-pink/0 text-pink",
    info: "from-info/30 to-info/0 text-info",
  };
  const positive = (delta ?? 0) >= 0;
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
      <div className={cn("absolute -right-8 -top-8 size-32 rounded-full blur-2xl bg-gradient-to-br opacity-60", accentMap[accent])} />
      <div className="relative flex items-start justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">{label}</div>
          <div className="mt-2 font-mono text-3xl font-semibold tracking-tight">{value}</div>
          {typeof delta === "number" && (
            <div className={cn("mt-2 inline-flex items-center gap-1 text-xs font-medium",
              positive ? "text-success" : "text-destructive")}>
              {positive ? <ArrowUpRight className="size-3.5" /> : <ArrowDownRight className="size-3.5" />}
              {Math.abs(delta)}% <span className="text-muted-foreground font-normal">{deltaLabel ?? "vs last month"}</span>
            </div>
          )}
        </div>
        <div className={cn("size-10 rounded-lg grid place-items-center border border-border bg-background/60", accentMap[accent].split(" ").pop())}>
          <Icon className="size-5" />
        </div>
      </div>
    </div>
  );
}
