import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, Pill, X } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/portal/PageShell";
import { adminApi, adminKeys, type PharmacyStat } from "@/lib/api/admin";
import { getMe } from "@/lib/api/client";
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pharmacies")({
  head: () => ({ meta: [{ title: "Pharmacies · MiqorAI Management" }] }),
  component: PharmaciesPage,
});

function PharmaciesPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => getMe(),
  });

  const { data: pending } = useQuery({
    queryKey: adminKeys.pharmacies("pending"),
    queryFn: () => adminApi.pharmaciesStats({ status: "pending", limit: 50 }),
    enabled: tab === 0,
  });
  const { data: active } = useQuery({
    queryKey: adminKeys.pharmacies("active"),
    queryFn: () => adminApi.pharmaciesStats({ status: "active", limit: 50 }),
    enabled: tab === 1,
  });
  const { data: disabled } = useQuery({
    queryKey: adminKeys.pharmacies("disabled"),
    queryFn: () => adminApi.pharmaciesStats({ status: "disabled", limit: 50 }),
    enabled: tab === 2,
  });
  const { data: all } = useQuery({
    queryKey: adminKeys.pharmacies("all"),
    queryFn: () => adminApi.pharmaciesStats({ limit: 100 }),
    enabled: tab === 3,
  });

  const refreshPharmacies = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.pharmacies("pending") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pharmacies("active") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pharmacies("disabled") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pharmacies("all") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: async (pharmacyId: string) => {
      if (!me?.id) throw new Error("Admin session not ready");
      return adminApi.approvePharmacy(pharmacyId, me.id);
    },
    onSuccess: async () => {
      toast.success("Pharmacy approved");
      await refreshPharmacies();
    },
    onError: (error) => toast.error(error),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ pharmacyId, reason }: { pharmacyId: string; reason: string }) =>
      adminApi.rejectPharmacy(pharmacyId, reason),
    onSuccess: async () => {
      toast.success("Pharmacy rejected");
      await refreshPharmacies();
    },
    onError: (error) => toast.error(error),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      pharmacyId,
      status,
    }: {
      pharmacyId: string;
      status: "active" | "disabled";
    }) => adminApi.setPharmacyStatus(pharmacyId, status),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "active" ? "Pharmacy restored" : "Pharmacy disabled",
      );
      await refreshPharmacies();
    },
    onError: (error) => toast.error(error),
  });

  const tabs = [
    `Pending (${pending?.total ?? "..."})`,
    `Active (${active?.total ?? "..."})`,
    `Disabled (${disabled?.total ?? "..."})`,
    "All",
  ];

  const sharedProps = {
    onApprove: (pharmacyId: string) => approveMutation.mutate(pharmacyId),
    onReject: (pharmacyId: string) => {
      const reason = window.prompt("Reason for rejecting this pharmacy");
      if (!reason?.trim()) return;
      rejectMutation.mutate({ pharmacyId, reason: reason.trim() });
    },
    onToggleStatus: (pharmacyId: string, status: "active" | "disabled") =>
      statusMutation.mutate({ pharmacyId, status }),
    busy:
      approveMutation.isPending ||
      rejectMutation.isPending ||
      statusMutation.isPending,
  };

  return (
    <PageShell title="Pharmacies" subtitle="Verified dispensaries across the network">
      <div className="flex flex-wrap gap-2">
        {tabs.map((label, index) => (
          <button
            key={label}
            type="button"
            onClick={() => setTab(index)}
            className={cn(
              "h-9 px-3.5 rounded-md text-xs font-medium border transition-all",
              tab === index
                ? "bg-primary/15 text-primary border-primary/40 glow-primary"
                : "border-border bg-card/60 text-muted-foreground hover:text-foreground",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 0 && (
        <PharmacyTable
          title="Pending Verification"
          pharmacies={pending?.items ?? []}
          total={pending?.total}
          {...sharedProps}
        />
      )}
      {tab === 1 && (
        <PharmacyTable
          title="Active Pharmacies"
          pharmacies={active?.items ?? []}
          total={active?.total}
          {...sharedProps}
        />
      )}
      {tab === 2 && (
        <PharmacyTable
          title="Disabled Pharmacies"
          pharmacies={disabled?.items ?? []}
          total={disabled?.total}
          {...sharedProps}
        />
      )}
      {tab === 3 && (
        <PharmacyTable
          title="All Pharmacies"
          pharmacies={all?.items ?? []}
          total={all?.total}
          {...sharedProps}
        />
      )}
    </PageShell>
  );
}

function PharmacyTable({
  title,
  pharmacies,
  total,
  onApprove,
  onReject,
  onToggleStatus,
  busy,
}: {
  title: string;
  pharmacies: PharmacyStat[];
  total?: number;
  onApprove: (pharmacyId: string) => void;
  onReject: (pharmacyId: string) => void;
  onToggleStatus: (pharmacyId: string, status: "active" | "disabled") => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {pharmacies.length} of {total ?? pharmacies.length}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/60">
            <th className="text-left font-medium px-5 py-3">Pharmacy</th>
            <th className="text-left font-medium px-2 py-3">Location</th>
            <th className="text-left font-medium px-2 py-3">License</th>
            <th className="text-right font-medium px-2 py-3">Scripts</th>
            <th className="text-left font-medium px-2 py-3">Status</th>
            <th className="text-right font-medium px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {pharmacies.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                No pharmacies found
              </td>
            </tr>
          ) : (
            pharmacies.map((pharmacy) => (
              <tr key={pharmacy.id} className="border-b border-border/30 hover:bg-accent/30">
                <td className="px-5 py-3 font-medium">
                  <span className="inline-flex items-center gap-2">
                    <Pill className="size-4 text-purple" />
                    {pharmacy.name}
                  </span>
                </td>
                <td className="px-2 py-3 text-muted-foreground">{pharmacy.city}</td>
                <td className="px-2 py-3 font-mono text-xs text-muted-foreground">
                  {pharmacy.licenseNumber ?? pharmacy.registrationNumber ?? "-"}
                </td>
                <td className="px-2 py-3 font-mono text-right">
                  {pharmacy.script_volume.toLocaleString()}
                </td>
                <td className="px-2 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={cn(
                        "size-1.5 rounded-full pulse-dot",
                        pharmacy.verified && pharmacy.isActive
                          ? "bg-success text-success"
                          : pharmacy.verified
                            ? "bg-warning text-warning"
                            : "bg-info text-info",
                      )}
                    />
                    {!pharmacy.verified
                      ? "Pending"
                      : pharmacy.isActive
                        ? "Active"
                        : "Disabled"}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <div className="flex justify-end gap-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        toast.info(
                          `${pharmacy.name} has processed ${pharmacy.script_volume.toLocaleString()} prescriptions.`,
                        )
                      }
                      className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md border border-border text-xs hover:bg-accent"
                    >
                      <Eye className="size-3.5" /> Review
                    </button>
                    {!pharmacy.verified ? (
                      <>
                        <button
                          type="button"
                          onClick={() => onApprove(pharmacy.id)}
                          disabled={busy}
                          className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-medium disabled:opacity-60"
                        >
                          <Check className="size-3.5" /> Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onReject(pharmacy.id)}
                          disabled={busy}
                          className="h-8 w-8 grid place-items-center rounded-md border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                        >
                          <X className="size-3.5" />
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          onToggleStatus(
                            pharmacy.id,
                            pharmacy.isActive ? "disabled" : "active",
                          )
                        }
                        disabled={busy}
                        className={cn(
                          "h-8 px-2.5 inline-flex items-center gap-1 rounded-md border text-xs font-medium disabled:opacity-60",
                          pharmacy.isActive
                            ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                            : "border-success/30 text-success hover:bg-success/10",
                        )}
                      >
                        {pharmacy.isActive ? "Disable" : "Re-enable"}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
