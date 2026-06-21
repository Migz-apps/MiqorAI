import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, TrendingUp, Activity, ShieldAlert, FileBarChart2, FileText,
  Users, ScrollText, Settings as SettingsIcon, ShieldCheck, Building2,
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

  const sections = [
    {
      label: "Overview",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
      ],
    },
    {
      label: "Performance",
      items: [
        { title: "Savings", url: "/savings", icon: TrendingUp, show: can(role, "viewSavings") },
        { title: "Adherence", url: "/adherence", icon: Activity, show: can(role, "viewAdherence") },
        { title: "Fraud", url: "/fraud", icon: ShieldAlert, show: can(role, "viewFraud") },
        { title: "Members", url: "/members", icon: Users, show: true },
      ],
    },
    {
      label: "Reporting",
      items: [
        { title: "Reports", url: "/reports", icon: FileBarChart2, show: can(role, "runReports") },
        { title: "Contract", url: "/contract", icon: FileText, show: can(role, "viewContract") },
      ],
    },
    {
      label: "Administration",
      items: [
        { title: "Staff", url: "/staff", icon: Users, show: can(role, "manageStaff") },
        { title: "Audit log", url: "/audit", icon: ShieldCheck, show: can(role, "viewAudit") },
        { title: "Settings", url: "/settings", icon: SettingsIcon, show: can(role, "manageSettings") },
      ],
    },
  ];

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-sm px-md py-lg border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-insurer flex items-center justify-center shrink-0">
            <Building2 className="h-5 w-5 text-insurer-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">MiqorAI</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Insurer Portal</div>
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
          v1.0 · {session.insurerCode} · MiqorAI network
        </div>
      </SidebarContent>
    </Sidebar>
  );
}
