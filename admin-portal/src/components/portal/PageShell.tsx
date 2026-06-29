import { useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { Sidebar } from "./Sidebar";
import { Topbar } from "./Topbar";
import { useAuth } from "@/lib/auth";

export function PageShell({
  title, subtitle, children,
}: { title: string; subtitle?: string; children: React.ReactNode }) {
  const session = useAuth((s) => s.session);
  const restoreSession = useAuth((s) => s.restoreSession);
  const navigate = useNavigate();

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login", replace: true });
    }
  }, [session, navigate]);

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-muted-foreground">
        Redirecting to sign in…
      </div>
    );
  }

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        <Topbar title={title} subtitle={subtitle} />
        <main className="flex-1 p-4 lg:p-6 space-y-6">{children}</main>
      </div>
    </div>
  );
}
