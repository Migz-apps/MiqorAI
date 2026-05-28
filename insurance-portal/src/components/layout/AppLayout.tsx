import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopBar } from "./TopBar";

export const AppLayout = () => (
  <SidebarProvider>
    <div className="min-h-screen flex w-full bg-background-grey">
      <AppSidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 flex items-center gap-2 border-b bg-background px-md sticky top-0 z-30">
          <SidebarTrigger />
          <TopBar />
        </header>
        <main className="flex-1 p-md sm:p-lg overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  </SidebarProvider>
);
