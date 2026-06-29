import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { adminApi, adminKeys } from "@/lib/api/admin";

const AFRICA_PATH =
  "M50 8 C58 8 64 10 70 14 L74 22 L72 30 L70 38 L66 44 L70 50 L72 58 L70 66 L66 72 L60 80 L54 88 L48 94 L42 92 L40 84 L36 78 L34 70 L30 62 L26 54 L22 46 L20 38 L24 30 L28 22 L34 16 L42 10 Z";

export function GlobalMap() {
  const { data: nodes = [] } = useQuery({
    queryKey: adminKeys.network,
    queryFn: () => adminApi.network(),
  });

  const cityNodes = nodes.map((n) => ({
    city: n.city,
    x: n.mapX,
    y: n.mapY,
    hospitals: n.hospitals,
    pharmacies: n.pharmacies,
    patients: n.patients,
    country: n.country,
  }));

  const [active, setActive] = useState<string | null>(null);
  const defaultCity = cityNodes[0]?.city ?? null;
  const activeCity = active ?? defaultCity;
  const node = cityNodes.find((c) => c.city === activeCity);
  const hub = cityNodes[0];

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card-gradient shadow-[var(--shadow-card)]">
      <div className="absolute inset-0 grid-bg opacity-60" />
      <div className="relative px-5 pt-5 flex items-center justify-between">
        <div>
          <div className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Live Global Network</div>
          <div className="text-lg font-semibold mt-0.5">Africa Operations Map</div>
        </div>
        <div className="flex items-center gap-2 text-xs">
          <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded border border-success/30 bg-success/10 text-success">
            <span className="size-1.5 rounded-full bg-success pulse-dot text-success" /> {cityNodes.length} nodes
          </span>
        </div>
      </div>

      <div className="relative h-[420px] mt-2">
        {cityNodes.length === 0 ? (
          <div className="grid place-items-center h-full text-sm text-muted-foreground">No network nodes</div>
        ) : (
          <svg viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet" className="absolute inset-0 w-full h-full">
            <defs>
              <radialGradient id="africaFill" cx="50%" cy="40%" r="60%">
                <stop offset="0%" stopColor="oklch(0.62 0.11 200 / 0.18)" />
                <stop offset="100%" stopColor="oklch(0.62 0.11 200 / 0.04)" />
              </radialGradient>
              <linearGradient id="lineGrad" x1="0" x2="1">
                <stop offset="0%" stopColor="oklch(0.62 0.11 200 / 0.0)" />
                <stop offset="50%" stopColor="oklch(0.7 0.22 350 / 0.7)" />
                <stop offset="100%" stopColor="oklch(0.62 0.11 200 / 0.0)" />
              </linearGradient>
            </defs>
            <path d={AFRICA_PATH} fill="url(#africaFill)" stroke="oklch(0.62 0.11 200 / 0.4)" strokeWidth="0.3" />

            {hub &&
              cityNodes
                .filter((c) => c.city !== hub.city)
                .map((c) => (
                  <line
                    key={c.city}
                    x1={hub.x}
                    y1={hub.y}
                    x2={c.x}
                    y2={c.y}
                    stroke="url(#lineGrad)"
                    strokeWidth="0.25"
                    strokeDasharray="0.6 0.6"
                  />
                ))}

            {cityNodes.map((c) => {
              const isActive = c.city === activeCity;
              return (
                <g key={c.city} onMouseEnter={() => setActive(c.city)} className="cursor-pointer">
                  <circle cx={c.x} cy={c.y} r={isActive ? 1.6 : 1.1} className={cn("transition-all", isActive ? "fill-pink" : "fill-primary")} />
                  <circle cx={c.x} cy={c.y} r={isActive ? 3 : 2.2} className={cn(isActive ? "fill-pink/20 ping-ring" : "fill-primary/20")} />
                  <text x={c.x + 2.2} y={c.y - 1.5} className="fill-foreground text-[2px] font-mono">
                    {c.city}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {node && (
          <div className="absolute bottom-4 left-4 right-4 md:right-auto md:w-72 rounded-lg border border-border bg-background/85 backdrop-blur-md p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-sm font-semibold">{node.city}</div>
                <div className="text-[11px] text-muted-foreground">{node.country}</div>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-success/15 text-success border border-success/30">ONLINE</span>
            </div>
            <div className="mt-3 grid grid-cols-3 gap-2 text-center">
              <div>
                <div className="font-mono text-base font-semibold">{node.hospitals}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Hospitals</div>
              </div>
              <div>
                <div className="font-mono text-base font-semibold">{node.pharmacies}</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Pharmacies</div>
              </div>
              <div>
                <div className="font-mono text-base font-semibold">{(node.patients / 1000).toFixed(1)}k</div>
                <div className="text-[10px] text-muted-foreground uppercase tracking-wider">Patients</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
