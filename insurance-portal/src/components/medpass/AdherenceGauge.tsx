import { cn } from "@/lib/utils";
import { fmtPct } from "@/lib/format";

type Props = { rate: number; target?: number; size?: number; label?: string };
export const AdherenceGauge = ({ rate, target = 85, size = 140, label = "Adherence" }: Props) => {
  const r = (size - 16) / 2;
  const c = 2 * Math.PI * r;
  const dash = (rate / 100) * c;
  const color = rate >= 80 ? "hsl(var(--success))" : rate >= 60 ? "hsl(var(--secondary))" : "hsl(var(--error))";
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={r} stroke="hsl(var(--background-grey))" strokeWidth={10} fill="none" />
        <circle cx={size/2} cy={size/2} r={r} stroke={color} strokeWidth={10} fill="none"
                strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round" />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <div className="num text-2xl font-bold">{fmtPct(rate)}</div>
        <div className="text-[10px] text-text-secondary uppercase tracking-wide">{label}</div>
        <div className={cn("text-[10px] mt-0.5", rate >= target ? "text-success" : "text-secondary")}>
          Target {fmtPct(target)}
        </div>
      </div>
    </div>
  );
};
