import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { hasSession } from "@/lib/api/client";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { AuthLoading } from "@/components/shared/AuthLoading";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const hydrated = useAuthHydrated();
  const session = useAuth((s) => s.session);
  const ready = useAuth((s) => s.ready);
  const restoreSession = useAuth((s) => s.restoreSession);

  useEffect(() => {
    if (!hydrated) return;
    void restoreSession();
  }, [hydrated, restoreSession]);

  if (!hydrated || !ready) {
    return <AuthLoading message={hydrated ? "Restoring session…" : "Loading…"} />;
  }

  if (!session || !hasSession()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
