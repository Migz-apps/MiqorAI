import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { QRSticker } from "@/components/shared/QRSticker";
import { useWaitlist } from "@/store/waitlist";

export default function PrintStickers() {
  const entries = useWaitlist((s) => s.entries);
  const refresh = useWaitlist((s) => s.refresh);
  const [params] = useSearchParams();
  const focus = params.get("visit");

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const ordered = focus
    ? [...entries.filter((e) => e.id === focus), ...entries.filter((e) => e.id !== focus)]
    : entries;

  return (
    <div className="space-y-lg max-w-[1200px] mx-auto">
      <div className="flex items-end justify-between gap-md no-print">
        <div>
          <h1 className="h1">Print stickers</h1>
          <p className="body text-text-secondary">Re-print any visit's QR sticker. Stickers fit standard 60×80mm rolls.</p>
        </div>
        <Button onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
          <Printer className="h-4 w-4 mr-1" /> Print all
        </Button>
      </div>

      {ordered.length === 0 && (
        <Card><CardContent className="p-lg text-center text-sm text-text-secondary">No active visits to print.</CardContent></Card>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-lg">
        {ordered.map((e) => {
          const name = e.patientName ?? e.patientId;
          return (
            <Card key={e.id} className={`${focus === e.id ? "ring-2 ring-primary" : ""}`}>
              <CardHeader className="pb-sm no-print">
                <CardTitle className="h3 text-base">{name}</CardTitle>
                <div className="text-xs text-text-secondary">{e.checkInTime} · {e.department}</div>
              </CardHeader>
              <CardContent>
                <QRSticker
                  patientName={name}
                  patientId={e.patientId}
                  visitId={`MP-${new Date().getFullYear()}-${e.id}`}
                  department={e.department}
                />
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
