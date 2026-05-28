import { cn } from "@/lib/utils";

type Props = { value: number; max?: number; barClass?: string; trackClass?: string };
export const ProgressBar = ({ value, max = 100, barClass = "bg-insurer", trackClass = "bg-background-grey" }: Props) => {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  return (
    <div className={cn("h-1.5 rounded-full overflow-hidden", trackClass)}>
      <div className={cn("h-full rounded-full transition-all", barClass)} style={{ width: `${pct}%` }} />
    </div>
  );
};
