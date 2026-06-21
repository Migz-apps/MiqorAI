import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info" | "warning";

const TONE: Record<Tone, { wrap: string; icon: typeof AlertCircle }> = {
  error: { wrap: "border-destructive/30 bg-destructive/5 text-destructive", icon: AlertCircle },
  success: { wrap: "border-success/30 bg-success/5 text-success", icon: CheckCircle2 },
  info: { wrap: "border-primary/20 bg-primary/5 text-primary", icon: Info },
  warning: { wrap: "border-secondary/40 bg-secondary/10 text-secondary-foreground", icon: AlertTriangle },
};

export function FormAlert({
  tone = "error",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) {
  const { wrap, icon: Icon } = TONE[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-lg border px-3 py-2.5 text-sm leading-5",
        wrap,
        className,
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
}
