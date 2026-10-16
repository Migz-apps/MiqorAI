import { useEffect, useRef, useState } from "react";
import { Camera, Check, Keyboard, RotateCcw, ScanLine, SwitchCamera, X } from "lucide-react";
import QrScanner from "qr-scanner";
import { Button } from "@miqorai/ui/button";
import { Input } from "@miqorai/ui/input";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { pharmacyApi } from "@/lib/api/pharmacy";
import { ApiError } from "@/lib/api/client";
import { loadPrescriptions, pharmacyKeys } from "@/store/rx";
import { toast } from "@/lib/notify";

/** Ignore repeated decodes of the same code within this window. */
const DUPLICATE_SCAN_MS = 4000;
/** Automatic camera-start retries before giving up. */
const CAMERA_RETRY_LIMIT = 3;
const CAMERA_RETRY_DELAY_MS = 3000;

function parseQrPayload(rawValue: string): { patientId: string; hash: string } | null {
  const value = rawValue.trim();
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol === "miqorai:" && url.hostname === "patient") {
      const patientId = url.pathname.replace(/^\/+/, "");
      const hash = url.searchParams.get("v");
      if (patientId && hash) return { patientId, hash };
    }
  } catch {
    // Fall through to non-URL payloads.
  }

  try {
    const parsed = JSON.parse(value) as { patient_id?: string; p?: string; hash?: string };
    const patientId = parsed.patient_id ?? parsed.p;
    if (patientId && parsed.hash) return { patientId, hash: parsed.hash };
  } catch {
    // Not JSON.
  }

  const colon = value.indexOf(":");
  if (colon > 0) {
    const patientId = value.slice(0, colon);
    const hash = value.slice(colon + 1);
    if (patientId && hash) return { patientId, hash };
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
    return "No camera was found on this device. Use manual entry below.";
  }
  if (text.includes("NotReadableError") || text.includes("AbortError")) {
    return "The camera is in use by another app. Close it and try again.";
  }
  return "Unable to start the camera scanner right now.";
}

