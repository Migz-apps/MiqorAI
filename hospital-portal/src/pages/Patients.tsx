import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@miqorai/ui/input";
import { Button } from "@miqorai/ui/button";
import { Card, CardContent } from "@miqorai/ui/card";
import { Badge } from "@miqorai/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@miqorai/ui/dialog";
import { Label } from "@miqorai/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@miqorai/ui/select";
import { hospitalApi, referenceApi } from "@/lib/api/hospital";
import { mapCensusPatient, mapDrug, mapIcd } from "@/lib/mappers";
import { CatalogFilter } from "@/components/miqorai/CatalogFilter";

export default function Patients() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [diag, setDiag] = useState<string>("any");
  const [drug, setDrug] = useState<string>("any");
  const [age, setAge] = useState<string>("any");

  const ageParams = useMemo(() => {
    if (age === "0-17") return { age_min: "0", age_max: "17" };
    if (age === "18-40") return { age_min: "18", age_max: "40" };
    if (age === "41-65") return { age_min: "41", age_max: "65" };
    if (age === "65+") return { age_min: "65" };
    return {};
  }, [age]);

  const { data: results = [], isLoading, isError } = useQuery({
    queryKey: ["hospital", "patients", "census", q, diag, drug, age],
    queryFn: async () => {
      const params: Record<string, string> = { ...ageParams };
      if (q.trim()) params.search = q.trim();
      if (diag !== "any") params.diagnosis = diag;
      if (drug !== "any") params.medication = drug;
      const rows = await hospitalApi.patientsCensus(params);
      return (rows as Record<string, unknown>[]).map(mapCensusPatient);
    },
  });

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div className="flex items-end justify-between gap-md">
        <div>
          <h1 className="h1">Patients</h1>
          <p className="body text-text-secondary">Search across this hospital's records.</p>
        </div>
      </div>

      <Card>
        <CardContent className="p-md">
          <div className="flex gap-sm">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
              <Input className="pl-9" placeholder="Search by name, Patient ID, or phone…" value={q} onChange={e => setQ(e.target.value)} />
            </div>
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline" className="gap-sm">
                  <SlidersHorizontal className="h-4 w-4" /> Filters
                  {(diag !== "any" || drug !== "any" || age !== "any") && <Badge className="bg-primary text-primary-foreground h-5 px-1.5">!</Badge>}
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Filters</DialogTitle></DialogHeader>
                <div className="space-y-md">
                  <div className="space-y-xs">
                    <Label>Diagnosis</Label>
                    <CatalogFilter
                      label="Diagnosis"
                      value={diag}
                      onChange={setDiag}
                      queryKey={["reference", "icd", "paged"]}
                      fetchPage={referenceApi.icdPage}
                      toOption={(row) => {
                        const c = mapIcd(row);
                        return { value: c.label, label: `${c.code} - ${c.label}`, hint: c.code };
                      }}
                      placeholder="Search ICD code or description…"
                    />
                  </div>
                  <div className="space-y-xs">
                    <Label>Prescribed medication</Label>
                    <CatalogFilter
                      label="Prescribed medication"
                      value={drug}
                      onChange={setDrug}
                      queryKey={["reference", "drugs", "paged"]}
                      fetchPage={referenceApi.drugsPage}
                      toOption={(row) => {
                        const d = mapDrug(row);
                        const strength = d.forms[0] === "—" ? "" : d.forms[0];
                        return { value: d.name, label: strength ? `${d.name} · ${strength}` : d.name, hint: String(row.id ?? strength) };
                      }}
                      placeholder="Search drug or generic name…"
                    />
                  </div>
                  <div className="space-y-xs">
                    <Label>Age range</Label>
                    <Select value={age} onValueChange={setAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="0-17">0-17</SelectItem>
                        <SelectItem value="18-40">18-40</SelectItem>
                        <SelectItem value="41-65">41-65</SelectItem>
                        <SelectItem value="65+">65+</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => { setDiag("any"); setDrug("any"); setAge("any"); }}>Reset</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <div className="hidden md:grid grid-cols-12 px-md py-sm text-xs font-medium text-text-secondary border-b bg-background-grey">
            <div className="col-span-4">Patient</div>
            <div className="col-span-2">ID</div>
            <div className="col-span-2">Blood type</div>
            <div className="col-span-3">Status</div>
            <div className="col-span-1 text-right">Last visit</div>
          </div>
          {isLoading && <div className="p-md text-sm text-text-secondary">Loading patients…</div>}
          {isError && <div role="alert" className="p-md text-sm text-error">Failed to load patients.</div>}
          <div className="divide-y">
            {results.map(p => (
              <button key={p.id} onClick={() => nav(`/patients/${p.id}`)} className="w-full text-left flex md:grid md:grid-cols-12 md:items-center gap-sm px-md py-sm hover:bg-primary-light/40 transition-colors">
                <div className="md:col-span-4 flex items-center gap-sm min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {p.name.split(" ").map(n => n[0]).slice(0, 2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate">{p.name}</div>
                    <div className="text-xs text-text-secondary truncate md:hidden">{p.id.slice(0, 8)}… · {p.bloodType}</div>
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2 font-mono text-xs">{p.id.slice(0, 8)}…</div>
                <div className="hidden md:block md:col-span-2 text-sm">{p.bloodType}</div>
                <div className="hidden md:block md:col-span-3 text-sm text-text-secondary truncate">
                  {p.hasActiveDraft
                    ? "Unfinished visit draft"
                    : p.myPrescriptionMedications?.length
                      ? `My Rx: ${p.myPrescriptionMedications.join(", ")}`
                      : p.openVisitStatus
                        ? `Open visit: ${p.openVisitStatus.replace("_", " ")}`
                        : "—"}
                </div>
                <div className="hidden md:block md:col-span-1 text-right text-xs text-text-secondary">{p.lastVisit || "—"}</div>
              </button>
            ))}
            {!isLoading && results.length === 0 && (
              <div className="p-xl text-center text-sm text-text-secondary">
                No patients match these filters.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
