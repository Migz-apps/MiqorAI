import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { useAuth } from "@/store/auth";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RoleRoute } from "@/components/layout/RoleRoute";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Savings from "./pages/Savings";
import Adherence from "./pages/Adherence";
import Fraud from "./pages/Fraud";
import Members from "./pages/Members";
import Reports from "./pages/Reports";
import Contract from "./pages/Contract";
import Staff from "./pages/Staff";
import AuditLog from "./pages/AuditLog";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const SessionRestore = () => {
  const restoreSession = useAuth((s) => s.restoreSession);
  useEffect(() => { void restoreSession(); }, [restoreSession]);
  return null;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <SessionRestore />
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/savings"   element={<RoleRoute perm="viewSavings"><Savings /></RoleRoute>} />
            <Route path="/adherence" element={<RoleRoute perm="viewAdherence"><Adherence /></RoleRoute>} />
            <Route path="/fraud"     element={<RoleRoute perm="viewFraud"><Fraud /></RoleRoute>} />
            <Route path="/members"   element={<Members />} />
            <Route path="/reports"   element={<RoleRoute perm="runReports"><Reports /></RoleRoute>} />
            <Route path="/contract"  element={<RoleRoute perm="viewContract"><Contract /></RoleRoute>} />
            <Route path="/staff"     element={<RoleRoute perm="manageStaff"><Staff /></RoleRoute>} />
            <Route path="/audit"     element={<RoleRoute perm="viewAudit"><AuditLog /></RoleRoute>} />
            <Route path="/settings"  element={<RoleRoute perm="manageSettings"><Settings /></RoleRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
