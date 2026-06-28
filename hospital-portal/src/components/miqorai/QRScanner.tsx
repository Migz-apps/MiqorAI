import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ScanLine, Keyboard, CheckCircle2, X } from "lucide-react";
import { Scanner, type IDetectedBarcode, type IScannerError } from "@yudiel/react-qr-scanner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { hospitalApi, scanApi } from "@/lib/api/hospital";
import { toast } from "@/lib/notify";

type Props = { onScanned?: (patientId: string) => void };

function firstName(name: unknown) {
  const safeName = typeof name === "string" && name.trim() ? name.trim() : "Patient";
  return safeName.split(" ")[0];
}

function parseQrPayload(rawValue: string): { patientId: string; hash?: string } | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "miqorai:" && url.hostname === "patient") {
      const patientId = url.pathname.replace(/^\/+/, "");
      const hash = url.searchParams.get("v") ?? undefined;
      if (patientId) return { patientId, hash };
    }
  } catch {
    // Fall through to non-URL payloads.
  }

  try {
    const parsed = JSON.parse(value) as { patient_id?: string; p?: string; hash?: string };
    const patientId = parsed.patient_id ?? parsed.p;
    if (patientId) return { patientId, hash: parsed.hash };
  } catch {
    // Not JSON.
  }

  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value)) {
    return { patientId: value };
  }

  return null;
}

