import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Eye, MapPin, X } from "lucide-react";
import { useState } from "react";
import { PageShell } from "@/components/portal/PageShell";
import {
  adminApi,
  adminKeys,
  type HospitalStat,
  type PilotHospitalStat,
} from "@/lib/api/admin";
import { getMe } from "@/lib/api/client";
import { fmtKsh } from "@/lib/format";
import { toast } from "@/lib/notify";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hospitals")({
  head: () => ({ meta: [{ title: "Hospitals · MiqorAI Management" }] }),
  component: HospitalsPage,
});

function HospitalsPage() {
  const queryClient = useQueryClient();
  const [tab, setTab] = useState(0);

  const { data: me } = useQuery({
    queryKey: ["admin", "me"],
    queryFn: () => getMe(),
  });

  const { data: pending } = useQuery({
    queryKey: adminKeys.hospitals("pending"),
    queryFn: () => adminApi.hospitalsStats({ status: "pending", limit: 50 }),
    enabled: tab === 0,
  });
  const { data: active } = useQuery({
    queryKey: adminKeys.hospitals("active"),
    queryFn: () => adminApi.hospitalsStats({ status: "active", limit: 50 }),
    enabled: tab === 1,
  });
  const { data: pilot } = useQuery({
    queryKey: adminKeys.hospitalsPilot,
    queryFn: () => adminApi.hospitalsPilotEnding(),
    enabled: tab === 2,
  });
  const { data: all } = useQuery({
    queryKey: adminKeys.hospitals("all"),
    queryFn: () => adminApi.hospitalsStats({ limit: 100 }),
    enabled: tab === 3,
  });

  const refreshHospitals = async () => {
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: adminKeys.hospitals("pending") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.hospitals("active") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.hospitals("all") }),
      queryClient.invalidateQueries({ queryKey: adminKeys.hospitalsPilot }),
      queryClient.invalidateQueries({ queryKey: adminKeys.dashboard }),
      queryClient.invalidateQueries({ queryKey: adminKeys.pending }),
      queryClient.invalidateQueries({ queryKey: adminKeys.activity }),
    ]);
  };

  const approveMutation = useMutation({
    mutationFn: async (hospitalId: string) => {
      if (!me?.id) throw new Error("Admin session not ready");
      const pilotEndDate = new Date(Date.now() + 90 * 86400000)
        .toISOString()
        .slice(0, 10);
      return adminApi.approveHospital(hospitalId, me.id, pilotEndDate);
    },
    onSuccess: async () => {
      toast.success("Hospital approved");
      await refreshHospitals();
    },
    onError: (error) => toast.error(error),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ hospitalId, reason }: { hospitalId: string; reason: string }) =>
      adminApi.rejectHospital(hospitalId, reason),
    onSuccess: async () => {
      toast.success("Hospital rejected");
      await refreshHospitals();
    },
    onError: (error) => toast.error(error),
  });

  const statusMutation = useMutation({
    mutationFn: ({
      hospitalId,
      status,
    }: {
      hospitalId: string;
      status: "active" | "disabled";
    }) => adminApi.setHospitalStatus(hospitalId, status),
    onSuccess: async (_, variables) => {
      toast.success(
        variables.status === "active" ? "Hospital restored" : "Hospital disabled",
      );
      await refreshHospitals();
    },
    onError: (error) => toast.error(error),
  });

  const tabs = [
    `Pending (${pending?.total ?? "..."})`,
    `Active (${active?.total ?? "..."})`,
    `Pilots Ending Soon (${pilot?.total ?? "..."})`,
    "All",
  ];

  const sharedProps = {
    onApprove: (hospitalId: string) => approveMutation.mutate(hospitalId),
    onReject: (hospitalId: string) => {
      const reason = window.prompt("Reason for rejecting this hospital");
      if (!reason?.trim()) return;
      rejectMutation.mutate({ hospitalId, reason: reason.trim() });
    },
    onToggleStatus: (hospitalId: string, status: "active" | "disabled") =>
      statusMutation.mutate({ hospitalId, status }),
    busy:
      approveMutation.isPending ||
      rejectMutation.isPending ||
      statusMutation.isPending,
  };

  return (
    <PageShell
      title="Hospital Management"
      subtitle="Approve, monitor & manage every hospital in the network"
    >
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
        <HospitalTable
          title="Pending Verification"
          hospitals={pending?.items ?? []}
          total={pending?.total}
          {...sharedProps}
        />
      )}
      {tab === 1 && (
        <HospitalTable
          title="Active Hospitals"
          hospitals={active?.items ?? []}
          total={active?.total}
          {...sharedProps}
        />
      )}
      {tab === 2 && (
        <HospitalTable
          title="Pilots Ending Soon"
          hospitals={pilot?.items ?? []}
          total={pilot?.total}
          {...sharedProps}
        />
      )}
      {tab === 3 && (
        <HospitalTable
          title="All Hospitals"
          hospitals={all?.items ?? []}
          total={all?.total}
          {...sharedProps}
        />
      )}
    </PageShell>
  );
}

