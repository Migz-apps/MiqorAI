import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useAuth((s) => s.session);
  const restoreSession = useAuth((s) => s.restoreSession);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    restoreSession().finally(() => setReady(true));
  }, [restoreSession]);

  if (!ready) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
