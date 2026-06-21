import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity, TrendingDown, TrendingUp, Minus } from "lucide-react";
import { PATIENTS } from "@/lib/mockData";

const statusColor: Record<string, string> = {
  ordered: "border-secondary/30 text-secondary bg-secondary/10",
  "in-progress": "border-[hsl(var(--clinical-accent))]/30 text-[hsl(var(--clinical-accent))] bg-[hsl(var(--clinical-light))]",
  completed: "border-success/30 text-success bg-success/10",
};

const valueLevel = (v?: number, lo?: number, hi?: number) => {
  if (v == null || lo == null || hi == null) return "neutral";
  if (v < lo || v > hi * 1.2) return "high";
  if (v > hi) return "border";
  return "ok";
};
const levelColor: Record<string, string> = {
  ok: "text-success", border: "text-secondary", high: "text-error", neutral: "text-foreground",
};

export default function Labs() {
  const all = useMemo(() => {
    return PATIENTS.flatMap(p => p.labs.map(l => ({ ...l, patientId: p.id, patientName: p.name })))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, []);
  const [tab, setTab] = useState<"all" | "trends">("all");

  // Trends: HbA1c series for Grace
  const grace = PATIENTS[0];
  const hbA1cSeries = grace.labs.filter(l => l.test === "HbA1c" && l.numericResult != null).sort((a,b) => a.date.localeCompare(b.date));
  const min = Math.min(...hbA1cSeries.map(l => l.numericResult!), 5);
  const max = Math.max(...hbA1cSeries.map(l => l.numericResult!), 10);
  const path = hbA1cSeries.map((l, i) => {
    const x = (i / Math.max(1, hbA1cSeries.length - 1)) * 100;
    const y = 100 - ((l.numericResult! - min) / Math.max(0.1, max - min)) * 100;
    return `${i === 0 ? "M" : "L"} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join(" ");

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md flex-wrap">
        <div>
          <h1 className="h1 flex items-center gap-sm"><Activity className="h-6 w-6 text-primary" /> Lab results</h1>
          <p className="body text-text-secondary">{all.length} orders · color-coded by clinical range.</p>
        </div>
        <div className="flex gap-xs">
          <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>All results</Button>
          <Button variant={tab === "trends" ? "default" : "outline"} size="sm" onClick={() => setTab("trends")}>Trends</Button>
        </div>
      </div>

      {tab === "all" && (
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {all.map(l => {
                const lvl = valueLevel(l.numericResult, l.refLow, l.refHigh);
                return (
                  <div key={`${l.patientId}-${l.id}`} className="px-md py-sm flex items-center gap-md">
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{l.test}</div>
                      <div className="text-xs text-text-secondary">{l.patientName} · {l.date} · {l.orderedBy}</div>
                    </div>
                    {l.result && (
                      <div className={`text-sm font-semibold ${levelColor[lvl]}`}>
                        {l.result}
                        {l.refLow != null && l.refHigh != null && (
                          <span className="text-[10px] text-text-secondary ml-1">(ref {l.refLow}-{l.refHigh})</span>
                        )}
                      </div>
                    )}
                    <Badge variant="outline" className={statusColor[l.status]}>{l.status}</Badge>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {tab === "trends" && (
        <Card>
          <CardHeader className="pb-sm">
            <CardTitle className="h3">HbA1c trend — {grace.name}</CardTitle>
            <div className="text-xs text-text-secondary flex items-center gap-1">
              {hbA1cSeries[hbA1cSeries.length - 1]?.numericResult! < hbA1cSeries[0]?.numericResult! ? (
                <><TrendingDown className="h-3 w-3 text-success" /> Improving</>
              ) : hbA1cSeries[hbA1cSeries.length - 1]?.numericResult! > hbA1cSeries[0]?.numericResult! ? (
                <><TrendingUp className="h-3 w-3 text-error" /> Worsening</>
              ) : (<><Minus className="h-3 w-3" /> Stable</>)}
            </div>
          </CardHeader>
          <CardContent>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-48 bg-background-grey rounded-md">
              {/* normal range band 4-5.6 -> y for that range */}
              {(() => {
                const yLo = 100 - ((5.6 - min) / (max - min)) * 100;
                const yHi = 100 - ((4 - min) / (max - min)) * 100;
                return <rect x="0" y={yLo} width="100" height={yHi - yLo} fill="hsl(var(--success) / 0.1)" />;
              })()}
              <path d={path} fill="none" stroke="hsl(var(--clinical-accent))" strokeWidth="0.8" />
              {hbA1cSeries.map((l, i) => {
                const x = (i / Math.max(1, hbA1cSeries.length - 1)) * 100;
                const y = 100 - ((l.numericResult! - min) / Math.max(0.1, max - min)) * 100;
                return <circle key={l.id} cx={x} cy={y} r="1.5" fill="hsl(var(--clinical-accent))" />;
              })}
            </svg>
            <div className="grid grid-cols-4 gap-sm mt-md text-xs">
              {hbA1cSeries.map(l => (
                <div key={l.id} className="text-center">
                  <div className="font-semibold">{l.numericResult}%</div>
                  <div className="text-text-secondary">{l.date}</div>
                </div>
              ))}
            </div>
            <div className="text-[11px] text-text-secondary mt-md">Green band = normal range (4–5.6%).</div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
