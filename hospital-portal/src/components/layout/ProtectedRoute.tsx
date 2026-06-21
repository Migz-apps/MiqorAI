import { Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";

export const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const session = useAuth(s => s.session);
  if (!session) return <Navigate to="/login" replace />;
  // Session timeout 8h
  if (Date.now() - session.loggedInAt > 8 * 60 * 60 * 1000) {
    useAuth.getState().logout();
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};
