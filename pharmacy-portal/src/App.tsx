import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, Navigate } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/layout/AppLayout";
import { ProtectedRoute } from "@/components/layout/ProtectedRoute";
import { RoleRoute } from "@/components/layout/RoleRoute";

import Login from "./pages/Login";
import Signup from "./pages/Signup";
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
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/scan" element={<RoleRoute perm="scanQR"><Scan /></RoleRoute>} />

            <Route path="/prescriptions" element={<Prescriptions />} />
            <Route path="/prescriptions/:id" element={<PrescriptionDetail />} />

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
);

export default App;