function HospitalTable({
  title,
  hospitals,
  total,
  onApprove,
  onReject,
  onToggleStatus,
  busy,
}: {
  title: string;
  hospitals: Array<HospitalStat | PilotHospitalStat>;
  total?: number;
  onApprove: (hospitalId: string) => void;
  onReject: (hospitalId: string) => void;
  onToggleStatus: (hospitalId: string, status: "active" | "disabled") => void;
  busy: boolean;
}) {
  return (
    <div className="rounded-xl border border-border bg-card-gradient overflow-hidden shadow-[var(--shadow-card)]">
      <div className="px-5 py-4 border-b border-border/60 flex items-center justify-between">
        <h3 className="text-sm font-semibold">{title}</h3>
        <span className="text-xs text-muted-foreground font-mono">
          {hospitals.length} of {total ?? hospitals.length}
        </span>
      </div>
      <table className="w-full text-sm">
        <thead className="text-[11px] uppercase tracking-wider text-muted-foreground">
          <tr className="border-b border-border/60">
            <th className="text-left font-medium px-5 py-3">Hospital</th>
            <th className="text-left font-medium px-2 py-3">Location</th>
            <th className="text-right font-medium px-2 py-3">Patients</th>
            <th className="text-right font-medium px-2 py-3">Savings</th>
            <th className="text-left font-medium px-2 py-3">Pilot</th>
            <th className="text-right font-medium px-5 py-3">Actions</th>
          </tr>
        </thead>
        <tbody>
          {hospitals.length === 0 ? (
            <tr>
              <td colSpan={6} className="px-5 py-8 text-center text-muted-foreground">
                No hospitals found
              </td>
            </tr>
          ) : (
            hospitals.map((hospital) => {
              const days = hospital.pilot_days_remaining;
              const isActive = hospital.isActive ?? true;
              const patientCount = hospital.patient_count ?? hospital.visit_count ?? 0;
              const totalSavings = hospital.total_savings ?? 0;
              const location =
                [hospital.city, hospital.country].filter(Boolean).join(", ") ||
                hospital.code ||
                "Unspecified";
              const pilotTone =
                days === null
                  ? "bg-accent text-muted-foreground border-border"
                  : days <= 7
                    ? "bg-warning/10 text-warning border-warning/30"
                    : "bg-info/10 text-info border-info/30";

              return (
                <tr key={hospital.id} className="border-b border-border/30 hover:bg-accent/30">
                  <td className="px-5 py-3 font-medium">{hospital.name}</td>
                  <td className="px-2 py-3 text-muted-foreground">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="size-3" />
                      {location}
                    </span>
                  </td>
                  <td className="px-2 py-3 font-mono text-right">
                    {patientCount.toLocaleString()}
                  </td>
                  <td className="px-2 py-3 font-mono text-right text-success">
                    {fmtKsh(totalSavings)}
                  </td>
                  <td className="px-2 py-3">
                    <span
                      className={cn(
                        "text-xs font-mono px-1.5 py-0.5 rounded border",
                        pilotTone,
                      )}
                    >
                      {days === null ? "not set" : `${days}d left`}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          toast.info(
                            `${hospital.name} has ${patientCount} patients and ${fmtKsh(totalSavings)} in tracked savings.`,
                          )
                        }
                        className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md border border-border text-xs hover:bg-accent"
                      >
                        <Eye className="size-3.5" /> Review
                      </button>
                      {!hospital.verified ? (
                        <>
                          <button
                            type="button"
                            onClick={() => onApprove(hospital.id)}
                            disabled={busy}
                            className="h-8 px-2.5 inline-flex items-center gap-1 rounded-md bg-success/15 text-success border border-success/30 hover:bg-success/25 text-xs font-medium disabled:opacity-60"
                          >
                            <Check className="size-3.5" /> Approve
                          </button>
                          <button
                            type="button"
                            onClick={() => onReject(hospital.id)}
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
                              hospital.id,
                              isActive ? "disabled" : "active",
                            )
                          }
                          disabled={busy}
                          className={cn(
                            "h-8 px-2.5 inline-flex items-center gap-1 rounded-md border text-xs font-medium disabled:opacity-60",
                            isActive
                              ? "border-destructive/30 text-destructive hover:bg-destructive/10"
                              : "border-success/30 text-success hover:bg-success/10",
                          )}
                        >
                          {isActive ? "Disable" : "Re-enable"}
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })
          )}
        </tbody>
      </table>
    </div>
  );
}
