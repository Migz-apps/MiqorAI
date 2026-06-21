import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, SlidersHorizontal } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PATIENTS, ICD11_CODES, DRUG_DATABASE } from "@/lib/mockData";

export default function Patients() {
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [diag, setDiag] = useState<string>("any");
  const [drug, setDrug] = useState<string>("any");
  const [age, setAge] = useState<string>("any");

  const calcAge = (dob: string) => Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400 * 1000));

  const results = useMemo(() => PATIENTS.filter(p => {
    if (q && !(`${p.name} ${p.id} ${p.phone}`.toLowerCase().includes(q.toLowerCase()))) return false;
    if (diag !== "any" && !p.conditions.some(c => c.toLowerCase().includes(diag.toLowerCase()))) return false;
    if (drug !== "any" && !p.prescriptions.some(rx => rx.medication === drug)) return false;
    if (age !== "any") {
      const a = calcAge(p.dob);
      if (age === "0-17" && a >= 18) return false;
      if (age === "18-40" && (a < 18 || a > 40)) return false;
      if (age === "41-65" && (a < 41 || a > 65)) return false;
      if (age === "65+" && a < 65) return false;
    }
    return true;
  }), [q, diag, drug, age]);

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
                    <Select value={diag} onValueChange={setDiag}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {ICD11_CODES.map(c => <SelectItem key={c.code} value={c.label}>{c.code} — {c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-xs">
                    <Label>Prescribed medication</Label>
                    <Select value={drug} onValueChange={setDrug}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        {DRUG_DATABASE.map(d => <SelectItem key={d.name} value={d.name}>{d.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-xs">
                    <Label>Age range</Label>
                    <Select value={age} onValueChange={setAge}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="any">Any</SelectItem>
                        <SelectItem value="0-17">0–17</SelectItem>
                        <SelectItem value="18-40">18–40</SelectItem>
                        <SelectItem value="41-65">41–65</SelectItem>
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
            <div className="col-span-2">Age / Gender</div>
            <div className="col-span-3">Conditions</div>
            <div className="col-span-1 text-right">Last visit</div>
          </div>
          <div className="divide-y">
            {results.map(p => (
              <button key={p.id} onClick={() => nav(`/patients/${p.id}`)} className="w-full text-left flex md:grid md:grid-cols-12 md:items-center gap-sm px-md py-sm hover:bg-primary-light/40 transition-colors">
                <div className="md:col-span-4 flex items-center gap-sm min-w-0 flex-1">
                  <div className="h-9 w-9 rounded-full bg-primary-light text-primary flex items-center justify-center text-xs font-semibold shrink-0">
                    {p.name.split(" ").map(n => n[0]).slice(0,2).join("")}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="font-medium truncate flex items-center gap-xs">
                      {p.name}
                      {p.allergies.length > 0 && <Badge className="bg-error/15 text-error border-error/30 text-[10px] hover:bg-error/15">⚠</Badge>}
                    </div>
                    <div className="text-xs text-text-secondary truncate">{p.phone}</div>
                    <div className="text-xs text-text-secondary truncate md:hidden">{p.id} · {calcAge(p.dob)} · {p.gender} · {p.conditions[0] || "—"}</div>
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2 font-mono text-xs">{p.id}</div>
                <div className="hidden md:block md:col-span-2 text-sm">{calcAge(p.dob)} · {p.gender}</div>
                <div className="hidden md:block md:col-span-3 text-sm text-text-secondary truncate">{p.conditions.join(", ") || "—"}</div>
                <div className="hidden md:block md:col-span-1 text-right text-xs text-text-secondary">{p.lastVisit || "—"}</div>
              </button>
            ))}
            {results.length === 0 && (
              <div className="p-xl text-center text-sm text-text-secondary">
                No patients match these filters. <a href="#" className="text-primary hover:underline">Register a new patient</a>.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
