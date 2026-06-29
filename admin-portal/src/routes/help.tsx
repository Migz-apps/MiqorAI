import { createFileRoute } from "@tanstack/react-router";
import { PageShell } from "@/components/portal/PageShell";

export const Route = createFileRoute("/help")({
  head: () => ({ meta: [{ title: "Help · MiqorAI Management" }] }),
  component: () => (
    <PageShell title="Help & Docs" subtitle="Operating manual for the cockpit">
      <div className="rounded-xl border border-border bg-card-gradient p-6 shadow-[var(--shadow-card)] max-w-2xl">
        <h3 className="text-lg font-semibold">Need a hand?</h3>
        <p className="text-sm text-muted-foreground mt-2">
          The cockpit is built so any approval, dispute or invoice is at most 2 clicks away.
          For deeper questions, ping internal Slack <span className="font-mono text-primary">#MiqorAI-ops</span>.
        </p>
        <div className="mt-5 flex gap-2">
          <button className="h-9 px-4 rounded-md bg-primary text-primary-foreground text-sm font-medium glow-primary">Open documentation</button>
          <button className="h-9 px-4 rounded-md border border-border text-sm hover:bg-accent">Contact support</button>
        </div>
      </div>
    </PageShell>
  ),
});
