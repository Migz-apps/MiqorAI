import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { loadTokens } from "@/lib/api/client";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useAuth(s => s.session);
  const restoreSession = useAuth(s => s.restoreSession);
  const [booting, setBooting] = useState(() => !!loadTokens());

  useEffect(() => {
    if (!loadTokens()) {
      setBooting(false);
      return;
    }
    setBooting(true);
    restoreSession().finally(() => setBooting(false));
  }, [restoreSession]);

  if (booting) {
    return <div className="p-xl text-center text-sm text-text-secondary">Loading session…</div>;
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
