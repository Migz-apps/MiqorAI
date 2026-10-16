import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@miqorai/ui/sonner";
import { TooltipProvider } from "@miqorai/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RoleRoute } from "@/components/layout/RoleRoute";
import { ErrorBoundary } from "@miqorai/ui/error-boundary";
import { logoutApi } from "@/lib/api/client";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AcceptInvite from "./pages/AcceptInvite";
import Dashboard from "./pages/Dashboard";
import Scan from "./pages/Scan";
import Prescriptions from "./pages/Prescriptions";
import PrescriptionDetail from "./pages/PrescriptionDetail";
import Inventory from "./pages/Inventory";
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import Adherence from "./pages/Adherence";
import Reports from "./pages/Reports";
import Billing from "./pages/Billing";
import Staff from "./pages/Staff";
import AuditLog from "./pages/AuditLog";
import SyncQueue from "./pages/SyncQueue";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary appName="pharmacy portal" storageKeys={["MiqorAI-pharmacy-auth"]} onSignOut={logoutApi}>
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner infoClassName="group-[.toast]:border-pharmacy/20 group-[.toast]:bg-pharmacy-light/60" />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/accept-invite" element={<AcceptInvite />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<RoleRoute perm="scanQR"><Scan /></RoleRoute>} />

            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/prescriptions/:id" element={<RoleRoute perm="viewRxDetails"><PrescriptionDetail /></RoleRoute>} />

            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientProfile />} />

            <Route path="/adherence" element={<RoleRoute perm="viewAnalytics"><Adherence /></RoleRoute>} />
            <Route path="/inventory" element={<RoleRoute perm="manageInventory"><Inventory /></RoleRoute>} />
            <Route path="/billing" element={<RoleRoute perm="viewBilling"><Billing /></RoleRoute>} />
            <Route path="/reports" element={<RoleRoute perm="viewAnalytics"><Reports /></RoleRoute>} />
            <Route path="/staff" element={<RoleRoute perm="manageStaff"><Staff /></RoleRoute>} />
            <Route path="/audit" element={<RoleRoute perm="viewAudit"><AuditLog /></RoleRoute>} />
            <Route path="/settings" element={<RoleRoute perm="manageSettings"><Settings /></RoleRoute>} />
            <Route path="/sync" element={<SyncQueue />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
