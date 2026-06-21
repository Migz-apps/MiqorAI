import { useState } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { useAuth, ROLE_LABEL } from "@/store/auth";

const ROLE_TIPS: Record<string, { title: string; tips: string[] }> = {
  receptionist: { title: "Reception quick guide", tips: [
    "Use Check-in (or ⌘K) to scan a patient QR or enter their phone.",
    "Long waits are flagged in the waitlist; you can call patients in bulk.",
    "Use Manual register for patients without a MiqorAI card.",
    "Print stickers re-prints any visit's QR sticker.",
  ]},
  nurse: { title: "Nurse quick guide", tips: [
    "Open a patient profile to record vitals.",
    "Order labs from the patient's Labs tab.",
    "Hand-off to a doctor by changing the waitlist status to 'with-doctor'.",
  ]},
  doctor: { title: "Doctor quick guide", tips: [
    "Open Add Visit to record diagnosis, vitals, prescriptions and lab orders.",
    "Drug interaction warnings appear automatically when prescribing.",
    "Use Referrals to send a patient to another department.",
  ]},
  dept_head: { title: "Department head quick guide", tips: [
    "All clinician powers + manage staff in your department.",
    "Departmental analytics highlight bottlenecks.",
    "Audit access is restricted — escalate to Hospital Admin if needed.",
  ]},
  admin: { title: "Admin quick guide", tips: [
    "Invite staff and manage roles in Staff.",
    "Monitor wait-time SLAs in Departments and Reports.",
    "Compliance: every record view is logged in Audit log.",
    "System health surfaces degraded services in real-time.",
  ]},
};

export const HelpButton = () => {
  const [open, setOpen] = useState(false);
  const role = useAuth(s => s.session?.role);
  const tips = role ? ROLE_TIPS[role] : null;
  return (
    <>
      <Button variant="ghost" size="sm" className="h-9 w-9 p-0" onClick={() => setOpen(true)} aria-label="Help">
        <HelpCircle className="h-4 w-4" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{tips?.title || "Help"}</DialogTitle>
            <DialogDescription>
              You're signed in as {role ? ROLE_LABEL[role] : "—"}. Here's the fastest way to work.
            </DialogDescription>
          </DialogHeader>
          <ul className="space-y-sm text-sm">
            {tips?.tips.map((t, i) => (
              <li key={i} className="flex gap-sm">
                <span className="h-5 w-5 shrink-0 rounded-full bg-primary-light text-primary text-[11px] font-semibold flex items-center justify-center">{i+1}</span>
                <span className="text-foreground">{t}</span>
              </li>
            ))}
          </ul>
          <div className="text-xs text-text-secondary border-t pt-sm">
            Tip: press <kbd className="border rounded px-1">⌘K</kbd> anywhere to search.
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
