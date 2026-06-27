import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";
import type { PriorLabMatch } from "@/lib/types";

type Props = {
  open: boolean;
  testName: string;
  prior: PriorLabMatch;
  onCancel: () => void;
  onConfirm: () => void;
};

export const LabDuplicateDialog = ({ open, testName, prior, onCancel, onConfirm }: Props) => {
  const [showResults, setShowResults] = useState(false);

  useEffect(() => {
    if (open) setShowResults(false);
  }, [open, testName]);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-xl w-[95vw] text-center p-xl gap-md">
        <DialogHeader className="items-center text-center space-y-md">
          <div className="mx-auto h-14 w-14 rounded-full bg-warning/15 flex items-center justify-center">
            <AlertTriangle className="h-7 w-7 text-warning" />
          </div>
          <DialogTitle className="text-xl md:text-2xl font-semibold leading-snug">
            A similar test has already been taken on {prior.taken_on}
          </DialogTitle>
          <DialogDescription className="text-base text-center text-text-secondary">
            <span className="font-medium text-foreground">{testName}</span>
            {prior.test_name && prior.test_name.toLowerCase() !== testName.toLowerCase() && (
              <> (prior record: {prior.test_name})</>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-sm">
          {!showResults ? (
            <Button variant="outline" size="lg" className="w-full" onClick={() => setShowResults(true)}>
              See Results
            </Button>
          ) : (
            <>
              <div className="text-left text-sm p-md rounded-lg border bg-background-grey whitespace-pre-wrap max-h-64 overflow-auto">
                {prior.results || "No result details available."}
              </div>
              <div className="flex flex-col sm:flex-row gap-sm pt-sm">
                <Button variant="outline" size="lg" className="flex-1" onClick={onCancel}>
                  Cancel test
                </Button>
                <Button size="lg" className="flex-1" onClick={onConfirm}>
                  Order test regardless
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
