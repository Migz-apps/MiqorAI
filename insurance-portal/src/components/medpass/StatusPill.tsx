import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const palette = {
  paid:          "bg-success/10 text-success border-success/30",
  pending:       "bg-secondary/15 text-secondary border-secondary/30",
  overdue:       "bg-error/10 text-error border-error/30",
  flagged:       "bg-error/10 text-error border-error/30",
  investigating: "bg-secondary/15 text-secondary border-secondary/30",
  cleared:       "bg-success/10 text-success border-success/30",
  active:        "bg-success/10 text-success border-success/30",
  inactive:      "bg-muted text-text-secondary border-border",
  high:          "bg-error/10 text-error border-error/30",
  medium:        "bg-secondary/15 text-secondary border-secondary/30",
  low:           "bg-info/10 text-info border-info/30",
} as const;

type Key = keyof typeof palette;
export const StatusPill = ({ status, className }: { status: Key | string; className?: string }) => {
  const p = (palette as any)[status] ?? "bg-muted text-text-secondary border-border";
  return <Badge variant="outline" className={cn("capitalize", p, className)}>{status}</Badge>;
};
