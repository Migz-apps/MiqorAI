import { useState } from "react";
import { RefreshCw, CheckCircle2, AlertCircle, Wifi, WifiOff, Trash2, FileText, Pill, Activity, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import { useSync } from "@/store/sync";
import { toast } from "@/lib/notify";
import type { SyncItem } from "@/lib/types";

const typeIcon = { visit: FileText, prescription: Pill, vitals: Activity } as const;

export default function SyncQueue() {
  const { online, queue, syncAll, setOnline, retry, resolve, remove } = useSync();
  const [conflict, setConflict] = useState<SyncItem | null>(null);
  const pending = queue.filter(q => q.status === "pending");
  const conflicts = queue.filter(q => q.status === "conflict");
  const synced = queue.filter(q => q.status === "synced");

  const onSync = () => {
    const r = syncAll();
    if (r.conflicts > 0) toast.warning(`${r.synced} synced · ${r.conflicts} conflict(s) need review`);
    else if (r.synced > 0) toast.success(`${r.synced} record(s) synced`);
    else toast.info("Nothing to sync");
  };

  return (
    <div className="space-y-lg max-w-[1000px] mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-md">
        <div>
          <h1 className="h1">Sync Queue</h1>
          <p className="body text-text-secondary">Records created offline are queued here until synced.</p>
        </div>
        <div className="flex items-center gap-sm flex-wrap">
          <Button variant="outline" size="sm" onClick={() => setOnline(!online)}>
            {online ? <><Wifi className="h-4 w-4 mr-1" /> Go offline</> : <><WifiOff className="h-4 w-4 mr-1" /> Go online</>}
          </Button>
          <Button onClick={onSync} disabled={!online || pending.length === 0} className="bg-primary hover:bg-primary/90">
            <RefreshCw className="h-4 w-4 mr-2" /> Sync now ({pending.length})
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-md">
        <Stat icon={Clock} label="Pending" value={pending.length} tone="bg-secondary/15 text-secondary" />
        <Stat icon={AlertCircle} label="Conflicts" value={conflicts.length} tone="bg-error/15 text-error" />
        <Stat icon={CheckCircle2} label="Synced" value={synced.length} tone="bg-success/15 text-success" />
      </div>

      <Card>
        <CardHeader className="pb-sm">
          <CardTitle className="h3">Queued items</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {queue.length === 0 ? (
            <div className="p-xl text-center text-sm text-text-secondary">Nothing in the queue.</div>
          ) : (
            <div className="divide-y">
              {queue.map(item => {
                const Icon = typeIcon[item.type];
                return (
                  <div key={item.id} className="px-md py-sm flex items-center gap-md">
                    <div className={`h-9 w-9 rounded-full flex items-center justify-center shrink-0 ${
                      item.status === "synced" ? "bg-success/15 text-success" :
                      item.status === "conflict" ? "bg-error/15 text-error" :
                      "bg-secondary/15 text-secondary"
                    }`}>
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">{item.patientName}</div>
                      <div className="text-xs text-text-secondary capitalize truncate">{item.type} · {item.createdAt}</div>
                    </div>
                    <Badge variant="outline" className={`capitalize hidden sm:inline-flex ${
                      item.status === "synced" ? "border-success/30 text-success" :
                      item.status === "conflict" ? "border-error/30 text-error" :
                      "border-secondary/30 text-secondary"
                    }`}>{item.status}</Badge>
                    {item.status === "conflict" && (
                      <Button size="sm" variant="outline" onClick={() => setConflict(item)}>Resolve</Button>
                    )}
                    {item.status === "pending" && (
                      <Button size="sm" variant="ghost" onClick={() => retry(item.id)} title="Retry">
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    <Button size="icon" variant="ghost" onClick={() => { remove(item.id); toast.success("Removed from queue"); }} title="Remove" className="h-8 w-8">
                      <Trash2 className="h-4 w-4 text-text-secondary" />
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!conflict} onOpenChange={(o) => !o && setConflict(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve sync conflict</DialogTitle>
            <DialogDescription>
              The server has a newer version of this {conflict?.type} for <strong>{conflict?.patientName}</strong>. Choose which version to keep.
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-sm">
            <div className="rounded-md border p-sm">
              <div className="text-xs text-text-secondary mb-xs">Your offline version</div>
              <div className="text-sm font-medium">Created {conflict?.createdAt}</div>
              <div className="text-xs text-text-secondary mt-xs">Local edit on this device</div>
            </div>
            <div className="rounded-md border p-sm bg-background-grey">
              <div className="text-xs text-text-secondary mb-xs">Server version</div>
              <div className="text-sm font-medium">Modified by another staff</div>
              <div className="text-xs text-text-secondary mt-xs">Last update on the cloud</div>
            </div>
          </div>

          <DialogFooter className="gap-sm">
            <Button variant="outline" onClick={() => { if (conflict) { resolve(conflict.id, "server"); toast.success("Server version kept"); setConflict(null); } }}>
              Keep server version
            </Button>
            <Button className="bg-primary hover:bg-primary/90" onClick={() => { if (conflict) { resolve(conflict.id, "mine"); toast.success("Your version kept"); setConflict(null); } }}>
              Keep my version
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const Stat = ({ icon: Icon, label, value, tone }: any) => (
  <Card>
    <CardContent className="p-md flex items-center gap-sm">
      <div className={`h-9 w-9 rounded-md flex items-center justify-center ${tone}`}><Icon className="h-4 w-4" /></div>
      <div>
        <div className="text-xs text-text-secondary">{label}</div>
        <div className="text-lg font-semibold">{value}</div>
      </div>
    </CardContent>
  </Card>
);