export const QRScanner = ({ onScanned }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const nav = useNavigate();

  const { data: census = [] } = useQuery({
    queryKey: ["hospital", "patients", "census"],
    queryFn: () => hospitalApi.patientsCensus(),
    enabled: scanning,
  });

  const waitForApproval = async (requestId: string) => {
    for (let attempt = 0; attempt < 30; attempt++) {
      await new Promise((resolve) => setTimeout(resolve, 2000));
      const status = await scanApi.accessRequest(requestId);
      if (status.status === "approved") return true;
      if (status.status === "denied" || status.status === "expired") {
        throw new Error(status.status);
      }
    }
    throw new Error("timeout");
  };

  const handlePatient = async (patientId: string, hash?: string) => {
    try {
      setSearching(true);
      setPendingMessage(null);
      setCameraError(null);
      const resolvedHash = hash ?? (await hospitalApi.patientQr(patientId)).hash;
      const request = await scanApi.requestAccess(patientId, resolvedHash);
      setDetected(patientId);
      if (navigator.vibrate) navigator.vibrate(120);
      setPendingMessage("Approval request sent. Waiting for the patient to approve access...");
      toast.success("Approval request sent to the patient.");
      await waitForApproval(request.request_id);
      setPendingMessage(null);
      toast.success("Patient approved access.");
      onScanned?.(patientId);
      if (!onScanned) nav(`/patients/${patientId}`);
    } catch (err) {
      const message = err instanceof Error && err.message === "denied"
        ? "Patient denied access."
        : err instanceof Error && err.message === "expired"
          ? "Access request expired. Scan again if care is still needed."
          : "Unable to request access. Ask the patient to refresh their QR code and try again.";
      setPendingMessage(null);
      setDetected(null);
      toast.error(message);
    } finally {
      setSearching(false);
    }
  };

  const handleDetectedCodes = async (codes: IDetectedBarcode[]) => {
    if (searching || pendingMessage) return;
    const parsed = codes
      .map((code) => parseQrPayload(code.rawValue))
      .find((result): result is { patientId: string; hash?: string } => Boolean(result));

    if (!parsed) {
      toast.error("That QR code is not a valid MiqorAI patient code.");
      return;
    }

    await handlePatient(parsed.patientId, parsed.hash);
  };

  const scannerError = (error: IScannerError) => {
    const message =
      error.kind === "permission-denied"
        ? "Camera access was blocked. Allow camera access and try again."
        : error.kind === "insecure-context"
          ? "Camera scanning needs HTTPS or localhost."
          : error.kind === "unsupported"
            ? "This browser cannot scan QR codes from the camera."
            : "Unable to start the camera scanner right now.";
    setCameraError(message);
    toast.error(message);
  };

  const scannerPaused = useMemo(
    () => !scanning || searching || Boolean(pendingMessage),
    [pendingMessage, scanning, searching],
  );

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;
    setSearching(true);
    try {
      const results = await hospitalApi.patientsSearch(v) as Array<{ patient_id: string }>;
      if (results.length > 0) {
        const id = results[0].patient_id;
        onScanned?.(id);
        if (!onScanned) nav(`/patients/${id}`);
      } else {
        toast.error("Patient not found in this hospital's records.");
      }
    } catch {
      toast.error("Patient lookup failed.");
    } finally {
      setSearching(false);
    }
  };

  const demoPatients = (census as Array<{ id: string; name: string }>).slice(0, 4);

  return (
    <div className="space-y-md">
      <div className="relative aspect-[4/3] rounded-lg overflow-hidden bg-foreground">
        <div className="absolute inset-0 bg-gradient-to-br from-foreground via-foreground/95 to-foreground/85" />
        <div className="absolute inset-0 flex items-center justify-center">
          {!scanning ? (
            <div className="text-center text-background space-y-md">
              <Camera className="h-12 w-12 mx-auto opacity-60" />
              <Button onClick={() => { setDetected(null); setPendingMessage(null); setCameraError(null); setScanning(true); }} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4 mr-2" /> Start camera
              </Button>
            </div>
          ) : (
            <>
              <Scanner
                onScan={(codes) => {
                  void handleDetectedCodes(codes);
                }}
                onError={scannerError}
                paused={scannerPaused}
                formats={["qr_code"]}
                constraints={{
                  facingMode: "environment",
                  aspectRatio: 4 / 3,
                  width: { ideal: 1920 },
                  height: { ideal: 1080 },
                }}
                retryDelay={100}
                sound={false}
                components={{ finder: false, onOff: false, torch: true, zoom: true }}
                classNames={{
                  container: "absolute inset-0",
                  video: "h-full w-full object-cover",
                }}
              />
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
              <button onClick={() => { setScanning(false); setPendingMessage(null); setDetected(null); setCameraError(null); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30">
                <X className="h-4 w-4" />
              </button>
            </>
          )}
        </div>
      </div>

      {scanning && (
        <div className="space-y-xs">
          {cameraError && (
            <div className="rounded-md border border-error/30 bg-error/10 px-sm py-xs text-xs text-foreground">
              {cameraError}
            </div>
          )}
          <div className="text-xs text-text-secondary">Tap a patient to simulate a QR scan and request access</div>
          {pendingMessage && (
            <div className="rounded-md border border-secondary/30 bg-secondary/10 px-sm py-xs text-xs text-foreground">
              {pendingMessage}
            </div>
          )}
          <div className="grid grid-cols-2 gap-xs">
            {demoPatients.map(p => (
              <Button key={p.id} variant="outline" size="sm" className="justify-start text-xs h-9" onClick={() => handlePatient(p.id)}>
                <ScanLine className="h-3 w-3 mr-1" /> {firstName(p.name)}
              </Button>
            ))}
            {demoPatients.length === 0 && (
              <div className="col-span-2 text-xs text-text-secondary">No patients in census yet.</div>
            )}
          </div>
        </div>
      )}

      <button type="button" onClick={() => setManual(m => !m)} className="text-sm text-primary font-medium flex items-center gap-1 hover:underline">
        <Keyboard className="h-4 w-4" /> {manual ? "Hide" : "Manual entry fallback"}
      </button>

      {manual && (
        <form onSubmit={submitManual} className="flex gap-sm">
          <Input placeholder="Enter Patient ID or Phone Number" value={manualValue} onChange={e => setManualValue(e.target.value)} />
          <Button type="submit" disabled={searching} className="bg-primary hover:bg-primary/90">{searching ? "…" : "Find"}</Button>
        </form>
      )}
    </div>
  );
};
