import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Camera, ScanLine, Keyboard, CheckCircle2, SwitchCamera, X, Zap, ZapOff } from "lucide-react";
import QrScanner from "qr-scanner";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { useNavigate } from "react-router-dom";
import { hospitalApi, scanApi } from "@/lib/api/hospital";
import { ApiError } from "@/lib/api/client";
import { toast } from "@/lib/notify";

type Props = { onScanned?: (patientId: string) => void };

/** Ignore repeated decodes of the same code within this window. */
const DUPLICATE_SCAN_MS = 4000;
/** Automatic camera-start retries before giving up. */
const CAMERA_RETRY_LIMIT = 3;
const CAMERA_RETRY_DELAY_MS = 3000;

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

function isQrExpiredError(err: unknown): boolean {
  if (!(err instanceof ApiError)) return false;
  const code = (err.body as { error?: { code?: string } } | undefined)?.error?.code;
  return err.status === 410 || code === "QR_EXPIRED";
}

function describeCameraError(err: unknown): string {
  const text =
    typeof err === "string" ? err : err instanceof Error ? `${err.name}: ${err.message}` : "";
  if (!navigator.mediaDevices?.getUserMedia) {
    return "Camera scanning needs HTTPS or localhost.";
  }
  if (text.includes("NotAllowedError") || text.toLowerCase().includes("permission")) {
    return "Camera access was blocked. Allow camera access for this site in the browser's address bar, then try again.";
  }
  if (text.includes("NotFoundError") || text.toLowerCase().includes("camera not found")) {
    return "No camera was found on this device. Use the manual entry fallback below.";
  }
  if (text.includes("NotReadableError") || text.includes("AbortError")) {
    return "The camera is in use by another app. Close it and try again.";
  }
  return "Unable to start the camera scanner right now.";
}

