import { useSync } from "@/store/sync";
import { WifiOff, X } from "lucide-react";
import { useState } from "react";

export const OfflineBanner = () => {
  const online = useSync(s => s.online);
  const queue = useSync(s => s.queue);
  const [hidden, setHidden] = useState(false);
  if (online || hidden) return null;
  const pending = queue.filter(q => q.status === "pending").length;
  return (
    <div className="bg-secondary/15 border-b border-secondary/30 px-md py-2 flex items-center justify-between gap-sm text-xs">
      <div className="flex items-center gap-sm text-foreground">
        <WifiOff className="h-4 w-4 text-secondary" />
        <span><strong>You are offline.</strong> Changes will sync when the connection returns.</span>
        {pending > 0 && <span className="text-text-secondary">· {pending} pending</span>}
      </div>
      <button onClick={() => setHidden(true)} className="text-text-secondary hover:text-foreground" aria-label="Hide">
        <X className="h-4 w-4" />
      </button>
    </div>
  );
};
