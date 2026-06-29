import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { loadSyncQueue, retrySyncItem, syncKeys, useSync } from "@/store/sync";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export default function SyncQueue() {
  const online = useSync((s) => s.online);
  const queryClient = useQueryClient();

  const { data: queue = [], isLoading } = useQuery({
    queryKey: syncKeys.queue(),
    queryFn: loadSyncQueue,
    refetchInterval: 30_000,
  });

  const retryMutation = useMutation({
    mutationFn: retrySyncItem,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: syncKeys.queue() }),
  });

  return (
    <div className="max-w-[1400px] mx-auto space-y-lg">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="h1">Sync queue</h1>
          <p className="body text-text-secondary">
            Status: {online ? <span className="text-success">Online</span> : <span className="text-secondary">Offline — actions queued</span>}
          </p>
        </div>
        <Button variant="outline" onClick={() => queryClient.invalidateQueries({ queryKey: syncKeys.queue() })}>
          <RefreshCw className="h-4 w-4 mr-2" />Refresh
        </Button>
      </div>
      <Card>
        <CardHeader className="pb-sm"><CardTitle className="h3 flex items-center gap-sm"><RefreshCw className="h-5 w-5 text-pharmacy" /> Pending & recent</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="divide-y">
            {isLoading && <div className="p-md text-sm text-text-secondary">Loading sync queue…</div>}
            {!isLoading && queue.length === 0 && <div className="p-md text-sm text-text-secondary">Nothing queued.</div>}
            {queue.map((q) => (
              <div key={q.id} className="flex items-center gap-md px-md py-sm">
                <Badge variant="outline" className="capitalize">{q.type}</Badge>
                <div className="flex-1 text-sm">{q.label}</div>
                <div className="text-xs text-text-secondary">{formatDistanceToNow(new Date(q.at), { addSuffix: true })}</div>
                <Badge variant="outline" className={
                  q.status === "synced" ? "border-success/30 text-success bg-success/10"
                    : q.status === "failed" ? "border-error/30 text-error bg-error/10"
                      : q.status === "conflict" ? "border-secondary/30 text-secondary bg-secondary/10"
                        : "border-secondary/30 text-secondary bg-secondary/10"
                }>{q.status}</Badge>
                {q.status !== "synced" && (
                  <Button size="sm" variant="ghost" onClick={() => retryMutation.mutate(q.id)}>Retry</Button>
                )}
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
