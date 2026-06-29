import { createFileRoute, Link, useNavigate, Navigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sparkles, Eye, EyeOff, ShieldCheck, Activity, Globe2, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { FormAlert } from "@/components/FormAlert";
import { MESSAGES } from "@/lib/user-messages";

export const Route = createFileRoute("/login")({
  head: () => ({
    meta: [
      { title: "Sign in · MiqorAI Management" },
      { name: "description", content: "Secure access to the MiqorAI Management dashboard." },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const session = useAuth((s) => s.session);
  const login = useAuth((s) => s.login);
  const nav = useNavigate();
  const [show, setShow] = useState(false);
  const [email, setEmail] = useState("admin@miqorai.com");
  const [pwd, setPwd] = useState("MiqorAI123!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (session) return <Navigate to="/" replace />;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const result = await login(email, pwd);
    if (!result.ok) {
      setError(result.error ?? MESSAGES.auth.invalidCredentials);
      setLoading(false);
      return;
    }
    nav({ to: "/" });
  }

  return (
    <div className="min-h-screen w-full grid lg:grid-cols-2 bg-background">
      {/* LEFT — brand panel */}
      <div className="relative hidden lg:flex flex-col justify-between p-10 overflow-hidden border-r border-border">
        <div className="absolute inset-0 bg-cockpit" />
        <div className="absolute inset-0 grid-bg opacity-50" />
        <div className="absolute -top-24 -left-24 size-[420px] rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute -bottom-32 -right-24 size-[460px] rounded-full bg-pink/15 blur-3xl" />

        <div className="relative flex items-center gap-3">
          <div className="size-10 rounded-lg bg-gradient-primary grid place-items-center glow-primary">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <div className="leading-tight">
            <div className="text-sm font-semibold tracking-tight">MiqorAI</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Management Console</div>
          </div>
        </div>

        <div className="relative space-y-6 max-w-md">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full border border-success/30 bg-success/10 text-success text-[11px] font-mono">
            <span className="size-1.5 rounded-full bg-success pulse-dot text-success" />
            ALL SYSTEMS OPERATIONAL
          </div>
          <h1 className="text-4xl font-semibold tracking-tight leading-tight">
            The command center <br />for the <span className="text-gradient">MiqorAI</span> network.
          </h1>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Approve hospitals, resolve disputes, monitor billing & system health — all in one
            real-time cockpit covering 4 countries and 127k+ patients.
          </p>

          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { i: Globe2, k: "4", l: "Countries" },
              { i: Activity, k: "47", l: "Hospitals" },
              { i: ShieldCheck, k: "99.97%", l: "Uptime" },
            ].map(({ i: I, k, l }) => (
              <div key={l} className="rounded-lg border border-border bg-card-gradient p-3">
                <I className="size-4 text-primary" />
                <div className="mt-2 font-mono text-lg font-semibold">{k}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{l}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative text-[11px] text-muted-foreground font-mono flex items-center gap-2">
          <Lock className="size-3" /> SOC 2 · HIPAA-ready · End-to-end encrypted
        </div>
      </div>

      {/* RIGHT — form */}
      <div className="flex items-center justify-center p-6 sm:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden flex items-center gap-3 mb-8">
            <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center glow-primary">
              <Sparkles className="size-5 text-primary-foreground" />
            </div>
            <div className="text-sm font-semibold tracking-tight">MiqorAI</div>
          </div>

          <h2 className="text-2xl font-semibold tracking-tight">Welcome back</h2>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Sign in to access the management dashboard.
          </p>

          <form onSubmit={submit} className="mt-8 space-y-4">
            <div>
              <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Email</label>
              <input
                type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full h-11 rounded-md border border-border bg-card/60 px-3 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
              />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-[11px] uppercase tracking-[0.16em] text-muted-foreground">Password</label>
                <button type="button" className="text-[11px] text-primary hover:underline">Forgot?</button>
              </div>
              <div className="relative mt-1.5">
                <input
                  type={show ? "text" : "password"} required value={pwd} onChange={(e) => setPwd(e.target.value)}
                  placeholder="••••••••••"
                  className="w-full h-11 rounded-md border border-border bg-card/60 px-3 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-primary"
                />
                <button type="button" onClick={() => setShow(s => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-md hover:bg-accent text-muted-foreground">
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {error ? <FormAlert>{error}</FormAlert> : null}

            <label className="flex items-center gap-2 text-xs text-muted-foreground">
              <input type="checkbox" className="size-3.5 rounded border-border accent-[var(--color-primary)]" defaultChecked />
              Keep me signed in for 30 days
            </label>

            <button
              type="submit" disabled={loading}
              className="w-full h-11 rounded-md bg-gradient-primary text-primary-foreground font-medium glow-primary hover:opacity-95 transition disabled:opacity-60"
            >
              {loading ? "Authenticating…" : "Sign in to Dashboard"}
            </button>

            <div className="relative my-2">
              <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-border" /></div>
              <div className="relative flex justify-center"><span className="bg-background px-2 text-[10px] uppercase tracking-[0.2em] text-muted-foreground">or</span></div>
            </div>

            <button type="button" className="w-full h-11 rounded-md border border-border bg-card/60 text-sm hover:bg-accent transition flex items-center justify-center gap-2">
              <ShieldCheck className="size-4 text-primary" /> Continue with SSO
            </button>
          </form>

          <p className="mt-8 text-center text-xs text-muted-foreground">
            Need an account? <Link to="/" className="text-primary hover:underline">Request access</Link>
          </p>
          <p className="mt-3 text-center text-[10px] font-mono text-muted-foreground/70">
            MiqorAI · v2.6.1 · Build 20260508
          </p>
        </div>
      </div>
    </div>
  );
}
