import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Hospital, Pill, ShieldCheck, Users, Receipt,
  AlertTriangle, FileLock2, Wallet, Activity, Settings, LifeBuoy, Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/lib/auth";

const nav = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard },
  { to: "/hospitals", label: "Hospitals", icon: Hospital, badge: 3 },
  { to: "/pharmacies", label: "Pharmacies", icon: Pill },
  { to: "/insurers", label: "Insurers", icon: ShieldCheck },
  { to: "/patients", label: "Patients", icon: Users },
  { to: "/transactions", label: "Transactions", icon: Receipt },
  { to: "/disputes", label: "Disputes", icon: AlertTriangle, badge: 2 },
  { to: "/compliance", label: "Compliance", icon: FileLock2 },
  { to: "/billing", label: "Billing", icon: Wallet },
  { to: "/system", label: "System", icon: Activity },
];

const footer = [
  { to: "/settings", label: "Settings", icon: Settings },
  { to: "/help", label: "Help", icon: LifeBuoy },
];

export function Sidebar() {
  const path = useRouterState({ select: (s) => s.location.pathname });
  const session = useAuth((s) => s.session);
  const logout = useAuth((s) => s.logout);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate({ to: "/login", replace: true });
  };
  return (
    <aside className="hidden lg:flex w-64 shrink-0 flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground">
      <div className="flex items-center gap-3 px-5 h-16 border-b border-sidebar-border">
        <div className="relative">
          <div className="size-9 rounded-lg bg-gradient-primary grid place-items-center glow-primary">
            <Sparkles className="size-5 text-primary-foreground" />
          </div>
          <span className="absolute -top-1 -right-1 size-2.5 rounded-full bg-success pulse-dot text-success" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-semibold tracking-tight">MiqorAI</div>
          <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Management</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 scrollbar-thin">
        <div className="px-2 pb-2 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">Operations</div>
        <ul className="space-y-1">
          {nav.map(({ to, label, icon: Icon, badge }) => {
            const active = to === "/" ? path === "/" : path.startsWith(to);
            return (
              <li key={to}>
                <Link
                  to={to}
                  className={cn(
                    "group flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-all",
                    active
                      ? "bg-sidebar-accent text-sidebar-accent-foreground border border-border/60 shadow-[inset_2px_0_0_var(--color-primary)]"
                      : "hover:bg-sidebar-accent/60 text-sidebar-foreground/80",
                  )}
                >
                  <Icon className={cn("size-4", active && "text-primary")} />
                  <span className="flex-1">{label}</span>
                  {badge ? (
                    <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-destructive/20 text-destructive border border-destructive/40">
                      {badge}
                    </span>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      <div className="border-t border-sidebar-border p-3 space-y-1">
        {footer.map(({ to, label, icon: Icon }) => (
          <Link key={to} to={to}
            className="flex items-center gap-3 rounded-md px-3 py-2 text-sm hover:bg-sidebar-accent/60">
            <Icon className="size-4" /> {label}
          </Link>
        ))}
        <button
          type="button"
          onClick={handleLogout}
          className="mt-3 w-full flex items-center gap-3 rounded-md border border-border/60 bg-card-gradient p-2.5 hover:border-primary/40 transition text-left"
        >
          <div className="size-8 rounded-full bg-gradient-primary grid place-items-center text-xs font-semibold text-primary-foreground">
            {session?.email?.[0]?.toUpperCase() ?? "A"}
          </div>
          <div className="leading-tight min-w-0">
            <div className="text-xs font-medium truncate">Admin</div>
            <div className="text-[10px] text-muted-foreground truncate">{session?.email ?? "Sign out"}</div>
          </div>
          <span className="ml-auto text-[10px] text-muted-foreground">Sign out</span>
        </button>
      </div>
    </aside>
  );
}
