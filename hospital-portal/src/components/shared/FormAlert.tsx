import { AlertCircle, CheckCircle2, Info, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

type Tone = "error" | "success" | "info" | "warning";

const TONE: Record<Tone, { wrap: string; icon: any }> = {
  error:   { wrap: "border-error/30 bg-error/10 text-error",          icon: AlertCircle },
  success: { wrap: "border-success/30 bg-success/10 text-success",    icon: CheckCircle2 },
  info:    { wrap: "border-primary/20 bg-primary-light/40 text-primary", icon: Info },
  warning: { wrap: "border-secondary/40 bg-secondary/10 text-secondary", icon: AlertTriangle },
};

export const FormAlert = ({
  tone = "error",
  children,
  className,
}: {
  tone?: Tone;
  children: React.ReactNode;
  className?: string;
}) => {
  const { wrap, icon: Icon } = TONE[tone];
  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-2 rounded-md border px-3 py-2.5 text-xs leading-5",
        wrap,
        className
      )}
    >
      <Icon className="h-4 w-4 mt-0.5 shrink-0" aria-hidden />
      <div className="min-w-0 flex-1 break-words">{children}</div>
    </div>
  );
};
