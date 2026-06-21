import { Navigate } from "react-router-dom";
import { useAuth, can, type PermKey } from "@/store/auth";

export const RoleRoute = ({ perm, children }: { perm: PermKey; children: React.ReactNode }) => {
  const session = useAuth(s => s.session);
  if (!session) return <Navigate to="/login" replace />;
  if (!can(session.role, perm)) return <Navigate to="/dashboard" replace />;
  return <>{children}</>;
};
