import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/portal/PageShell";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · MiqorAI Management" }] }),
  component: () => (
    <PageShell title="Settings" subtitle="Team, security & global rules">
      <div className="grid md:grid-cols-2 gap-4">
        {[
          { t: "Team Members", d: "Invite operators, admins & compliance officers." },
          { t: "Two-Factor Auth", d: "Required for every account · TOTP enforced." },
          { t: "Notification Rules", d: "Choose when MiqorAI pings your phone." },
          { t: "Global Defaults", d: "Pilot length · platform fees · retention." },
        ].map((s) => (
          <div key={s.t} className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
            <div className="text-sm font-semibold">{s.t}</div>
            <div className="text-xs text-muted-foreground mt-1">{s.d}</div>
            <button className="mt-4 h-8 px-3 rounded-md border border-border text-xs hover:bg-accent">Configure</button>
          </div>
        ))}
      </div>
    </PageShell>
  ),
});
