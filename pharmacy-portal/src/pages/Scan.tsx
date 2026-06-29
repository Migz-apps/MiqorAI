import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { QRScanner } from "@/components/MiqorAI/QRScanner";
import { ScanLine } from "lucide-react";

export default function Scan() {
  return (
    <div className="max-w-3xl mx-auto space-y-lg">
      <div>
        <h1 className="h1">Scan patient QR</h1>
        <p className="body text-text-secondary">Verify the patient and pull their pending prescriptions.</p>
      </div>
      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3 flex items-center gap-sm">
            <ScanLine className="h-5 w-5 text-pharmacy" /> Camera
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QRScanner />
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3">Tips</CardTitle></CardHeader>
        <CardContent className="text-sm text-text-secondary space-y-2">
          <p>· Hold the patient phone 15-25 cm from the camera; let the QR fill the box.</p>
          <p>· If the QR is damaged, type the patient ID (PT-…) or prescription ID (RX-…) in the field below.</p>
          <p>· An allergy alert will appear in red on the prescription page if relevant.</p>
        </CardContent>
      </Card>
    </div>
  );
}
