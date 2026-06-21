import { AlertTriangle } from "lucide-react";
import type { Allergy } from "@/lib/types";

export const AllergyBanner = ({ allergies }: { allergies: Allergy[] }) => {
  if (!allergies.length) return null;
  const critical = allergies.filter(a => a.severity === "severe");
  if (!critical.length) return (
    <div className="rounded-md border border-secondary/30 bg-secondary/10 px-md py-sm flex items-start gap-sm">
      <AlertTriangle className="h-5 w-5 text-secondary shrink-0 mt-0.5" />
      <div className="text-sm">
        <div className="font-semibold text-secondary">Allergies on file</div>
        <div className="text-foreground/80">{allergies.map(a => `${a.name} (${a.severity})`).join(" · ")}</div>
      </div>
    </div>
  );
  return (
    <div className="rounded-md border-2 border-error bg-error/10 px-md py-sm flex items-start gap-sm">
      <AlertTriangle className="h-5 w-5 text-error shrink-0 mt-0.5" />
      <div className="text-sm">
        <div className="font-bold text-error uppercase tracking-wide text-xs">⚠ Critical allergies</div>
        <div className="font-semibold text-foreground">{allergies.map(a => `${a.name} (${a.severity})`).join(" · ")}</div>
      </div>
    </div>
  );
};
