import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { HOSPITAL } from "@/lib/mockData";

type Props = {
  patientName: string;
  patientId: string;
  visitId: string;
  department: string;
  showActions?: boolean;
};

export const QRSticker = ({ patientName, patientId, visitId, department, showActions = true }: Props) => {
  const payload = JSON.stringify({ p: patientId, v: visitId, h: HOSPITAL.code });
  return (
    <div className="space-y-sm">
      <div className="print-area inline-block border-2 border-foreground rounded-md p-md bg-background w-[280px]">
        <div className="text-[10px] font-bold tracking-wider text-primary">MED-PASS</div>
        <div className="font-semibold text-base mt-1 leading-tight">{patientName}</div>
        <div className="text-[11px] text-text-secondary mt-0.5">Patient ID: {patientId}</div>
        <div className="text-[11px] text-text-secondary">Visit: {visitId}</div>
        <div className="text-[11px] text-text-secondary">Dept: {department}</div>
        <div className="flex justify-center my-sm">
          <QRCodeSVG value={payload} size={140} bgColor="#ffffff" fgColor="#0A5C6E" includeMargin={false} />
        </div>
        <div className="text-[9px] text-center text-text-secondary leading-tight">
          Keep this sticker in your wallet.<br />Show it at any hospital using Med-Pass.
        </div>
      </div>
      {showActions && (
        <div className="no-print">
          <Button size="sm" onClick={() => window.print()} className="bg-primary hover:bg-primary/90">
            <Printer className="h-4 w-4 mr-1" /> Print sticker
          </Button>
        </div>
      )}
    </div>
  );
};
