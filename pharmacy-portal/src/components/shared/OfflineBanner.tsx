import { WifiOff } from "lucide-react";
import { useSync } from "@/store/sync";

export const OfflineBanner = () => {
  const online = useSync(s => s.online);
  if (online) return null;
  return (
    <div className="bg-secondary/15 border-b border-secondary/30 px-md py-2 flex items-center gap-sm text-xs text-foreground">
      <WifiOff className="h-3.5 w-3.5 text-secondary" />
      You're offline. Dispenses will queue and sync automatically when reconnected.
    </div>
  );
};
