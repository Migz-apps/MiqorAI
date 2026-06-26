import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { loadTokens } from "@/lib/api/client";
import { useAuthHydrated } from "@/hooks/useAuthHydrated";
import { AuthLoading } from "@/components/shared/AuthLoading";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const hydrated = useAuthHydrated();
  const session = useAuth((s) => s.session);
  const restoreSession = useAuth((s) => s.restoreSession);
  const [booting, setBooting] = useState(() => Boolean(loadTokens()));

  useEffect(() => {
    if (!hydrated) return;
    const tokens = loadTokens();
    if (!tokens) {
      setBooting(false);
      return;
    }
    setBooting(true);
    restoreSession().finally(() => setBooting(false));
  }, [hydrated, restoreSession]);

  if (!hydrated || booting) {
    return <AuthLoading message={booting ? "Restoring session…" : "Loading…"} />;
  }

  if (!session || !loadTokens()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