export const QRScanner = ({ onScanned }: Props) => {
  const [scanning, setScanning] = useState(false);
  const [manual, setManual] = useState(false);
  const [manualValue, setManualValue] = useState("");
  const [detected, setDetected] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [pendingMessage, setPendingMessage] = useState<string | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const nav = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const cameraIndexRef = useRef(0);
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const lastInvalidToastRef = useRef(0);

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
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      setSearching(true);
      setPendingMessage(null);
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
      const message = isQrExpiredError(err)
        ? "Code expired — ask the patient to refresh their QR."
        : err instanceof Error && err.message === "denied"
          ? "Patient denied access."
          : err instanceof Error && err.message === "expired"
            ? "Access request expired. Scan again if care is still needed."
            : "Unable to request access. Ask the patient to refresh their QR code and try again.";
      setPendingMessage(null);
      setDetected(null);
      toast.error(message);
    } finally {
      setSearching(false);
      busyRef.current = false;
    }
  };

  const handleDecoded = async (rawValue: string) => {
    if (busyRef.current) return;
    const now = Date.now();
    if (rawValue === lastScanRef.current.value && now - lastScanRef.current.at < DUPLICATE_SCAN_MS) {
      return;
    }
    lastScanRef.current = { value: rawValue, at: now };

    const parsed = parseQrPayload(rawValue);
    if (!parsed) {
      if (now - lastInvalidToastRef.current > DUPLICATE_SCAN_MS) {
        lastInvalidToastRef.current = now;
        toast.error("That QR code is not a valid MiqorAI patient code.");
      }
      return;
    }

    await handlePatient(parsed.patientId, parsed.hash);
  };

  useEffect(() => {
    if (!scanning) return;
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;

    // qr-scanner uses the native BarcodeDetector when available and falls back
    // to its bundled web worker, so no wasm assets need to be served.
    const scanner = new QrScanner(
      video,
      (result) => {
        void handleDecoded(result.data);
      },
      {
        preferredCamera: "environment",
        returnDetailedScanResult: true,
        highlightScanRegion: false,
        highlightCodeOutline: false,
        maxScansPerSecond: 8,
      },
    );
    scannerRef.current = scanner;

    const start = async (attempt: number) => {
      try {
        await scanner.start();
        if (disposed) return;
        setCameraError(null);
        setCameraReady(true);
        setHasTorch(await scanner.hasFlash().catch(() => false));
        const found = await QrScanner.listCameras(true).catch(() => [] as QrScanner.Camera[]);
        if (!disposed) setCameras(found);
      } catch (err) {
        if (disposed) return;
        setCameraReady(false);
        setCameraError(describeCameraError(err));
        if (attempt < CAMERA_RETRY_LIMIT) {
          retryTimer = setTimeout(() => void start(attempt + 1), CAMERA_RETRY_DELAY_MS);
        }
      }
    };
    void start(0);

    return () => {
      disposed = true;
      if (retryTimer) clearTimeout(retryTimer);
      scanner.destroy();
      scannerRef.current = null;
      setCameraReady(false);
      setHasTorch(false);
      setTorchOn(false);
    };
    // handleDecoded is stable enough through refs; restart only on open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const toggleTorch = async () => {
    const scanner = scannerRef.current;
    if (!scanner) return;
    try {
      await scanner.toggleFlash();
      setTorchOn(scanner.isFlashOn());
    } catch {
      toast.error("The torch is not available on this camera.");
    }
  };

  const switchCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner || cameras.length < 2) return;
    cameraIndexRef.current = (cameraIndexRef.current + 1) % cameras.length;
    try {
      await scanner.setCamera(cameras[cameraIndexRef.current].id);
      setHasTorch(await scanner.hasFlash().catch(() => false));
      setTorchOn(false);
    } catch {
      toast.error("Unable to switch camera.");
    }
  };

  const stopScanning = () => {
    setScanning(false);
    setPendingMessage(null);
    setDetected(null);
    setCameraError(null);
  };

  const submitManual = async (e: React.FormEvent) => {
    e.preventDefault();
    const v = manualValue.trim();
    if (!v) return;

    // A pasted QR payload goes straight through the same scan validation.
    const parsed = parseQrPayload(v);
    if (parsed?.hash) {
      await handlePatient(parsed.patientId, parsed.hash);
      return;
    }

    setSearching(true);
    try {
      const results = await hospitalApi.patientsSearch(v) as Array<{ patient_id: string }>;
      if (results.length > 0) {
        // Same consent flow as a QR scan: request access and wait for approval.
        await handlePatient(results[0].patient_id);
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
        {!scanning ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-background space-y-md">
              <Camera className="h-12 w-12 mx-auto opacity-60" />
              <Button onClick={() => { setDetected(null); setPendingMessage(null); setCameraError(null); setScanning(true); }} className="bg-primary hover:bg-primary/90">
                <Camera className="h-4 w-4 mr-2" /> Start camera
              </Button>
            </div>
          </div>
        ) : (
          <>
            <video aria-label="QR code camera preview" ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className={`w-56 h-56 rounded-lg border-4 ${detected ? "border-success animate-pulse-ring" : "border-success/70"} relative`}>
                {cameraReady && !detected && (
                  <ScanLine className="absolute inset-x-0 mx-auto top-1/2 -translate-y-1/2 h-1 w-full text-success animate-pulse" />
                )}
                {detected && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <CheckCircle2 className="h-16 w-16 text-success" />
                  </div>
                )}
              </div>
            </div>
            <div className="absolute bottom-3 inset-x-0 text-center text-background/80 text-xs">
              {cameraReady ? "Align the QR code inside the frame" : cameraError ? "Camera unavailable" : "Starting camera..."}
            </div>
            <div className="absolute top-2 left-2 flex gap-xs">
              {hasTorch && (
                <button onClick={() => { void toggleTorch(); }} className="h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30" aria-label="Toggle torch">
                  {torchOn ? <ZapOff className="h-4 w-4" /> : <Zap className="h-4 w-4" />}
                </button>
              )}
              {cameras.length > 1 && (
                <button onClick={() => { void switchCamera(); }} className="h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30" aria-label="Switch camera">
                  <SwitchCamera className="h-4 w-4" />
                </button>
              )}
            </div>
            <button onClick={stopScanning} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30" aria-label="Stop scanning">
              <X className="h-4 w-4" />
            </button>
          </>
        )}
      </div>

      {scanning && (
        <div className="space-y-xs">
          {cameraError && (
            <div className="rounded-md border border-error/30 bg-error/10 px-sm py-xs text-xs text-foreground">
              {cameraError} The manual entry fallback below always works.
            </div>
          )}
          {pendingMessage && (
            <div className="rounded-md border border-secondary/30 bg-secondary/10 px-sm py-xs text-xs text-foreground">
              {pendingMessage}
            </div>
          )}
          <div className="text-xs text-text-secondary">Tap a patient to simulate a QR scan and request access</div>
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
          <Input aria-label="Patient ID, phone number, or QR code" placeholder="Patient ID, phone number, or pasted QR code" value={manualValue} onChange={e => setManualValue(e.target.value)} />
          <Button type="submit" disabled={searching} className="bg-primary hover:bg-primary/90">{searching ? "…" : "Find"}</Button>
        </form>
      )}
    </div>
  );
};
