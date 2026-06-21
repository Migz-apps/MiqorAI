import { useState } from "react";
import { Printer, Share2, LogOut, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import type { Patient } from "@/lib/types";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const PatientHeader = ({ patient }: { patient: Patient }) => {
  const age = Math.floor((Date.now() - new Date(patient.dob).getTime()) / (365.25 * 86400 * 1000));
  const [checkedOut, setCheckedOut] = useState(false);

  const share = async () => {
    const url = `${window.location.origin}/patients/${patient.id}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: `Med-Pass · ${patient.name}`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Patient link copied to clipboard");
      }
    } catch { /* user cancelled */ }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-md p-md rounded-lg border bg-card">
      <div className="flex items-center gap-md min-w-0">
        <div className="h-14 w-14 rounded-full bg-primary-light text-primary flex items-center justify-center text-lg font-semibold shrink-0">
          {patient.name.split(" ").map(n => n[0]).slice(0,2).join("")}
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-sm flex-wrap">
            <h2 className="h2 truncate">{patient.name}</h2>
            <Badge variant="outline" className="font-mono text-[11px]">{patient.id}</Badge>
            {checkedOut && <Badge className="bg-success/15 text-success border-success/30">Checked out</Badge>}
          </div>
          <div className="text-sm text-text-secondary">
            {age} years · {patient.gender} · Blood {patient.bloodType} · {patient.phone}
          </div>
          <div className="text-xs text-text-secondary mt-0.5 truncate">Emergency: {patient.emergencyContact}</div>
        </div>
      </div>
      <div className="flex items-center gap-sm flex-wrap">
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="h-4 w-4 mr-1" /> Print
        </Button>
        <Button variant="outline" size="sm" onClick={share}>
          <Share2 className="h-4 w-4 mr-1" /> Share
        </Button>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="outline" size="sm" disabled={checkedOut}>
              {checkedOut ? <><Check className="h-4 w-4 mr-1" /> Done</> : <><LogOut className="h-4 w-4 mr-1" /> Check-out</>}
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Check out {patient.name}?</AlertDialogTitle>
              <AlertDialogDescription>
                The patient will be removed from today's active queue. You can still view their record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => { setCheckedOut(true); toast.success(`${patient.name} checked out`); }}>
                Confirm check-out
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  );
};
