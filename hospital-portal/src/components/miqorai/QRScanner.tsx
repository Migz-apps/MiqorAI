import { useState } from "react";
import { Camera, ScanLine, Keyboard, CheckCircle2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { PATIENTS } from "@/lib/mockData";
import { toast } from "@/lib/notify";

type Props = { onScanned?: (patientId: string) => void };

export const QRScanner = ({ onScanned }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const nav = useNavigate();

  const simulateScan = (patientId: string) => {
    setDetected(patientId);
    if (navigator.vibrate) navigator.vibrate(120);
    toast.success(`Patient ${patientId} detected`);
    setTimeout(() => {
      onScanned?.(patientId);
      nav(`/patients/${patientId}`);
    }, 700);
  };

  const submitManual = (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    const found = PATIENTS.find(p =>
      p.id.toLowerCase() === v.toLowerCase() ||
      p.phone.replace(/\s/g, "").includes(v.replace(/\s/g, ""))
    );
    if (found) {
      onScanned?.(found.id);
      nav(`/patients/${found.id}`);
    } else {
      toast.error("Patient not found in this hospital's records.");
    }
  };

  return (
    <div className="space-y-md">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-foreground">
        {/* simulated camera viewfinder */}
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="absolute inset-0 flex items-center justify-center">
          {!scanning ? (
            <div className="text-center text-background space-y-md">
              <Camera className="h-12 w-12 mx-auto opacity-60" />
              <Button onClick={() => setScanning(true)} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4 mr-2" /> Start camera
              </Button>
            </div>
          ) : (
            <>
              <div className={`absolute inset-0 flex items-center justify-center`}>
                <div className={`w-56 h-56 rounded-lg border-4 ${detected ? "border-success animate-pulse-ring" : "border-success/70"} relative`}>
                  <ScanLine className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 h-1 w-full text-success animate-pulse" />
                  {detected && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <CheckCircle2 className="h-16 w-16 text-success" />
                    </div>
                  )}
                </div>
              </div>
              <div className="absolute bottom-3 inset-x-0 text-center text-background/80 text-xs">
                Align the QR code inside the frame
              </div>
              <button onClick={() => setScanning(false)} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {scanning && (
        <div className="space-y-xs">
          <div className="text-xs text-text-secondary">Demo: tap a patient to simulate a successful scan</div>
          <div className="grid grid-cols-2 gap-xs">
            {PATIENTS.slice(0,4).map(p => (
              <Button key={p.id} variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => simulateScan(p.id)}>
                <ScanLine className="h-3 w-3 mr-1" /> {p.id} — {p.name.split(" ")[0]}
              </Button>
            ))}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setManual(m => !m)} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
        <Keyboard className="h-4 w-4" /> {manual ? "Hide" : "Manual entry fallback"}
      </button>

      {manual && (
        <form onSubmit={submitManual} className="flex gap-sm">
          <Input placeholder="Enter Patient ID or Phone Number" value={manualValue} onChange={e => setManualValue(e.target.value)} />
          <Button type="submit" className="bg-primary hover:bg-primary/90">Find</Button>
        </form>
      )}
      {manual && (
        <div className="text-xs text-text-secondary">
          New patient? <a href="#" className="text-primary hover:underline">Register with MiqorAI</a>
        </div>
      )}
    </div>
  );
};
