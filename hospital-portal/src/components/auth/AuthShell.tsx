import { Stethoscope, ShieldCheck, Sparkles, Lock } from "lucide-react";

export const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    <div className="hidden lg:flex flex-col justify-between p-xl bg-gradient-to-br from-primary via-primary to-[hsl(213_38%_17%)] text-primary-foreground relative overflow-hidden">
      <div className="absolute -right-40 -top-40 h-[28rem] w-[28rem] rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="absolute -left-24 bottom-10 h-72 w-72 rounded-full bg-success/20 blur-3xl" />
      <div className="absolute inset-0 opacity-[0.04] [background-image:linear-gradient(hsl(var(--primary-foreground))_1px,transparent_1px),linear-gradient(90deg,hsl(var(--primary-foreground))_1px,transparent_1px)] [background-size:40px_40px]" />

      <div className="relative flex items-center gap-sm">
        <div className="h-10 w-10 rounded-md bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <div className="text-base font-semibold">MiqorAI</div>
          <div className="text-xs opacity-80">Hospital Portal</div>
        </div>
      </div>

      <div className="relative space-y-md max-w-md animate-fade-up">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary-foreground/10 backdrop-blur text-[11px] font-medium">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Trusted by hospitals across East Africa
        </div>
        <h2 className="text-3xl font-bold leading-tight">
          One scan. Every record.<br />Anywhere care happens.
        </h2>
        <p className="text-sm opacity-85">
          A calm, secure workspace built for clinicians — patient check-in, records,
          prescriptions, and billing in one connected MiqorAI network.
        </p>
        <ul className="space-y-sm pt-sm text-sm">
          <li className="flex items-center gap-sm opacity-90"><ShieldCheck className="h-4 w-4" /> HIPAA-grade access controls</li>
          <li className="flex items-center gap-sm opacity-90"><Sparkles className="h-4 w-4" /> AI clinical summaries on every patient</li>
          <li className="flex items-center gap-sm opacity-90"><Lock className="h-4 w-4" /> Works offline, syncs when ready</li>
        </ul>
      </div>

      <div className="relative text-[11px] opacity-70">© MiqorAI · Trusted by hospitals across Africa</div>
    </div>

    <div className="flex items-center justify-center p-md sm:p-lg bg-background-grey">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-lg sm:p-xl">
        {children}
      </div>
    </div>
  </div>
);
