import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Phone, AlertTriangle, Activity } from "lucide-react";
import { StatusBadge } from "@/components/MiqorAI/StatusBadge";
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip } from "recharts";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapPatientDetail, mapPrescription } from "@/lib/api/mappers";
import { pharmacyKeys } from "@/store/rx";

export default function PatientProfile() {
  const { id } = useParams();

  const { data: patientData, isLoading } = useQuery({
    queryKey: pharmacyKeys.patient(id!),
    queryFn: () => pharmacyApi.patient(id!),
    enabled: !!id,
  });

  const { data: adherence } = useQuery({
    queryKey: pharmacyKeys.patientAdherence(id!),
    queryFn: () => pharmacyApi.patientAdherence(id!),
    enabled: !!id,
  });

  const { data: history = [] } = useQuery({
    queryKey: [...pharmacyKeys.patient(id!), "history"],
    queryFn: () => pharmacyApi.patientAdherenceHistory(id!),
    enabled: !!id,
  });

  if (isLoading) return <div className="p-lg text-sm text-text-secondary">Loading patient…</div>;
  if (!patientData) return <div className="p-lg">Patient not found.</div>;

  const patient = mapPatientDetail(
    patientData as Parameters<typeof mapPatientDetail>[0],
    adherence as { overall_rate?: number },
  );
  const prescriptions = ((patientData as { prescriptions?: unknown[] }).prescriptions ?? []).map((rx) =>
    mapPrescription(rx as Parameters<typeof mapPrescription>[0]),
  );
  const trend = (history as Array<{ month?: string; adherence_pct?: number }>).map((h) => ({
    month: h.month?.slice(5) ?? "",
    value: Math.round(h.adherence_pct ?? 0),
  }));

  return (
    <div className="max-w-[1400px] mx-auto space-y-md">
      <Link to="/patients" className="inline-flex items-center gap-sm text-sm text-text-secondary hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Patients
      </Link>

      <div className="flex items-start gap-md">
        <div className="h-14 w-14 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-base font-semibold">
          {patient.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
        </div>
        <div className="flex-1">
          <h1 className="h1">{patient.name}</h1>
          <div className="text-sm text-text-secondary flex flex-wrap items-center gap-md">
            <span>{patient.id} · age {patient.age}</span>
            <span className="flex items-center gap-1"><Phone className="h-3 w-3" /> {patient.phone}</span>
            <span>Last visit {patient.lastVisit}</span>
          </div>
        </div>
        <Button variant="outline">Send adherence SMS</Button>
      </div>

      {patient.allergies.length > 0 && (
        <div className="rounded-lg border border-error/40 bg-error/10 p-md flex items-start gap-md">
          <AlertTriangle className="h-5 w-5 text-error" />
          <div>
            <div className="font-semibold text-error text-sm">Allergies</div>
            <div className="flex flex-wrap gap-1 mt-1">
              {patient.allergies.map((a) => <Badge key={a} variant="outline" className="border-error/30 text-error bg-error/10">{a}</Badge>)}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Conditions</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1">
            {patient.conditions.length === 0 ? <span className="text-sm text-text-secondary">None on file.</span>
              : patient.conditions.map((c) => <Badge key={c} variant="outline">{c}</Badge>)}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-sm">
            <CardTitle className="h3 flex items-center gap-sm">
              <Activity className="h-4 w-4 text-pharmacy" /> Adherence — last 6 months ·
              <span className={patient.adherence >= 80 ? "text-success" : patient.adherence >= 60 ? "text-secondary" : "text-error"}>
                {patient.adherence}%
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-44">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trend}>
                  <XAxis dataKey="month" stroke="hsl(var(--text-secondary))" fontSize={11} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} domain={[50, 100]} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Line type="monotone" dataKey="value" stroke="hsl(var(--pharmacy))" strokeWidth={2.5} dot={{ r: 3 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Prescriptions</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {prescriptions.length === 0 && <div className="p-md text-sm text-text-secondary">No prescriptions on record.</div>}
            {prescriptions.map((r) => (
              <Link key={r.id} to={`/prescriptions/${r.id}`} className="flex items-center gap-md px-md py-sm hover:bg-background-grey transition">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{r.id} · {r.diagnosis}</div>
                  <div className="text-xs text-text-secondary">{r.doctorName} · {new Date(r.issuedAt).toLocaleDateString()}</div>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
