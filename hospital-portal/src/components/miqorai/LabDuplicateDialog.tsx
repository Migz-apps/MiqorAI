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

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onCancel()}>
      <DialogContent className="sm:max-w-md text-center">
        <DialogHeader className="items-center text-center">
          <DialogTitle>Prior test found</DialogTitle>
          <DialogDescription className="text-center">
            <span className="font-medium text-foreground">{testName}</span> was taken on{" "}
            <span className="font-medium text-foreground">{prior.taken_on}</span>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-md py-sm">
          <Button variant="outline" className="w-full" onClick={() => setShowResults((v) => !v)}>
            {showResults ? "Hide results" : "View results"}
          </Button>
          {showResults && (
            <div className="text-left text-sm p-md rounded-md border bg-background-grey whitespace-pre-wrap">
              {prior.results || "No result details available."}
            </div>
          )}
        </div>

        <DialogFooter className="flex-col sm:flex-col gap-sm">
          <Button variant="outline" className="w-full" onClick={onCancel}>
            Do not order test
          </Button>
          <Button className="w-full" onClick={onConfirm}>
            Order test
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
