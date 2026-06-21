import { Stethoscope, Lock, ShieldCheck, Sparkles } from "lucide-react";
import loginArt from "@/assets/login-art.jpg";

export const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
    {/* LEFT — visual */}
    <aside className="relative hidden lg:flex flex-col justify-between p-xl bg-primary text-primary-foreground overflow-hidden">
      <img
        src={loginArt}
        alt=""
        aria-hidden
        loading="lazy"
        width={1024}
        height={1280}
        className="absolute inset-0 h-full w-full object-cover opacity-90"
      />
      <div className="absolute inset-0 bg-gradient-to-br from-primary/85 via-primary/60 to-primary/85" />
      <div className="relative z-10 flex items-center gap-sm">
        <div className="h-9 w-9 rounded-md bg-primary-foreground/15 backdrop-blur flex items-center justify-center">
          <Stethoscope className="h-5 w-5" />
        </div>
        <div>
          <div className="text-sm font-semibold tracking-tight">Med-Pass</div>
          <div className="text-[11px] opacity-70">Hospital Portal</div>
        </div>
      </div>

      <div className="relative z-10 max-w-md space-y-md">
        <h2 className="text-3xl font-semibold leading-tight tracking-tight">
          One scan. Every record. Anywhere care happens.
        </h2>
        <p className="text-sm opacity-80 leading-relaxed">
          A calm, secure workspace built for clinicians — designed to stay out of your way during the moments that matter most.
        </p>
        <ul className="space-y-sm pt-sm text-sm">
          <li className="flex items-center gap-sm opacity-90"><ShieldCheck className="h-4 w-4" /> HIPAA-grade access controls</li>
          <li className="flex items-center gap-sm opacity-90"><Sparkles className="h-4 w-4" /> AI clinical summaries on every patient</li>
          <li className="flex items-center gap-sm opacity-90"><Lock className="h-4 w-4" /> Works offline, syncs when ready</li>
        </ul>
      </div>

      <div className="relative z-10 text-[11px] opacity-60">
        © {new Date().getFullYear()} Med-Pass · Trusted by hospitals across Africa
      </div>
    </aside>

    {/* RIGHT — form */}
    <main className="flex items-center justify-center p-md sm:p-xl bg-background">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  </div>
);
