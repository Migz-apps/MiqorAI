import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/miqorai/QRScanner";
import { CheckInList } from "@/components/miqorai/CheckInList";
import { PageHeader } from "@/components/miqorai/PageHeader";
import { KpiCard } from "@/components/miqorai/KpiCard";
import { ScanLine, Users, Activity, ClipboardList } from "lucide-react";
import { hospitalApi } from "@/lib/api/hospital";
import { can, useAuth } from "@/store/auth";
import { Link } from "react-router-dom";

function displayName(value: unknown, fallback = "Patient") {
  const name = typeof value === "string" ? value.trim() : "";
  return name || fallback;
}

function initials(name: string) {
  return name.split(" ").map(n => n[0]).slice(0, 2).join("").toUpperCase();
}

export default function Dashboard() {
  const session = useAuth(s => s.session)!;
  const canScan = can(session.role, "scan");
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  const { data: dash, isLoading } = useQuery({
    queryKey: ["hospital", "dashboard"],
    queryFn: () => hospitalApi.dashboard(),
  });

  const recent = Array.isArray(dash?.recent_patients)
    ? (dash.recent_patients as Array<{ patient_id?: string; name?: string; checked_in_at?: string }>)
    : [];
  const staffName = displayName(session?.name, "Doctor");
  const hospitalName = displayName(session?.hospitalName, "your hospital");

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto animate-fade-up">
      <PageHeader
        title={`Good morning, ${staffName.split(" ")[0]}`}
        subtitle={`${today} · Here's what's happening at ${hospitalName} today.`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <KpiCard icon={Users} label="Patients today" value={isLoading ? "…" : String(dash?.today_checkins ?? 0)} accent="primary" />
        <KpiCard icon={Activity} label="In treatment" value={isLoading ? "…" : String(dash?.in_treatment ?? 0)} accent="success" />
        <KpiCard icon={ClipboardList} label="Visits this week" value={isLoading ? "…" : String(dash?.visits_this_week ?? 0)} accent="secondary" hint="Across all departments" />
        <KpiCard icon={ScanLine} label="QR scans today" value={isLoading ? "…" : String(dash?.qr_scans_today ?? 0)} accent="primary" hint="Patient check-ins" />
      </div>

      <div className={`grid grid-cols-1 ${canScan ? "lg:grid-cols-2" : ""} gap-lg`}>
        {canScan && (
          <Card>
            <CardHeader className="pb-sm">
              <CardTitle className="h3 flex items-center gap-sm">
                <ScanLine className="h-5 w-5 text-primary" /> Scan Patient QR
              </CardTitle>
            </CardHeader>
            <CardContent>
              <QRScanner />
            </CardContent>
          </Card>
        )}
        <CheckInList />
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Recent patients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading && <div className="p-md text-sm text-text-secondary">Loading…</div>}
          <div className="divide-y">
            {recent.slice(0, 5).map((p, index) => {
              const patientId = displayName(p.patient_id, "");
              const name = displayName(p.name);
              if (!patientId) return null;
              return (
              <Link key={`${patientId}-${index}`} to={`/patients/${patientId}`} className="flex items-center gap-md px-md py-sm hover:bg-background-grey">
                <div className="h-9 w-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                  {initials(name)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{name}</div>
                  <div className="text-xs text-text-secondary">{patientId.slice(0, 8)}… · Checked in {p.checked_in_at ? new Date(p.checked_in_at).toLocaleTimeString() : "—"}</div>
                </div>
              </Link>
            );})}
            {!isLoading && recent.length === 0 && (
              <div className="p-md text-sm text-text-secondary">No check-ins today yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
