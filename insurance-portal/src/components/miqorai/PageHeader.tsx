import { cn } from "@/lib/utils";

type Props = { title: string; subtitle?: string; right?: React.ReactNode; className?: string };
export const PageHeader = ({ title, subtitle, right, className }: Props) => (
  <div className={cn("flex flex-col sm:flex-row sm:items-end sm:justify-between gap-sm mb-lg", className)}>
    <div>
      <h1 className="h1">{title}</h1>
      {subtitle && <p className="body text-text-secondary mt-1">{subtitle}</p>}
    </div>
    {right && <div className="flex items-center gap-sm">{right}</div>}
  </div>
);