export const QRScanner = ({ onResult }: { onResult?: (id: string) => void }) => {
  const [scanning, setScanning] = useState(false);
  const [scanned, setScanned] = useState<string | null>(null);
  const [manual, setManual] = useState("");
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameras, setCameras] = useState<QrScanner.Camera[]>([]);
  const [verifying, setVerifying] = useState(false);
  const nav = useNavigate();

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scannerRef = useRef<QrScanner | null>(null);
  const cameraIndexRef = useRef(0);
  const busyRef = useRef(false);
  const lastScanRef = useRef<{ value: string; at: number }>({ value: "", at: 0 });
  const lastInvalidToastRef = useRef(0);

  const { data: prescriptions = [] } = useQuery({
    queryKey: pharmacyKeys.prescriptions(),
    queryFn: () => loadPrescriptions(),
  });

  // Every code — scanned or typed — is verified by the server scan endpoint;
  // there is no client-side shortcut to a patient profile.
  const verifyAndOpen = async (patientId: string, hash: string) => {
    if (busyRef.current) return;
    busyRef.current = true;
    setVerifying(true);
    try {
      const result = await pharmacyApi.scanQr(patientId, hash);
      const resolvedId = String((result as { patient_id?: string }).patient_id ?? patientId);
      setScanned(resolvedId);
      if (navigator.vibrate) navigator.vibrate(120);
      if (onResult) {
        onResult(resolvedId);
        return;
      }
      const pending = prescriptions.find(
        (r) => r.patientId === resolvedId && (r.status === "pending" || r.status === "verified"),
      );
      if (pending) nav(`/prescriptions/${pending.id}`);
      else nav(`/patients/${resolvedId}`);
    } catch (err) {
      setScanned(null);
      toast.error(
        isQrExpiredError(err)
          ? "Code expired — ask the patient to refresh their QR."
          : "Could not verify that code. Ask the patient to refresh their QR and try again.",
      );
    } finally {
      setVerifying(false);
      busyRef.current = false;
    }
  };

  const handleInput = async (value: string) => {
    const rx = prescriptions.find(
      (r) => r.id === value && (r.status === "pending" || r.status === "verified"),
    );
    if (rx) {
      nav(`/prescriptions/${rx.id}`);
      return;
    }

    const parsed = parseQrPayload(value);
    if (!parsed) {
      toast.error("Enter the full code shown in the patient's app (or a prescription ID).");
      return;
    }
    await verifyAndOpen(parsed.patientId, parsed.hash);
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
    await verifyAndOpen(parsed.patientId, parsed.hash);
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
    };
    // handleDecoded guards itself through refs; restart only on open/close.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scanning]);

  const switchCamera = async () => {
    const scanner = scannerRef.current;
    if (!scanner || cameras.length < 2) return;
    cameraIndexRef.current = (cameraIndexRef.current + 1) % cameras.length;
    try {
      await scanner.setCamera(cameras[cameraIndexRef.current].id);
    } catch {
      toast.error("Unable to switch camera.");
    }
  };

  return (
    <div className="space-y-md">
      <div className="relative aspect-video rounded-lg overflow-hidden bg-foreground/95 border border-pharmacy/20">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_hsl(var(--pharmacy)/0.15),_transparent_60%)]" />
        {scanning && (
          <video aria-label="QR code camera preview" ref={videoRef} className="absolute inset-0 h-full w-full object-cover" muted playsInline />
        )}
        <div className="absolute inset-8 border-2 border-pharmacy/70 rounded-md pointer-events-none">
          {scanned && (
            <div className="absolute inset-0 flex items-center justify-center text-pharmacy-foreground/90 text-xs">
              <div className="flex items-center gap-sm bg-success/90 text-success-foreground px-md py-sm rounded-md font-medium">
                <Check className="h-4 w-4" /> Verified: {scanned}
              </div>
            </div>
          )}
          {!scanned && scanning && cameraReady && (
            <div className="absolute left-0 right-0 h-0.5 bg-pharmacy shadow-[0_0_20px_hsl(var(--pharmacy))] animate-scan-line" />
          )}
          {!scanned && !scanning && (
            <div className="absolute inset-0 flex items-center justify-center text-pharmacy-foreground/90 text-xs">
              <div className="flex items-center gap-sm bg-foreground/60 px-sm py-1 rounded text-pharmacy-foreground">
                <ScanLine className="h-3.5 w-3.5" /> Start the camera or enter the code below
              </div>
            </div>
          )}
          <span className="absolute -top-1 -left-1 h-4 w-4 border-t-2 border-l-2 border-pharmacy" />
          <span className="absolute -top-1 -right-1 h-4 w-4 border-t-2 border-r-2 border-pharmacy" />
          <span className="absolute -bottom-1 -left-1 h-4 w-4 border-b-2 border-l-2 border-pharmacy" />
          <span className="absolute -bottom-1 -right-1 h-4 w-4 border-b-2 border-r-2 border-pharmacy" />
        </div>
        {!scanning ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <Button onClick={() => { setScanned(null); setCameraError(null); setScanning(true); }} className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground">
              <Camera className="h-4 w-4 mr-2" /> Start camera
            </Button>
          </div>
        ) : (
          <>
            {cameras.length > 1 && (
              <button onClick={() => { void switchCamera(); }} className="absolute top-2 left-2 h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30" aria-label="Switch camera">
                <SwitchCamera className="h-4 w-4" />
              </button>
            )}
            <button onClick={() => { setScanning(false); setCameraError(null); }} className="absolute top-2 right-2 h-8 w-8 rounded-full bg-background/20 text-background flex items-center justify-center hover:bg-background/30" aria-label="Stop scanning">
              <X className="h-4 w-4" />
            </button>
            {!cameraReady && !cameraError && (
              <div className="absolute bottom-2 inset-x-0 text-center text-background/80 text-xs">Starting camera...</div>
            )}
          </>
        )}
      </div>

      {cameraError && (
        <div className="rounded-md border border-error/30 bg-error/10 px-sm py-xs text-xs text-foreground">
          {cameraError} Manual entry below always works.
        </div>
      )}

      <div className="flex gap-sm">
        <div className="relative flex-1">
          <Keyboard className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-secondary" />
          <Input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="Paste the patient's code, or an RX ID" className="h-10 pl-9" />
        </div>
        <Button onClick={() => manual && void handleInput(manual.trim())} disabled={verifying} className="bg-pharmacy hover:bg-pharmacy/90 text-pharmacy-foreground h-10">
          {verifying ? "…" : "Open"}
        </Button>
        {scanned && (
          <Button variant="outline" onClick={() => setScanned(null)} className="h-10" aria-label="Reset">
            <RotateCcw className="h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
};
