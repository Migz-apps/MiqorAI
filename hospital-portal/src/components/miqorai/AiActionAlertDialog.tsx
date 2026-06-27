import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import type { CheckActionResponse } from "@/lib/api/ai";

type Props = {
  open: boolean;
  alert: CheckActionResponse;
  onCancel: () => void;
  onProceed?: (overrideReason?: string) => void;
  allowProceed?: boolean;
  closeLabel?: string;
  proceedLabel?: string;
};

export const AiActionAlertDialog = ({
  open,
  alert,
  onCancel,
  onProceed,
  allowProceed = true,
  closeLabel,
  proceedLabel,
}: Props) => {
  const [overrideReason, setOverrideReason] = useState("");
  const canProceed = allowProceed && typeof onProceed === "function";

  const handleProceed = () => {
    if (!canProceed) return;
    if (alert.requiresOverrideReason && !overrideReason.trim()) return;
    onProceed?.(alert.requiresOverrideReason ? overrideReason.trim() : undefined);
    setOverrideReason("");
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{alert.title ?? "Clinical alert"}</DialogTitle>
          <DialogDescription>
            {alert.severity && (
              <span className="block text-xs font-medium uppercase tracking-wide mb-1 text-warning">
                Severity: {alert.severity}
              </span>
            )}
            {alert.message}
          </DialogDescription>
        </DialogHeader>

        {alert.evidence && alert.evidence.length > 0 && (
          <div className="space-y-sm text-sm">
            <div className="font-medium">Evidence</div>
            <ul className="space-y-xs list-disc list-inside text-text-secondary">
              {alert.evidence.map((e, i) => (
                <li key={i}>
                  <span className="font-medium">{e.date}</span> · {e.facility} — {e.detail}
                </li>
              ))}
            </ul>
          </div>
        )}

        {alert.alternatives && alert.alternatives.length > 0 && (
          <div className="text-sm text-text-secondary">
            <span className="font-medium">Alternatives: </span>
            {alert.alternatives.join(" · ")}
          </div>
        )}

        {alert.requiresOverrideReason && (
          <div className="space-y-xs">
            <Label>Override reason (required)</Label>
            <Textarea
              value={overrideReason}
              onChange={(e) => setOverrideReason(e.target.value)}
              placeholder="Document clinical justification…"
              rows={3}
            />
          </div>
        )}

        <DialogFooter className="gap-sm">
          <Button variant={canProceed ? "outline" : "default"} onClick={onCancel}>
            {closeLabel ?? (canProceed ? "Cancel" : "Close")}
          </Button>
          {canProceed && <Button onClick={handleProceed}>{proceedLabel ?? "Proceed anyway"}</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
