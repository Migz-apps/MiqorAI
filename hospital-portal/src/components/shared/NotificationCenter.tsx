import { useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { useNotifications } from "@/store/notifications";
import { useAuth } from "@/store/auth";

const typeColor: Record<string, string> = {
  wait_alert:   "bg-secondary/15 text-secondary",
  lab_ready:    "bg-[hsl(var(--clinical-accent))]/15 text-[hsl(var(--clinical-accent))]",
  system:       "bg-foreground/10 text-foreground",
  billing:      "bg-[hsl(var(--admin-accent))]/15 text-[hsl(var(--admin-accent))]",
  staff_invite: "bg-success/15 text-success",
};

export const NotificationCenter = () => {
  const session = useAuth(s => s.session);
  const items = useNotifications(s => session ? s.forRole(session.role) : []);
  const unread = useNotifications(s => session ? s.unreadFor(session.role) : 0);
  const markRead = useNotifications(s => s.markRead);
  const markAllRead = useNotifications(s => s.markAllRead);
  const load = useNotifications(s => s.load);

  useEffect(() => {
    if (session) load();
  }, [session, load]);

  if (!session) return null;
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="relative h-9 w-9 p-0" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <Badge className="absolute -top-0.5 -right-0.5 h-4 min-w-4 px-1 bg-error text-error-foreground text-[10px]">
              {unread}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="px-md py-sm border-b flex items-center justify-between">
          <div className="text-sm font-semibold">Notifications</div>
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => markAllRead()}>
            <CheckCheck className="h-3 w-3 mr-1" /> Mark all read
          </Button>
        </div>
        <div className="max-h-80 overflow-auto divide-y">
          {items.length === 0 && (
            <div className="px-md py-lg text-center text-sm text-text-secondary">No notifications.</div>
          )}
          {items.map(n => (
            <button
              key={n.id}
              onClick={() => markRead(n.id)}
              className={`w-full text-left px-md py-sm hover:bg-background-grey ${!n.read ? "bg-primary-light/30" : ""}`}
            >
              <div className="flex items-start gap-sm">
                <div className={`h-7 w-7 shrink-0 rounded-md flex items-center justify-center text-[10px] font-medium ${typeColor[n.type] || "bg-foreground/10"}`}>
                  {n.type.split("_").map(s => s[0]).join("").toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{n.title}</div>
                  <div className="text-xs text-text-secondary line-clamp-2">{n.body}</div>
                  <div className="text-[10px] text-text-secondary mt-0.5">{n.createdAt}</div>
                </div>
                {!n.read && <div className="h-2 w-2 rounded-full bg-primary mt-1" />}
                {n.read && <Check className="h-3 w-3 text-text-secondary mt-1" />}
              </div>
            </button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
};
