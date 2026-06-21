import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { toast } from "@/lib/notify";

const reports = [
  { name: "Daily Census", description: "Patients checked in per day", formats: ["CSV", "PDF"] },
  { name: "Department Throughput", description: "Patients per hour by department", formats: ["Chart", "CSV"] },
  { name: "Duplicate Test Savings", description: "Estimated savings from shared records", formats: ["PDF"] },
  { name: "Staff Activity", description: "Logins, scans, visits by staff", formats: ["CSV"] },
  { name: "Patient Demographics", description: "Age, gender, location distribution", formats: ["Chart"] },
  { name: "QR Adoption Rate", description: "% of patients using QR vs manual", formats: ["Chart"] },
];

const schedule = [
  { when: "Daily at 8 AM", what: "Email to admin" },
  { when: "Weekly on Monday", what: "Dashboard refresh" },
  { when: "Monthly on the 1st", what: "PDF + archive" },
];

export default function Reports() {
  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><FileText className="h-6 w-6 text-primary" /> Reports</h1>
        <p className="body text-text-secondary">Generate, schedule and download operational reports.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Available reports</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {reports.map(r => (
            <div key={r.name} className="rounded-md border p-md flex flex-col gap-sm">
              <div>
                <div className="font-medium text-sm">{r.name}</div>
                <div className="text-xs text-text-secondary">{r.description}</div>
              </div>
              <div className="flex flex-wrap gap-xs mt-auto">
                {r.formats.map(f => (
                  <Button key={f} size="sm" variant="outline" onClick={() => toast.success(`${r.name}.${f.toLowerCase()} generated`)}>
                    <Download className="h-3 w-3 mr-1" /> {f}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Calendar className="h-4 w-4" /> Scheduler</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {schedule.map(s => (
            <div key={s.when} className="py-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{s.when}</div>
                <div className="text-xs text-text-secondary">{s.what}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.success("Schedule saved")}>Edit</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
