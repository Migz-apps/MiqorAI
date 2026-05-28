import { AlertTriangle } from "lucide-react";

export const FormAlert = ({ children }: { children: React.ReactNode }) => (
  <div className="flex items-start gap-sm p-sm rounded-md bg-error/10 border border-error/30 text-error text-xs">
    <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
    <div>{children}</div>
  </div>
);
