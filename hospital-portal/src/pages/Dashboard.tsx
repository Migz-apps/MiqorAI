import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/medpass/QRScanner";
import { CheckInList } from "@/components/medpass/CheckInList";
import { ScanLine, Users, Activity, ClipboardList } from "lucide-react";
import { CHECK_IN_QUEUE, PATIENTS } from "@/lib/mockData";
import { useAuth } from "@/store/auth";

const StatCard = ({ icon: Icon, label, value, accent }: any) => (
  <Card>
    <CardContent className="p-md flex items-center gap-md">
      <div className={`h-10 w-10 rounded-md flex items-center justify-center ${accent}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-xl font-semibold">{value}</div>
      </div>
    </CardContent>
  </Card>
);

export default function Dashboard() {
  const session = useAuth(s => s.session)!;
  const today = new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div>
        <div className="text-xs text-text-secondary">{today}</div>
        <h1 className="h1">Good morning, {session.name.split(" ")[0]}</h1>
        <p className="body text-text-secondary">Here's what's happening at your hospital today.</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-md">
        <StatCard icon={Users} label="Patients today" value={CHECK_IN_QUEUE.length} accent="bg-primary-light text-primary" />
        <StatCard icon={Activity} label="In treatment" value={CHECK_IN_QUEUE.filter(c => c.status !== "waiting").length} accent="bg-success/15 text-success" />
        <StatCard icon={ClipboardList} label="Visits this week" value={42} accent="bg-secondary/15 text-secondary" />
        <StatCard icon={ScanLine} label="QR scans today" value={18} accent="bg-foreground/10 text-foreground" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-lg">
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
        <CheckInList />
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Recent patients</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {PATIENTS.slice(0,5).map(p => (
              <a key={p.id} href={`/patients/${p.id}`} className="flex items-center gap-md px-md py-sm hover:bg-background-grey">
                <div className="h-9 w-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold">
                  {p.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-text-secondary">{p.id} · Last visit {p.lastVisit}</div>
                </div>
                <div className="text-xs text-text-secondary">{p.conditions[0] || "—"}</div>
              </a>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
