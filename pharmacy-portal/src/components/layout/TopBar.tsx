import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { LogOut, Wifi, WifiOff, RefreshCw, ChevronDown, Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth, ROLE_LABEL, ROLE_TRACK } from "@/store/auth";
import { useSync, loadSyncQueue, syncKeys } from "@/store/sync";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Role } from "@/lib/types";

const trackPill: Record<ReturnType<typeof getTrack>, string> = {
  cashier:    "bg-role-cashier-light text-[hsl(var(--cashier-accent))] border-[hsl(var(--cashier-accent))]/20",
  tech:       "bg-role-tech-light text-[hsl(var(--tech-accent))] border-[hsl(var(--tech-accent))]/20",
  pharmacist: "bg-role-pharmacist-light text-[hsl(var(--pharmacist-accent))] border-[hsl(var(--pharmacist-accent))]/20",
  manager:    "bg-role-manager-light text-[hsl(var(--manager-accent))] border-[hsl(var(--manager-accent))]/20",
};

function getTrack(r: Role) { return ROLE_TRACK[r]; }

export const TopBar = () => {
  const session = useAuth(s => s.session);
  const logout = useAuth(s => s.logout);
  const online = useSync((s) => s.online);
  const { data: queue = [] } = useQuery({
    queryKey: syncKeys.queue(),
    queryFn: loadSyncQueue,
    refetchInterval: 60_000,
  });
  const nav = useNavigate();
  if (!session) return null;
  const pendingCount = queue.filter(q => q.status === "pending").length;
  const track = getTrack(session.role);

  return (
    <div className="flex-1 flex items-center justify-between gap-md">
      <div className="min-w-0 flex items-center gap-sm">
        <div className="min-w-0 hidden sm:block">
          <div className="text-sm font-semibold truncate">{session.pharmacyName}</div>
          <div className="text-[11px] text-text-secondary truncate">Code: {session.pharmacyCode}</div>
        </div>
        <Badge variant="outline" className={`hidden md:inline-flex capitalize ${trackPill[track]}`}>
          {ROLE_LABEL[session.role]}
        </Badge>
      </div>

      <div className="flex items-center gap-1 sm:gap-sm">
        {online ? (
          <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-success/30 text-success bg-success/10">
            <Wifi className="h-3 w-3" /> Online
          </Badge>
        ) : (
          <Badge variant="outline" className="hidden sm:inline-flex gap-1 border-secondary/40 text-secondary bg-secondary/10">
            <WifiOff className="h-3 w-3" /> Offline
          </Badge>
        )}
        <Button variant="ghost" size="sm" className="gap-1 h-9" onClick={() => nav("/sync")} title="Sync queue">
          <RefreshCw className="h-4 w-4" />
          {pendingCount > 0 && (
            <Badge className="bg-secondary text-secondary-foreground h-5 px-1.5">{pendingCount}</Badge>
          )}
        </Button>
        <Button variant="ghost" size="sm" className="h-9 relative" title="Notifications">
          <Bell className="h-4 w-4" />
          <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-error" />
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9">
              <div className="h-7 w-7 rounded-full bg-pharmacy-light text-pharmacy flex items-center justify-center text-xs font-semibold">
                {session.name.split(" ").map(n => n[0]).slice(0,2).join("")}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium leading-tight">{session.name}</div>
                <div className="text-[10px] text-text-secondary leading-tight">{ROLE_LABEL[session.role]}</div>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>{session.name}</DropdownMenuLabel>
            <DropdownMenuLabel className="text-text-secondary font-normal">{ROLE_LABEL[session.role]}</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/settings")}>Settings</DropdownMenuItem>
            <DropdownMenuItem onClick={async () => { await logout(); nav("/login"); }} className="text-error focus:text-error">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
