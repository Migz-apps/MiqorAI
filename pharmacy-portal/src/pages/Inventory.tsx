import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Plus, Minus, Search, Package, AlertTriangle, ScanLine } from "lucide-react";
import { useAuth, can } from "@/store/auth";
import { toast } from "@/lib/notify";
import { MESSAGES } from "@/lib/user-messages";
import { adjustInventoryStock, loadInventory, pharmacyKeys } from "@/store/rx";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { syncKeys } from "@/store/sync";

export default function Inventory() {
  const session = useAuth((s) => s.session)!;
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [scan, setScan] = useState("");

  const { data: inventory = [] } = useQuery({
    queryKey: pharmacyKeys.inventory(),
    queryFn: loadInventory,
  });

  const adjustMutation = useMutation({
    mutationFn: ({ id, delta, name }: { id: string; delta: number; name: string }) =>
      adjustInventoryStock(id, delta, `Manual adjustment: ${name}`),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: pharmacyKeys.inventory() });
      queryClient.invalidateQueries({ queryKey: syncKeys.queue() });
      toast.success(`Stock ${vars.delta > 0 ? "increased" : "decreased"}`, {
        description: `${vars.name}: ${vars.delta > 0 ? "+" : ""}${vars.delta}`,
      });
    },
    onError: () => toast.error(MESSAGES.generic.error),
  });

  const list = inventory.filter((it) =>
    it.name.toLowerCase().includes(q.toLowerCase()) ||
    it.barcode.includes(q) ||
    it.category.toLowerCase().includes(q.toLowerCase()),
  );

  const adjust = (id: string, name: string, delta: number) => {
    if (!can(session.role, "manageInventory")) return;
    adjustMutation.mutate({ id, delta, name });
  };

  const handleScan = async () => {
    try {
      const found = await pharmacyApi.inventoryBarcode(scan.trim());
      const id = String(found.id);
      const name = String(found.drug_name ?? "item");
      adjust(id, name, 1);
      setScan("");
    } catch {
      toast.error(MESSAGES.generic.notFound);
    }
  };

  const lowCount = inventory.filter((it) => it.stock <= it.minStock).length;
  const expiringSoon = inventory.filter((it) => new Date(it.expiry) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 90)).length;

  return (
    <div className="space-y-lg max-w-[1400px] mx-auto">
      <div>
        <h1 className="h1">Inventory</h1>
        <p className="body text-text-secondary">{inventory.length} SKUs · {lowCount} low stock · {expiringSoon} expiring within 90 days</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-md">
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Search className="h-4 w-4" /> Search</CardTitle></CardHeader>
          <CardContent>
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Drug name, barcode, category…" className="h-10" />
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><ScanLine className="h-4 w-4 text-pharmacy" /> Scan barcode (+1)</CardTitle></CardHeader>
          <CardContent>
            <div className="flex gap-sm">
              <Input
                value={scan}
                onChange={(e) => setScan(e.target.value)}
                placeholder="Scan or type barcode"
                className="h-10"
                onKeyDown={(e) => { if (e.key === "Enter") handleScan(); }}
              />
              <Button onClick={handleScan} className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground h-10">Add 1</Button>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Package className="h-5 w-5 text-pharmacy" /> Stock</CardTitle></CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Drug</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead>Min</TableHead>
                <TableHead>Price (KES)</TableHead>
                <TableHead>Expiry</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((it) => {
                const low = it.stock <= it.minStock;
                const expSoon = new Date(it.expiry) < new Date(Date.now() + 1000 * 60 * 60 * 24 * 90);
                return (
                  <TableRow key={it.id} className={low ? "bg-inventory-low/40" : ""}>
                    <TableCell>
                      <div className="font-medium">{it.name} <span className="text-text-secondary text-xs">{it.strength}</span></div>
                      <div className="text-[11px] text-text-secondary">{it.form} · {it.barcode}{it.controlled ? " · Controlled" : ""}</div>
                    </TableCell>
                    <TableCell><Badge variant="outline">{it.category}</Badge></TableCell>
                    <TableCell>
                      <span className={low ? "text-error font-semibold" : "font-medium"}>{it.stock}</span>
                      {low && <AlertTriangle className="inline h-3.5 w-3.5 ml-1 text-error" />}
                    </TableCell>
                    <TableCell className="text-text-secondary">{it.minStock}</TableCell>
                    <TableCell>{it.unitPrice}</TableCell>
                    <TableCell>
                      <span className={expSoon ? "text-secondary" : "text-text-secondary"}>{it.expiry}</span>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex gap-1">
                        <Button size="icon" variant="outline" className="h-7 w-7" disabled={!can(session.role, "manageInventory")} onClick={() => adjust(it.id, it.name, -1)}>
                          <Minus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="outline" className="h-7 w-7" disabled={!can(session.role, "manageInventory")} onClick={() => adjust(it.id, it.name, +1)}>
                          <Plus className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="sm" variant="outline" className="h-7" disabled={!can(session.role, "manageInventory")} onClick={() => adjust(it.id, it.name, +50)}>
                          +50
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
