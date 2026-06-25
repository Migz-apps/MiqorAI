import { useEffect } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";
import { OfflineBanner } from "@/components/shared/OfflineBanner";
import { GlobalSearchProvider } from "@/components/shared/GlobalSearch";
import { useNotifications } from "@/store/notifications";
import { useSync } from "@/store/sync";
import { useWaitlist } from "@/store/waitlist";

function StoreHydration() {
  const loadNotif = useNotifications(s => s.load);
  const loadSync = useSync(s => s.load);
  const refreshWaitlist = useWaitlist(s => s.refresh);

  useEffect(() => {
    loadNotif();
    loadSync();
    refreshWaitlist();
  }, [loadNotif, loadSync, refreshWaitlist]);

  return null;
}

export const AppLayout = () => (
  <GlobalSearchProvider>
    <StoreHydration />
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background-grey">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-14 flex items-center gap-2 border-b bg-background px-md sticky top-0 z-30">
            <SidebarTrigger />
            <TopBar />
          </header>
          <OfflineBanner />
          <main className="flex-1 p-md sm:p-lg overflow-auto">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  </GlobalSearchProvider>
);
