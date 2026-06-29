import { useState } from "react";
import { ScanLine, Check, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { loadPrescriptions, pharmacyKeys } from "@/store/rx";

export const QRScanner = ({ onResult }: { onResult?: (id: string) => void }) => {
  const [scanned, setScanned] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const nav = useNavigate();

  const { data: prescriptions = [] } = useQuery({
    queryKey: pharmacyKeys.prescriptions(),
    queryFn: () => loadPrescriptions(),
  });

  const handle = async (id: string) => {
    setScanned(id);

    const rx = prescriptions.find(
      (r) => (r.patientId === id || r.id === id) && (r.status === "pending" || r.status === "verified"),
    );
    if (onResult) {
      onResult(id);
      return;
    }
    if (rx) {
      nav(`/prescriptions/${rx.id}`);
      return;
    }

    try {
      if (id.includes(":")) {
        const [patient_id, hash] = id.split(":");
        const result = await pharmacyApi.scanQr(patient_id, hash);
        const patientId = String((result as { patient_id?: string }).patient_id ?? patient_id);
        const pending = prescriptions.find((r) => r.patientId === patientId);
        if (pending) nav(`/prescriptions/${pending.id}`);
        else nav(`/patients/${patientId}`);
        return;
      }
      nav(`/patients/${id}`);
    } catch {
      nav(`/patients/${id}`);
    }
  };

  return (
    <div className="space-y-md">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-foreground/95 border border-pharmacy/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--pharmacy)/0.15),_transparent_60%)]" />
        <div className="absolute inset-8 border-2 border-pharmacy/70 rounded-md">
          {scanned && (
            <div className="absolute inset-0 flex items-center justify-center text-pharmacy-foreground/90 text-xs">
              <div className="flex items-center gap-sm bg-success/90 text-success-foreground px-md py-sm rounded-md font-medium">
                <Check className="h-4 w-4" /> Scanned: {scanned}
              </div>
            </div>
          )}
          {!scanned && (
            <div className="absolute inset-0 flex items-center justify-center text-pharmacy-foreground/90 text-xs">
              <div className="absolute left-0 right-0 h-0.5 bg-pharmacy shadow-[0_0_20px_hsl(var(--pharmacy))] animate-scan-line" />
              <div className="flex items-center gap-sm bg-foreground/60 px-sm py-1 rounded text-pharmacy-foreground">
                <ScanLine className="h-3.5 w-3.5" /> Enter patient ID or scan result below
              </div>
            </div>
          )}
          <span className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-pharmacy" />
          <span className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-pharmacy" />
          <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-pharmacy" />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-pharmacy" />
        </div>
      </div>

      <div className="flex gap-sm">
        <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Patient ID, RX ID, or patient_id:hash" className="h-10" />
        <Button onClick={() => manual && handle(manual.trim())} className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground h-10">Open</Button>
        {scanned && (
          <Button variant="outline" onClick={() => setScanned(null)} className="h-10">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>

      {scanned && (
        <Button onClick={() => handle(scanned)} className="w-full bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
          Open patient profile
        </Button>
      )}
    </div>
  );
};
