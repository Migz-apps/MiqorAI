import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { hospitalApi, referenceApi } from "@/lib/api/hospital";
import { mapPrescriptionListItem } from "@/lib/mappers";

export default function Prescriptions() {
  const { data: all = [], isLoading } = useQuery({
    queryKey: ["prescriptions"],
    queryFn: async () => {
      const rows = await hospitalApi.prescriptions() as Record<string, unknown>[];
      return rows.map(mapPrescriptionListItem);
    },
  });

  const { data: pharmacies = [] } = useQuery({
    queryKey: ["pharmacies"],
    queryFn: async () => {
      const rows = await referenceApi.pharmacies() as Array<{ name: string }>;
      return rows;
    },
  });

  const active = all.filter(rx => rx.status === "active" || rx.status === "filled");

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1">Prescriptions</h1>
        <p className="body text-text-secondary">{active.length} active · {all.length} total · routed across {pharmacies.length || 1} pharmacies.</p>
      </div>

      {isLoading && <div className="text-sm text-text-secondary">Loading prescriptions…</div>}

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
              <div key={rx.id} className="grid md:grid-cols-12 gap-sm px-md py-sm items-center">
                <Link to={`/patients/${rx.patientId}`} className="md:col-span-3 text-sm font-medium hover:underline truncate">{rx.patientName}</Link>
                <div className="md:col-span-3 text-sm">{rx.medication}</div>
                <div className="md:col-span-2 text-xs text-text-secondary">{rx.dosage} · {rx.frequency}</div>
                <div className="md:col-span-2 text-xs text-text-secondary truncate">{rx.pharmacy}</div>
                <div className="md:col-span-1 text-xs text-text-secondary">{rx.date}</div>
                <div className="md:col-span-1 md:text-right">
                  <Badge variant="outline" className={
                    rx.status === "active" || rx.status === "filled" ? "border-success/30 text-success bg-success/10" :
                    rx.status === "expired" ? "border-text-secondary/30 text-text-secondary bg-background-grey" :
                    "border-secondary/30 text-secondary bg-secondary/10"
                  }>{rx.status}</Badge>
                </div>
              </div>
            ))}
            {!isLoading && all.length === 0 && (
              <div className="px-md py-sm text-sm text-text-secondary">No prescriptions yet.</div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
