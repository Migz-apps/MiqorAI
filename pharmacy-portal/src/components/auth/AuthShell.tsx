import { Pill } from "lucide-react";

export const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen grid lg:grid-cols-2">
    {/* Branded left panel */}
    <div className="hidden lg:flex flex-col justify-between p-xl bg-gradient-to-br from-primary via-primary to-pharmacy text-primary-foreground relative overflow-hidden">
      <div className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-pharmacy/40 blur-3xl" />
      <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-primary-foreground/10 blur-3xl" />
      <div className="relative flex items-center gap-sm">
        <div className="h-10 w-10 rounded-md bg-pharmacy flex items-center justify-center">
          <Pill className="h-5 w-5 text-pharmacy-foreground" />
        </div>
        <div>
          <div className="text-base font-semibold">MiqorAI</div>
          <div className="text-xs opacity-80">Pharmacy Portal</div>
        </div>
      </div>
      <div className="relative space-y-md max-w-md">
        <h2 className="text-3xl font-bold leading-tight">
          Dispense smarter.<br />Care closer.
        </h2>
        <p className="text-sm opacity-85">
          Receive digital prescriptions from any MiqorAI hospital, verify patients with a QR scan,
          and track adherence — all from one calm, fast workspace.
        </p>
        <div className="grid grid-cols-3 gap-sm pt-md">
          {[
            { k: "12k+", v: "Prescriptions/mo" },
            { k: "98%",  v: "Accuracy"        },
            { k: "<2s",  v: "QR verify"       },
          ].map(s => (
            <div key={s.k} className="rounded-md bg-primary-foreground/10 p-sm backdrop-blur">
              <div className="text-lg font-bold">{s.k}</div>
              <div className="text-[11px] opacity-80">{s.v}</div>
            </div>
          ))}
        </div>
      </div>
      <div className="relative text-[11px] opacity-70">© MiqorAI Health · Connected pharmacy network</div>
    </div>

    {/* Form panel */}
    <div className="flex items-center justify-center p-md sm:p-lg bg-background-grey">
      <div className="w-full max-w-md bg-background rounded-lg border shadow-sm p-lg sm:p-xl">
        {children}
      </div>
    </div>
  </div>
);
