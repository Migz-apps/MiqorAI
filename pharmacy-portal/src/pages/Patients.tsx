import { Link } from "react-router-dom";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapPatientListItem } from "@/lib/api/mappers";
import { pharmacyKeys } from "@/store/rx";

export default function Patients() {
  const [q, setQ] = useState("");

  const { data: patients = [], isLoading } = useQuery({
    queryKey: pharmacyKeys.patients(),
    queryFn: async () => {
      const rows = await pharmacyApi.patients();
      return (rows as Array<{ id: string; name: string; phone?: string | null; email?: string | null }>).map(mapPatientListItem);
    },
  });

  const list = patients.filter((p) =>
    p.name.toLowerCase().includes(q.toLowerCase()) || p.id.toLowerCase().includes(q.toLowerCase()),
  );

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div>
        <h1 className="h1">Patients</h1>
        <p className="body text-text-secondary">All patients who have filled prescriptions at this pharmacy.</p>
      </div>
      <Card>
        <CardHeader className="pb-sm">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search by name or patient ID" className="pl-9 h-10" />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="p-md text-sm text-text-secondary">Loading patients…</div>}
            {list.map((p) => (
              <Link key={p.id} to={`/patients/${p.id}`} className="flex items-center gap-md px-md py-sm hover:bg-background-grey transition">
                <div className="h-9 w-9 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                  {p.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm">{p.name}</div>
                  <div className="text-xs text-text-secondary">{p.id} · {p.phone}</div>
                </div>
                <div className="hidden sm:flex flex-wrap gap-1 max-w-xs">
                  {p.allergies.map((a) => <Badge key={a} variant="outline" className="border-error/30 text-error bg-error/10 text-[10px]">{a}</Badge>)}
                  {p.conditions.map((c) => <Badge key={c} variant="outline" className="text-[10px]">{c}</Badge>)}
                </div>
                <div className="text-xs text-text-secondary">
                  Adherence <span className={p.adherence >= 80 ? "text-success" : p.adherence >= 60 ? "text-secondary" : "text-error"}>
                    {p.adherence}%
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
