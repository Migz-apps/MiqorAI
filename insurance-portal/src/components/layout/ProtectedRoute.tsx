import { useEffect } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useAuth(s => s.session);
  const ready = useAuth(s => s.ready);
  const restoreSession = useAuth(s => s.restoreSession);

  useEffect(() => {
    void restoreSession();
  }, [restoreSession]);

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-muted-foreground text-sm">
        Restoring session…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};
