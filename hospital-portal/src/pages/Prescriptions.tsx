import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { PATIENTS, PHARMACIES } from "@/lib/mockData";

export default function Prescriptions() {
  const all = useMemo(() => {
    return PATIENTS.flatMap(p => p.prescriptions.map(rx => ({ ...rx, patientId: p.id, patientName: p.name })))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, []);
  const active = all.filter(rx => rx.status === "active");

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1">Prescriptions</h1>
        <p className="body text-text-secondary">{active.length} active · {all.length} total · routed across {PHARMACIES.length} pharmacies.</p>
      </div>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Recent prescriptions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-12 px-md py-sm bg-background-grey text-xs font-medium text-text-secondary border-b">
            <div className="col-span-3">Patient</div>
            <div className="col-span-3">Medication</div>
            <div className="col-span-2">Dosage</div>
            <div className="col-span-2">Pharmacy</div>
            <div className="col-span-1">Date</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          <div className="divide-y">
            {all.map(rx => (
              <div key={`${rx.patientId}-${rx.id}`} className="grid md:grid-cols-12 gap-sm px-md py-sm items-center">
                <Link to={`/patients/${rx.patientId}`} className="md:col-span-3 text-sm font-medium hover:underline truncate">{rx.patientName}</Link>
                <div className="md:col-span-3 text-sm">{rx.medication}</div>
                <div className="md:col-span-2 text-xs text-text-secondary">{rx.dosage} · {rx.frequency}</div>
                <div className="md:col-span-2 text-xs text-text-secondary truncate">{rx.pharmacy}</div>
                <div className="md:col-span-1 text-xs text-text-secondary">{rx.date}</div>
                <div className="md:col-span-1 md:text-right">
                  <Badge variant="outline" className={
                    rx.status === "active" ? "border-success/30 text-success bg-success/10" :
                    rx.status === "expired" ? "border-text-secondary/30 text-text-secondary bg-background-grey" :
                    "border-secondary/30 text-secondary bg-secondary/10"
                  }>{rx.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
