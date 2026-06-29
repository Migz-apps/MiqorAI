import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, ListChecks, Pill, Package, Users, BarChart3, UserCog,
  Settings as SettingsIcon, ShieldCheck, RefreshCw, Activity, Receipt, ScanLine,
} from "lucide-react";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem, useSidebar,
} from "@/components/ui/sidebar";
import { useAuth, can } from "@/store/auth";

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { pathname } = useLocation();
  const session = useAuth(s => s.session);
  if (!session) return null;
  const role = session.role;

  const sections: { label: string; items: { title: string; url: string; icon: any; show: boolean }[] }[] = [
    {
      label: "Workspace",
      items: [
        { title: "Dashboard",     url: "/dashboard",     icon: LayoutDashboard, show: true },
        { title: "Scan QR",       url: "/scan",          icon: ScanLine,        show: can(role, "scanQR") },
      ],
    },
    {
      label: "Dispensing",
      items: [
        { title: "Prescriptions", url: "/prescriptions", icon: Pill,        show: can(role, "viewQueue") },
        { title: "Patients",      url: "/patients",      icon: Users,       show: true },
        { title: "Adherence",     url: "/adherence",     icon: Activity,    show: can(role, "viewAnalytics") },
      ],
    },
    {
      label: "Pharmacy",
      items: [
        { title: "Inventory",     url: "/inventory",     icon: Package,     show: can(role, "manageInventory") },
        { title: "Billing",       url: "/billing",       icon: Receipt,     show: can(role, "viewBilling") },
        { title: "Reports",       url: "/reports",       icon: BarChart3,   show: can(role, "viewAnalytics") },
      ],
    },
    {
      label: "Administration",
      items: [
        { title: "Staff",         url: "/staff",         icon: UserCog,     show: can(role, "manageStaff") },
        { title: "Audit log",     url: "/audit",         icon: ShieldCheck, show: can(role, "viewAudit") },
        { title: "Settings",      url: "/settings",      icon: SettingsIcon,show: can(role, "manageSettings") },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Sync queue",    url: "/sync",          icon: RefreshCw,   show: true },
      ],
    },
  ];

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-sm px-md py-lg border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-pharmacy flex items-center justify-center shrink-0">
            <Pill className="h-5 w-5 text-pharmacy-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">MiqorAI</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Pharmacy Portal</div>
            </div>
          )}
        </div>
        {sections.map(section => {
          const visible = section.items.filter(i => i.show);
          if (!visible.length) return null;
          return (
            <SidebarGroup key={section.label}>
              {!collapsed && <SidebarGroupLabel>{section.label}</SidebarGroupLabel>}
              <SidebarGroupContent>
                <SidebarMenu>
                  {visible.map(item => (
                    <SidebarMenuItem key={item.url}>
                      <SidebarMenuButton asChild isActive={isActive(item.url)}>
                        <NavLink to={item.url} className="flex items-center gap-sm">
                          <item.icon className="h-4 w-4" />
                          {!collapsed && <span>{item.title}</span>}
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          );
        })}
        <div className="mt-auto p-md text-[10px] text-sidebar-foreground/40">
          v1.0 · Connected to MiqorAI network
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
