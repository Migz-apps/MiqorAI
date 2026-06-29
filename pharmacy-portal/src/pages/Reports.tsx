import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend } from "recharts";
import { Button } from "@/components/ui/button";
import { Download, FileText } from "lucide-react";
import { downloadFile } from "@/lib/api/client";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { mapRevenueTrend } from "@/lib/api/mappers";
import { toast } from "@/lib/notify";
import { loadInventory, pharmacyKeys } from "@/store/rx";

const COLORS = ["hsl(var(--pharmacy))", "hsl(var(--primary))", "hsl(var(--success))", "hsl(var(--secondary))", "hsl(var(--info))", "hsl(var(--error))", "hsl(var(--cashier-accent))"];

export default function Reports() {
  const { data: report } = useQuery({
    queryKey: pharmacyKeys.reports(),
    queryFn: () => pharmacyApi.reports({ type: "monthly" }),
  });

  const { data: inventory = [] } = useQuery({
    queryKey: pharmacyKeys.inventory(),
    queryFn: loadInventory,
  });

  const revenueTrend = mapRevenueTrend(
    (report?.trend as Array<{ date?: string; amount?: number }>) ?? [],
  );
  const totalRev = revenueTrend.reduce((s, d) => s + d.value, 0);
  const dispenseCount = Number(report?.dispense_count ?? 0);

  const cats = (() => {
    const map: Record<string, number> = {};
    inventory.forEach((i) => { map[i.category] = (map[i.category] || 0) + i.stock * i.unitPrice; });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  })();

  const exportReport = async (format: "csv" | "pdf") => {
    try {
      const { download_url } = await pharmacyApi.exportReport({ type: "monthly", format });
      await downloadFile(download_url, `pharmacy-monthly-report.${format}`);
      toast.success("Report downloaded");
    } catch {
      toast.error("Report export failed");
    }
  };

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div className="flex items-end justify-between gap-md">
        <div>
          <h1 className="h1">Reports</h1>
          <p className="body text-text-secondary">Daily dispensing, revenue, inventory turnover.</p>
        </div>
        <div className="flex gap-sm">
          <Button variant="outline" onClick={() => void exportReport("csv")}><Download className="h-4 w-4 mr-2" />CSV</Button>
          <Button className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground" onClick={() => void exportReport("pdf")}><FileText className="h-4 w-4 mr-2" />PDF</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-md">
        <Card>
          <CardContent className="p-md">
            <div className="text-xs text-text-secondary">Revenue this period</div>
            <div className="text-2xl font-bold">KES {Number(report?.revenue ?? totalRev).toLocaleString()}</div>
            <div className="text-[11px] text-success mt-1">Avg adherence {Number(report?.adherence_average ?? 0).toFixed(1)}%</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-md">
            <div className="text-xs text-text-secondary">Prescriptions filled</div>
            <div className="text-2xl font-bold">{dispenseCount}</div>
            <div className="text-[11px] text-text-secondary mt-1">In selected period</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-md">
            <div className="text-xs text-text-secondary">Avg basket</div>
            <div className="text-2xl font-bold">KES {dispenseCount ? Math.round(Number(report?.revenue ?? totalRev) / dispenseCount).toLocaleString() : "0"}</div>
            <div className="text-[11px] text-text-secondary mt-1">Per dispensed prescription</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-md">
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Revenue trend</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={revenueTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" stroke="hsl(var(--text-secondary))" fontSize={11} />
                  <YAxis stroke="hsl(var(--text-secondary))" fontSize={11} />
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Bar dataKey="value" fill="hsl(var(--pharmacy))" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-sm"><CardTitle className="h3">Inventory value by category</CardTitle></CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={cats} dataKey="value" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                    {cats.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid hsl(var(--border))", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
