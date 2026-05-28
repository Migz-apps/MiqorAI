import { useNavigate } from "react-router-dom";
import { LogOut, ShieldCheck, ChevronDown, Bell, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useAuth, ROLE_LABEL } from "@/store/auth";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { initials } from "@/lib/format";
import type { Role } from "@/lib/types";
import { ALERTS } from "@/lib/mockData";

const trackPill: Record<Role, string> = {
  analyst:   "bg-role-analyst-light    role-analyst    border-[hsl(var(--analyst-accent))]/20",
  fraud:     "bg-role-fraud-light      role-fraud      border-[hsl(var(--fraud-accent))]/20",
  contracts: "bg-role-contracts-light  role-contracts  border-[hsl(var(--contracts-accent))]/20",
  executive: "bg-role-executive-light  role-executive  border-[hsl(var(--executive-accent))]/20",
  admin:     "bg-role-admin-light      role-admin      border-[hsl(var(--admin-accent))]/20",
};

export const TopBar = () => {
  const session = useAuth(s => s.session);
  const logout = useAuth(s => s.logout);
  const switchRole = useAuth(s => s.switchRole);
  const nav = useNavigate();
  if (!session) return null;
  const unread = ALERTS.filter(a => a.severity === "high").length;

  return (
    <div className="flex-1 flex items-center justify-between gap-md">
      <div className="min-w-0 flex items-center gap-sm">
        <div className="min-w-0 hidden sm:block">
          <div className="text-sm font-semibold truncate">{session.insurerName}</div>
          <div className="text-[11px] text-text-secondary truncate">Code: {session.insurerCode}</div>
        </div>
        <Badge variant="outline" className={`hidden md:inline-flex capitalize ${trackPill[session.role]}`}>
          {ROLE_LABEL[session.role]}
        </Badge>
      </div>

      <div className="hidden md:flex items-center max-w-sm flex-1 mx-md">
        <div className="relative w-full">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-secondary" />
          <Input
            className="pl-8 h-9 bg-background-grey border-transparent focus-visible:bg-background"
            placeholder="Search claims, members, providers..."
          />
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-sm">
        <Badge variant="outline" className="hidden lg:inline-flex gap-1 border-success/30 text-success bg-success/10">
          <ShieldCheck className="h-3 w-3" /> Encrypted session
        </Badge>
        <Button variant="ghost" size="sm" className="h-9 relative" title="Alerts">
          <Bell className="h-4 w-4" />
          {unread > 0 && (
            <span className="absolute top-1 right-1 h-4 min-w-4 px-1 rounded-full bg-error text-error-foreground text-[10px] font-semibold flex items-center justify-center">
              {unread}
            </span>
          )}
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="gap-2 h-9">
              <div className="h-7 w-7 rounded-full bg-insurer-light text-insurer flex items-center justify-center text-xs font-semibold">
                {initials(session.name)}
              </div>
              <div className="text-left hidden sm:block">
                <div className="text-xs font-medium leading-tight">{session.name}</div>
                <div className="text-[10px] text-text-secondary leading-tight">{ROLE_LABEL[session.role]}</div>
              </div>
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-60">
            <DropdownMenuLabel className="text-[11px] text-text-secondary">Switch role (demo)</DropdownMenuLabel>
            {(["analyst","fraud","contracts","executive","admin"] as Role[]).map(r => (
              <DropdownMenuItem key={r} onClick={() => switchRole(r)}>
                {ROLE_LABEL[r]} {session.role === r && <span className="ml-auto text-insurer">✓</span>}
              </DropdownMenuItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => nav("/settings")}>Account settings</DropdownMenuItem>
            <DropdownMenuItem onClick={() => { logout(); nav("/login"); }} className="text-error focus:text-error">
              <LogOut className="h-4 w-4 mr-2" /> Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
};
