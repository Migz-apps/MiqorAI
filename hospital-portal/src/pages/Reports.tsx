import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Download, Calendar } from "lucide-react";
import { downloadFile } from "@/lib/api/client";
import { hospitalApi } from "@/lib/api/hospital";
import { toast } from "@/lib/notify";

const reports = [
  { type: "census", name: "Daily Census", description: "Patients checked in per day", formats: ["CSV", "PDF"] as const },
  { type: "throughput", name: "Department Throughput", description: "Patients per hour by department", formats: ["CSV", "PDF"] as const },
  { type: "savings", name: "Duplicate Test Savings", description: "Estimated savings from shared records", formats: ["CSV", "PDF"] as const },
  { type: "staff", name: "Staff Activity", description: "Logins, scans, visits by staff", formats: ["CSV", "PDF"] as const },
  { type: "demographics", name: "Patient Demographics", description: "Age, gender, location distribution", formats: ["CSV", "PDF"] as const },
  { type: "qr-adoption", name: "QR Adoption Rate", description: "% of patients using QR vs manual", formats: ["CSV", "PDF"] as const },
];

const schedule = [
  { when: "Daily at 8 AM", what: "Email to admin" },
  { when: "Weekly on Monday", what: "Dashboard refresh" },
  { when: "Monthly on the 1st", what: "PDF + archive" },
];

type ReportHistoryRow = {
  id: string;
  title: string;
  format: string;
  downloadUrl: string;
  createdAt: string;
};

export default function Reports() {
  const queryClient = useQueryClient();
  const { data: history = [] } = useQuery({
    queryKey: ["hospital-reports"],
    queryFn: async () => {
      const rows = await hospitalApi.reports();
      return rows as ReportHistoryRow[];
    },
  });

  const generateReport = useMutation({
    mutationFn: async ({ type, format }: { type: string; format: "csv" | "pdf" }) =>
      hospitalApi.generateReport({ type, format }),
    onSuccess: async (res, variables) => {
      const result = res as { download_url?: string };
      if (result.download_url) {
        await downloadFile(result.download_url, `hospital-${variables.type}.${variables.format}`);
      }
      toast.success("Report downloaded");
      await queryClient.invalidateQueries({ queryKey: ["hospital-reports"] });
    },
    onError: () => toast.error("Report generation failed"),
  });

  const downloadHistoryItem = async (item: ReportHistoryRow) => {
    try {
      await downloadFile(item.downloadUrl, `${item.title}.${String(item.format).toLowerCase()}`);
      toast.success("Report downloaded");
    } catch {
      toast.error("Report download failed");
    }
  };

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div>
        <h1 className="h1 flex items-center gap-sm"><FileText className="h-6 w-6 text-primary" /> Reports</h1>
        <p className="body text-text-secondary">Generate, schedule and download operational reports.</p>
      </div>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Available reports</CardTitle></CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-md">
          {reports.map((report) => (
            <div key={report.name} className="rounded-md border p-md flex flex-col gap-sm">
              <div>
                <div className="font-medium text-sm">{report.name}</div>
                <div className="text-xs text-text-secondary">{report.description}</div>
              </div>
              <div className="flex flex-wrap gap-xs mt-auto">
                {report.formats.map((format) => (
                  <Button
                    key={format}
                    size="sm"
                    variant="outline"
                    disabled={generateReport.isPending}
                    onClick={() => generateReport.mutate({ type: report.type, format: format.toLowerCase() as "csv" | "pdf" })}
                  >
                    <Download className="h-3 w-3 mr-1" /> {format}
                  </Button>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Recent downloads</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {history.length === 0 ? (
            <div className="py-sm text-sm text-text-secondary">No reports generated yet.</div>
          ) : history.slice(0, 8).map((item) => (
            <div key={item.id} className="py-sm flex items-center justify-between gap-sm">
              <div>
                <div className="text-sm font-medium">{item.title}</div>
                <div className="text-xs text-text-secondary">
                  {String(item.format).toUpperCase()} Â· {new Date(item.createdAt).toLocaleString()}
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={() => void downloadHistoryItem(item)}>
                <Download className="h-3 w-3 mr-1" /> Download
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><Calendar className="h-4 w-4" /> Scheduler</CardTitle></CardHeader>
        <CardContent className="divide-y">
          {schedule.map((item) => (
            <div key={item.when} className="py-sm flex items-center justify-between">
              <div>
                <div className="text-sm font-medium">{item.when}</div>
                <div className="text-xs text-text-secondary">{item.what}</div>
              </div>
              <Button size="sm" variant="outline" onClick={() => toast.success("Schedule saved")}>Edit</Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
