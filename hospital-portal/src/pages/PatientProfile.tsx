import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Sparkles, Calendar, Pill, FileText, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { PATIENTS } from "@/lib/mockData";
import { PatientHeader } from "@/components/medpass/PatientHeader";
import { AllergyBanner } from "@/components/medpass/AllergyBanner";
import { AddVisitForm } from "@/components/medpass/AddVisitForm";
import { useAuth, can } from "@/store/auth";
import { useState } from "react";
import { Input } from "@/components/ui/input";

export default function PatientProfile() {
  const { id } = useParams();
  const nav = useNavigate();
  const session = useAuth(s => s.session)!;
  const patient = PATIENTS.find(p => p.id === id);
  const [recordFilter, setRecordFilter] = useState("");

  if (!patient) return (
    <div className="p-xl text-center">
      <p className="text-text-secondary">Patient not found.</p>
      <Button variant="link" onClick={() => nav("/patients")}>Back to patients</Button>
    </div>
  );

  const aiSummary = `${patient.name.split(" ")[0]} ${patient.conditions.length ? `has ${patient.conditions.join(", ").toLowerCase()}` : "has no chronic conditions on file"}${patient.prescriptions.filter(p => p.status === "active").length ? `, currently on ${patient.prescriptions.filter(p => p.status === "active").map(p => `${p.medication} ${p.dosage}`).join(", ")}` : ""}. Last visit: ${patient.lastVisit || "—"}. ${patient.allergies.length ? `Allergy to ${patient.allergies.map(a => a.name).join(", ")} confirmed.` : "No known allergies."}`;

  const filteredVisits = patient.visits.filter(v =>
    !recordFilter || `${v.type} ${v.diagnosis || ""} ${v.provider}`.toLowerCase().includes(recordFilter.toLowerCase())
  );

  return (
    <div className="space-y-md max-w-[1400px] mx-auto">
      <Button variant="ghost" size="sm" onClick={() => nav(-1)} className="-ml-2">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>

      <AllergyBanner allergies={patient.allergies} />
      <PatientHeader patient={patient} />

      <Tabs defaultValue="summary" className="space-y-md">
        <TabsList className="bg-card border">
          <TabsTrigger value="summary"><Sparkles className="h-4 w-4 mr-1" /> Summary</TabsTrigger>
          <TabsTrigger value="records"><FileText className="h-4 w-4 mr-1" /> Records</TabsTrigger>
          {can(session.role, "addDiagnosis") || can(session.role, "recordVitals") ? (
            <TabsTrigger value="add-visit"><Activity className="h-4 w-4 mr-1" /> Add Visit</TabsTrigger>
          ) : null}
          <TabsTrigger value="prescriptions"><Pill className="h-4 w-4 mr-1" /> Prescriptions</TabsTrigger>
        </TabsList>

        {/* SUMMARY */}
        <TabsContent value="summary" className="space-y-md">
          <Card>
            <CardHeader className="pb-sm">
              <CardTitle className="h3 flex items-center gap-sm">
                <Sparkles className="h-4 w-4 text-primary" /> AI summary
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="body-lg leading-relaxed">{aiSummary}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-md">
            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3">Last 3 visits</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.visits.slice(0, 3).map(v => (
                  <div key={v.id} className="flex items-start justify-between gap-sm border-b last:border-0 pb-sm last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{v.diagnosis || v.type}</div>
                      <div className="text-xs text-text-secondary">{v.provider}</div>
                    </div>
                    <div className="text-xs text-text-secondary whitespace-nowrap">{v.date}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3">Active medications</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.prescriptions.filter(p => p.status === "active").map(p => (
                  <div key={p.id} className="flex items-center justify-between gap-sm border-b last:border-0 pb-sm last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{p.medication} {p.dosage}</div>
                      <div className="text-xs text-text-secondary">{p.frequency} · {p.pharmacy}</div>
                    </div>
                    <Badge className="bg-success/15 text-success border-success/30">filled</Badge>
                  </div>
                ))}
                {patient.prescriptions.filter(p => p.status === "active").length === 0 && (
                  <div className="text-sm text-text-secondary">No active medications.</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Calendar className="h-4 w-4 text-primary" /> Upcoming appointments</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.upcomingAppointments.length === 0 && <div className="text-sm text-text-secondary">None scheduled.</div>}
                {patient.upcomingAppointments.map((a, i) => (
                  <div key={i} className="flex items-center justify-between border-b last:border-0 pb-sm last:pb-0">
                    <div>
                      <div className="text-sm font-medium">{a.reason}</div>
                      <div className="text-xs text-text-secondary">{a.provider}</div>
                    </div>
                    <div className="text-xs">{a.date}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3">Health alerts</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.labs.some(l => l.status !== "completed") && (
                  <div className="text-sm flex gap-sm"><span className="text-secondary">●</span> Pending lab results</div>
                )}
                {patient.allergies.length > 0 && (
                  <div className="text-sm flex gap-sm"><span className="text-error">●</span> {patient.allergies.length} allergy alert(s)</div>
                )}
                {!patient.labs.some(l => l.status !== "completed") && patient.allergies.length === 0 && (
                  <div className="text-sm text-text-secondary">No active alerts.</div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* RECORDS */}
        <TabsContent value="records" className="space-y-md">
          <Card>
            <CardHeader className="pb-sm">
              <CardTitle className="h3">Full history</CardTitle>
            </CardHeader>
            <CardContent className="space-y-md">
              <Input placeholder="Filter by type, diagnosis, provider…" value={recordFilter} onChange={e => setRecordFilter(e.target.value)} />
              <div className="border rounded-md overflow-hidden">
                <div className="hidden md:grid grid-cols-12 px-sm py-xs bg-background-grey text-xs font-medium text-text-secondary">
                  <div className="col-span-2">Date</div>
                  <div className="col-span-2">Type</div>
                  <div className="col-span-3">Provider</div>
                  <div className="col-span-5">Notes</div>
                </div>
                <div className="divide-y">
                  {filteredVisits.map(v => (
                    <div key={v.id} className="flex md:grid md:grid-cols-12 flex-col md:flex-row gap-xs px-sm py-sm text-sm">
                      <div className="md:col-span-2 text-text-secondary text-xs md:text-sm">{v.date}</div>
                      <div className="md:col-span-2"><Badge variant="outline">{v.type}</Badge></div>
                      <div className="md:col-span-3 text-xs md:text-sm">{v.provider}</div>
                      <div className="md:col-span-5">
                        <div className="font-medium">{v.diagnosis || "—"}</div>
                        {v.notes && <div className="text-xs text-text-secondary">{v.notes}</div>}
                        {v.vitals && <div className="text-xs text-text-secondary mt-0.5">BP {v.vitals.bp} · HR {v.vitals.hr} · Temp {v.vitals.temp}°C · SpO₂ {v.vitals.spo2}%</div>}
                      </div>
                    </div>
                  ))}
                  {filteredVisits.length === 0 && (
                    <div className="p-md text-center text-sm text-text-secondary">No matching records.</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ADD VISIT */}
        {(can(session.role, "addDiagnosis") || can(session.role, "recordVitals")) && (
          <TabsContent value="add-visit">
            <AddVisitForm patient={patient} />
          </TabsContent>
        )}

        {/* PRESCRIPTIONS */}
        <TabsContent value="prescriptions" className="space-y-md">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3">Active</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.prescriptions.filter(p => p.status === "active").map(p => (
                  <div key={p.id} className="p-sm rounded-md border bg-background-grey">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.medication} {p.dosage}</div>
                      <Badge className="bg-success/15 text-success border-success/30">filled</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">{p.frequency} · {p.duration} · {p.pharmacy}</div>
                    <div className="text-xs text-text-secondary">By {p.prescribedBy} on {p.date}</div>
                  </div>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-sm"><CardTitle className="h3">History (6 months)</CardTitle></CardHeader>
              <CardContent className="space-y-sm">
                {patient.prescriptions.filter(p => p.status !== "active").map(p => (
                  <div key={p.id} className="p-sm rounded-md border">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">{p.medication} {p.dosage}</div>
                      <Badge variant="outline" className="capitalize">{p.status}</Badge>
                    </div>
                    <div className="text-xs text-text-secondary">{p.frequency} · {p.pharmacy}</div>
                    <div className="text-xs text-text-secondary">By {p.prescribedBy} on {p.date}</div>
                  </div>
                ))}
                {patient.prescriptions.filter(p => p.status !== "active").length === 0 && (
                  <div className="text-sm text-text-secondary">No prior prescriptions on file.</div>
                )}
              </CardContent>
            </Card>
          </div>

          {can(session.role, "prescribe") && (
            <div>
              <h3 className="h3 mb-sm">New prescription</h3>
              <CardContent className="p-0">
                {/* re-use builder */}
              </CardContent>
              <PrescriptionBuilderInline patient={patient} />
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

// inline import to avoid circular issues
import { PrescriptionBuilder as PrescriptionBuilderInline } from "@/components/medpass/PrescriptionBuilder";
