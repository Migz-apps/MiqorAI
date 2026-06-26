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
import Patients from "./pages/Patients";
import PatientProfile from "./pages/PatientProfile";
import SyncQueue from "./pages/SyncQueue";
import Staff from "./pages/Staff";
import Analytics from "./pages/Analytics";
import Settings from "./pages/Settings";
import NotFound from "./pages/NotFound";
import Checkin from "./pages/Checkin";
import Waitlist from "./pages/Waitlist";
import ManualRegister from "./pages/ManualRegister";
import PrintStickers from "./pages/PrintStickers";
import Prescriptions from "./pages/Prescriptions";
import Labs from "./pages/Labs";
import Referrals from "./pages/Referrals";
import Departments from "./pages/Departments";
import Billing from "./pages/Billing";
import Reports from "./pages/Reports";
import AuditLog from "./pages/AuditLog";
import SystemHealth from "./pages/SystemHealth";

import { ErrorBoundary } from "@/components/shared/ErrorBoundary";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
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
            <Route path="/patients" element={<Patients />} />
            <Route path="/patients/:id" element={<PatientProfile />} />
            <Route path="/sync" element={<SyncQueue />} />
            <Route path="/settings" element={<Settings />} />

            {/* Reception */}
            <Route path="/checkin"   element={<RoleRoute perm="checkIn"><Checkin /></RoleRoute>} />
            <Route path="/waitlist"  element={<Waitlist />} />
            <Route path="/register"  element={<RoleRoute perm="manualRegister"><ManualRegister /></RoleRoute>} />
            <Route path="/stickers"  element={<RoleRoute perm="printSticker"><PrintStickers /></RoleRoute>} />

            {/* Clinical */}
            <Route path="/prescriptions" element={<RoleRoute perm="prescribe"><Prescriptions /></RoleRoute>} />
            <Route path="/labs"          element={<RoleRoute perm="orderLabs"><Labs /></RoleRoute>} />
            <Route path="/referrals"     element={<RoleRoute perm="addDiagnosis"><Referrals /></RoleRoute>} />

            {/* Admin / Dept Head */}
            <Route path="/staff"        element={<RoleRoute perm="manageStaff"><Staff /></RoleRoute>} />
            <Route path="/departments"  element={<RoleRoute perm="manageDepartment"><Departments /></RoleRoute>} />
            <Route path="/billing"      element={<RoleRoute perm="viewBilling"><Billing /></RoleRoute>} />
            <Route path="/reports"      element={<RoleRoute perm="viewAnalytics"><Reports /></RoleRoute>} />
            <Route path="/audit"        element={<RoleRoute perm="viewAudit"><AuditLog /></RoleRoute>} />
            <Route path="/system"       element={<RoleRoute perm="manageHospital"><SystemHealth /></RoleRoute>} />
            <Route path="/analytics"    element={<RoleRoute perm="viewAnalytics"><Analytics /></RoleRoute>} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
  </ErrorBoundary>
);

export default App;
