import { NavLink, useLocation } from "react-router-dom";
import {
  LayoutDashboard, Users, RefreshCw, UserCog, BarChart3, Stethoscope,
  Settings as SettingsIcon, ScanLine, ListChecks, Printer, UserPlus,
  Building2, CreditCard, FileText, ShieldCheck, Activity, Send, FlaskConical
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

  // Group items per role spec — clean role-aware navigation
  const sections: { label: string; items: { title: string; url: string; icon: any; show: boolean }[] }[] = [
    {
      label: "Workspace",
      items: [
        { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, show: true },
        { title: "Patients",  url: "/patients",  icon: Users, show: can(role, "viewBasic") },
      ],
    },
    {
      label: "Reception",
      items: [
        { title: "Check-in",        url: "/checkin",     icon: ScanLine,  show: can(role, "checkIn") },
        { title: "Waitlist",        url: "/waitlist",    icon: ListChecks,show: true },
        { title: "Manual register", url: "/register",    icon: UserPlus,  show: can(role, "manualRegister") },
        { title: "Print stickers",  url: "/stickers",    icon: Printer,   show: can(role, "printSticker") },
      ],
    },
    {
      label: "Clinical",
      items: [
        { title: "Prescriptions", url: "/prescriptions", icon: FlaskConical, show: can(role, "prescribe") },
        { title: "Lab results",   url: "/labs",          icon: Activity,    show: can(role, "orderLabs") },
        { title: "Referrals",     url: "/referrals",     icon: Send,        show: can(role, "addDiagnosis") },
      ],
    },
    {
      label: "Administration",
      items: [
        { title: "Staff",        url: "/staff",        icon: UserCog,     show: can(role, "manageStaff") },
        { title: "Departments",  url: "/departments",  icon: Building2,   show: can(role, "manageDepartment") },
        { title: "Billing",      url: "/billing",      icon: CreditCard,  show: can(role, "viewBilling") },
        { title: "Reports",      url: "/reports",      icon: FileText,    show: can(role, "viewAnalytics") },
        { title: "Audit log",    url: "/audit",        icon: ShieldCheck, show: can(role, "viewAudit") },
        { title: "System health",url: "/system",       icon: Activity,    show: can(role, "manageHospital") },
        { title: "Analytics",    url: "/analytics",    icon: BarChart3,   show: can(role, "viewAnalytics") },
      ],
    },
    {
      label: "System",
      items: [
        { title: "Sync queue", url: "/sync",     icon: RefreshCw,   show: true },
        { title: "Settings",   url: "/settings", icon: SettingsIcon,show: true },
      ],
    },
  ];

  const isActive = (p: string) => pathname === p || pathname.startsWith(p + "/");

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <div className="flex items-center gap-sm px-md py-lg border-b border-sidebar-border">
          <div className="h-8 w-8 rounded-md bg-primary flex items-center justify-center shrink-0">
            <Stethoscope className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <div className="text-sm font-semibold text-sidebar-foreground truncate">Med-Pass</div>
              <div className="text-[11px] text-sidebar-foreground/60 truncate">Hospital Portal</div>
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
      </SidebarContent>
    </Sidebar>
  );
}
