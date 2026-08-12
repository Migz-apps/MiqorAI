import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys } from "@/lib/api/admin";
import { formatTs } from "@/lib/format";
import { toast } from "@/lib/notify";

export const Route = createFileRoute("/settings")({
  head: () => ({ meta: [{ title: "Settings · MiqorAI Management" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: settings } = useQuery({
    queryKey: adminKeys.settings,
    queryFn: () => adminApi.getPlatformSettings(),
  });
  const { data: invitations = [] } = useQuery({
    queryKey: adminKeys.invitations,
    queryFn: () => adminApi.listInvitations(),
  });

  const [defaults, setDefaults] = useState({
    defaultPilotDurationDays: "90",
    infrastructureFeeUsd: "0.01",
    savingsFeePercentage: "20",
    invitationExpiryDays: "7",
  });
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("operator");

  useEffect(() => {
    if (!settings) return;
    setDefaults({
      defaultPilotDurationDays: String(settings.default_pilot_duration_days ?? 90),
      infrastructureFeeUsd: String(settings.infrastructure_fee_usd ?? 0.01),
      savingsFeePercentage: String(settings.savings_fee_percentage ?? 20),
      invitationExpiryDays: String(settings.invitation_expiry_days ?? 7),
    });
  }, [settings]);

  const saveMutation = useMutation({
    mutationFn: () =>
      adminApi.updatePlatformSettings({
        default_pilot_duration_days: Number(defaults.defaultPilotDurationDays),
        infrastructure_fee_usd: Number(defaults.infrastructureFeeUsd),
        savings_fee_percentage: Number(defaults.savingsFeePercentage),
        invitation_expiry_days: Number(defaults.invitationExpiryDays),
      }),
    onSuccess: async () => {
      toast.success("Platform settings saved");
      await queryClient.invalidateQueries({ queryKey: adminKeys.settings });
    },
    onError: (error) => toast.error(error),
  });

  const inviteMutation = useMutation({
    mutationFn: () =>
      adminApi.createInvitation({
        email: inviteEmail.trim(),
        role: inviteRole,
      }),
    onSuccess: async (result) => {
      setInviteEmail("");
      toast.success("Invitation created");
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(result.invite_url).catch(() => undefined);
      }
      await queryClient.invalidateQueries({ queryKey: adminKeys.invitations });
    },
    onError: (error) => toast.error(error),
  });

  const deleteMutation = useMutation({
    mutationFn: (invitationId: string) => adminApi.deleteInvitation(invitationId),
    onSuccess: async () => {
      toast.success("Invitation revoked");
      await queryClient.invalidateQueries({ queryKey: adminKeys.invitations });
    },
    onError: (error) => toast.error(error),
  });

  return (
    <PageShell title="Settings" subtitle="Team, security & global rules">
      <div className="grid xl:grid-cols-[1.15fr_0.85fr] gap-6">
        <section className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold">Global Defaults</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Control pilot windows, pricing and how long admin invites stay active.
              </p>
            </div>
            <button
              type="button"
              onClick={() => saveMutation.mutate()}
              disabled={saveMutation.isPending}
              className="h-9 px-3.5 rounded-md bg-primary/15 text-primary border border-primary/30 hover:bg-primary/25 text-sm font-medium disabled:opacity-60"
            >
              Save changes
            </button>
          </div>

          <div className="grid md:grid-cols-2 gap-4 mt-5">
            <SettingField
              label="Default pilot duration"
              suffix="days"
              value={defaults.defaultPilotDurationDays}
              onChange={(value) =>
                setDefaults((current) => ({ ...current, defaultPilotDurationDays: value }))
              }
            />
            <SettingField
              label="Infrastructure fee"
              suffix="USD"
              value={defaults.infrastructureFeeUsd}
              onChange={(value) =>
                setDefaults((current) => ({ ...current, infrastructureFeeUsd: value }))
              }
            />
            <SettingField
              label="Savings fee share"
              suffix="%"
              value={defaults.savingsFeePercentage}
              onChange={(value) =>
                setDefaults((current) => ({ ...current, savingsFeePercentage: value }))
              }
            />
            <SettingField
              label="Invitation expiry"
              suffix="days"
              value={defaults.invitationExpiryDays}
              onChange={(value) =>
                setDefaults((current) => ({ ...current, invitationExpiryDays: value }))
              }
            />
          </div>
        </section>

        <section className="rounded-xl border border-border bg-card-gradient p-5 shadow-[var(--shadow-card)]">
          <div>
            <h3 className="text-sm font-semibold">Invite Team Members</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Invite operators, compliance reviewers and additional super admins.
            </p>
          </div>

          <div className="grid gap-3 mt-5">
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Email
              <input
                type="email"
                value={inviteEmail}
                onChange={(event) => setInviteEmail(event.target.value)}
                placeholder="name@example.com"
                className="h-10 rounded-md border border-border bg-card/60 px-3 text-sm text-foreground outline-none focus:border-primary"
              />
            </label>
            <label className="grid gap-1.5 text-xs text-muted-foreground">
              Role
              <select
                value={inviteRole}
                onChange={(event) => setInviteRole(event.target.value)}
                className="h-10 rounded-md border border-border bg-card/60 px-3 text-sm text-foreground outline-none focus:border-primary"
              >
                <option value="operator">Operator</option>
                <option value="compliance_officer">Compliance Officer</option>
                <option value="super_admin">Super Admin</option>
              </select>
            </label>
            <button
              type="button"
              onClick={() => inviteMutation.mutate()}
              disabled={inviteMutation.isPending || !inviteEmail.trim()}
              className="h-10 rounded-md bg-gradient-primary text-primary-foreground text-sm font-medium disabled:opacity-60"
            >
              Send invite
            </button>
          </div>
        </section>
      </div>

      <section className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
        <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold">Pending Invitations</h3>
            <p className="mt-1 text-xs text-muted-foreground">
              Active links that have not yet been accepted.
            </p>
          </div>
          <span className="text-xs text-muted-foreground font-mono">
            {invitations.length} open
          </span>
        </div>
        <div className="divide-y divide-border/40">
          {invitations.length === 0 ? (
            <div className="px-5 py-8 text-sm text-muted-foreground">No active invitations</div>
          ) : (
            invitations.map((invitation) => (
              <div key={invitation.id} className="px-5 py-4 flex items-center gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{invitation.email}</div>
                  <div className="mt-1 text-[11px] text-muted-foreground font-mono">
                    {invitation.role} · expires {formatTs(invitation.expiresAt)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => deleteMutation.mutate(invitation.id)}
                  disabled={deleteMutation.isPending}
                  className="h-8 px-3 rounded-md border border-destructive/30 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-60"
                >
                  Revoke
                </button>
              </div>
            ))
          )}
        </div>
      </section>
    </PageShell>
  );
}

function SettingField({
  label,
  suffix,
  value,
  onChange,
}: {
  label: string;
  suffix: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <label className="grid gap-1.5 text-xs text-muted-foreground">
      {label}
      <div className="flex items-center rounded-md border border-border bg-card/60">
        <input
          type="number"
          step="0.01"
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="h-10 flex-1 bg-transparent px-3 text-sm text-foreground outline-none"
        />
        <span className="px-3 text-[11px] font-mono text-muted-foreground">{suffix}</span>
      </div>
    </label>
  );
}
