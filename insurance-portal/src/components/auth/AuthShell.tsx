import { Building2, ShieldCheck, TrendingUp, Eye } from "lucide-react";

export const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    {/* Branded left panel — shares brand teal/insurer blue */}
    <div className="hidden lg:flex flex-col justify-between p-xl bg-gradient-to-br from-primary via-primary to-[hsl(213_38%_17%)] text-primary-foreground relative overflow-hidden">
      <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-insurer/30 blur-3xl" />
      <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--primary-foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary-foreground))_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex items-center gap-sm">
        <div className="h-10 w-10 rounded-md bg-insurer flex items-center justify-center">
          <Building2 className="h-5 w-5 text-insurer-foreground" />
        </div>
        <div>
          <div className="text-base font-semibold">MiqorAI</div>
          <div className="text-xs opacity-80">Insurer Portal</div>
        </div>
      </div>

      <div className="relative space-y-md max-w-md animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur text-[11px] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Trusted by 14 insurers across East Africa
        </div>
        <h2 className="text-3xl font-bold leading-tight">
          See every Franc<br />MiqorAI saves you.
        </h2>
        <p className="text-sm opacity-85">
          Audit duplicate-test savings, monitor adherence outcomes, detect fraud, and
          generate board-ready reports — with a verified data trail behind every metric.
        </p>
        <div className="grid grid-cols-3 gap-sm pt-md">
          {[
            { icon: TrendingUp, k: "KSh 1.2M", v: "Saved this month" },
            { icon: Eye, k: "12,847", v: "Duplicates blocked" },
            { icon: ShieldCheck, k: "3.4×", v: "ROI" },
          ].map(s => (
            <div key={s.k} className="rounded-md bg-primary-foreground/10 p-sm backdrop-blur border border-primary-foreground/10">
              <s.icon className="h-3.5 w-3.5 opacity-80 mb-1" />
              <div className="text-base font-bold">{s.k}</div>
              <div className="text-[10px] opacity-80">{s.v}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="relative text-[11px] opacity-70">© MiqorAI Health · Connected payer network</div>
    </div>

    {/* Form panel */}
    <div className="flex items-center justify-center p-md sm:p-lg bg-background-grey">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-lg sm:p-xl">
        {children}
      </div>
    </div>
  </div>
);
