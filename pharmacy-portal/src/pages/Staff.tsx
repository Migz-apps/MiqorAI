import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Plus, MoreHorizontal } from "lucide-react";
import { ROLE_LABEL } from "@/store/auth";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapStaffMember } from "@/lib/api/mappers";
import { pharmacyKeys } from "@/store/rx";

export default function Staff() {
  const { data: staff = [], isLoading } = useQuery({
    queryKey: pharmacyKeys.staff(),
    queryFn: async () => {
      const rows = await pharmacyApi.staff();
      return (rows as Parameters<typeof mapStaffMember>[0][]).map(mapStaffMember);
    },
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="h1">Staff</h1>
          <p className="body text-text-secondary">{staff.filter((s) => s.active).length} active · {staff.length} total</p>
        </div>
        <Button className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground"><Plus className="h-4 w-4 mr-2" />Invite staff</Button>
      </div>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Team</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="p-md text-sm text-text-secondary">Loading staff…</div>}
            {staff.map((s) => (
              <div key={s.id} className="flex items-center gap-md px-md py-sm">
                <div className="h-9 w-9 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                  {s.name.split(" ").map((n) => n[0]).slice(0, 2).join("")}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{s.name}</div>
                  <div className="text-xs text-text-secondary">{s.email}</div>
                </div>
                <Badge variant="outline">{ROLE_LABEL[s.role]}</Badge>
                {s.active ? <Badge variant="outline" className="border-success/30 text-success bg-success/10">Active</Badge>
                  : <Badge variant="outline" className="border-error/30 text-error bg-error/10">Disabled</Badge>}
                <div className="text-xs text-text-secondary hidden md:block w-28 text-right">{s.lastActive}</div>
                <Button size="icon" variant="ghost" className="h-8 w-8"><MoreHorizontal className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
