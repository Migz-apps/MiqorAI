import { api } from "./client";

export type DashboardResponse = {
  total_patients: number;
  total_hospitals: number;
  total_pharmacies: number;
  total_insurers: number;
  mrr: number;
  arr: number;
  total_savings: number;
  pending_approvals: number;
  open_disputes: number;
  system_health: SystemHealthResponse;
  recent_activity: ActivityEntry[];
  network_nodes: NetworkNode[];
};

export type ActivityEntry = {
  id: string;
  kind: string;
  text: string;
  actor?: string | null;
  createdAt: string;
};

export type NetworkNode = {
  id: string;
  city: string;
  country: string;
  hospitals: number;
  pharmacies: number;
  patients: number;
  mapX: number;
  mapY: number;
};

export type SystemHealthResponse = {
  api_gateway: { status: string; uptime?: number };
  database: { status: string; connections?: number };
  redis: { status: string };
  sync_queue: { pending: number };
};

export type ExtendedSystemHealth = SystemHealthResponse & {
  ml_inference?: { status: string; latency_ms?: number };
  socket_io?: { status: string; connections?: number };
  uptime_30d_pct?: number;
};

export type HospitalStat = {
  id: string;
  name: string;
  city: string;
  country: string;
  verified: boolean;
  isActive: boolean;
  pilotEndDate?: string | null;
  patient_count: number;
  total_savings: number;
  pilot_days_remaining: number | null;
};

export type PilotHospitalStat = {
  id: string;
  name: string;
  code?: string;
  city?: string;
  country?: string;
  verified: boolean;
  isActive?: boolean;
  visit_count?: number;
  patient_count?: number;
  total_savings?: number;
  pilot_days_remaining: number | null;
};

export type PharmacyStat = {
  id: string;
  name: string;
  city: string;
  licenseNumber?: string;
  registrationNumber?: string;
  verified: boolean;
  isActive: boolean;
  script_volume: number;
};

export type InsurerStat = {
  id: string;
  name: string;
  members: number;
  mrr: number;
};

export type DisputeRow = {
  id: string;
  type: string;
  description: string;
  priority: string;
  status: string;
  createdAt: string;
  patient: { firstName: string; lastName: string };
  hospital?: { name: string } | null;
  pharmacy?: { name: string } | null;
};

export type AuditLogRow = {
  id: string;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  success: boolean;
  createdAt: string;
};

export type PlatformInvoice = {
  id: string;
  customerName: string;
  period: string;
  amount: string | number;
  status: string;
  dueDate: string;
  paidAt?: string | null;
};

export type RevenueResponse = {
  mrr: number;
  arr: number;
  total_revenue: number;
  by_customer_type: Array<{
    month: string;
    insurers: number;
    hospitals: number;
    pharmacies: number;
  }>;
};

export type OnboardingRequest = {
  id: string;
  type: string;
  name: string;
  registrationRef: string;
  location?: string | null;
  submittedByEmail: string;
  createdAt: string;
  organizationId?: string | null;
};

export type EnrichedPatient = {
  id: string;
  name: string;
  email?: string;
  insurer?: string;
  visit_count: number;
  flagged: boolean;
};

export type AdminPatientSearchRow = EnrichedPatient & {
  phone?: string | null;
  national_id?: string | null;
  insurance_id?: string | null;
};

export type TransactionLedgerRow = {
  id: string;
  kind: string;
  description: string;
  amount: number;
  at: string;
};

export type HourlyMetric = {
  hour: string;
  scans: number;
  scripts: number;
};

export type PlatformSettings = {
  default_pilot_duration_days: number;
  infrastructure_fee_usd: number;
  savings_fee_percentage: number;
  invitation_expiry_days: number;
  [key: string]: unknown;
};

export type InvitationRow = {
  id: string;
  email: string;
  role: string;
  organizationId?: string | null;
  expiresAt: string;
  createdAt: string;
};

export const adminKeys = {
  dashboard: ["admin", "dashboard"] as const,
  activity: ["admin", "activity"] as const,
  pending: ["admin", "pending"] as const,
  network: ["admin", "network"] as const,
  hourly: ["admin", "hourly"] as const,
  revenue: ["admin", "revenue"] as const,
  hospitals: (status?: string) => ["admin", "hospitals", status] as const,
  hospitalsPilot: ["admin", "hospitals", "pilot"] as const,
  pharmacies: (status?: string) => ["admin", "pharmacies", status] as const,
  insurers: ["admin", "insurers"] as const,
  disputes: ["admin", "disputes"] as const,
  auditLogs: ["admin", "audit-logs"] as const,
  invoices: ["admin", "invoices"] as const,
  transactions: ["admin", "transactions"] as const,
  compliance: ["admin", "compliance"] as const,
  systemHealth: ["admin", "system-health"] as const,
  latency: ["admin", "latency"] as const,
  patients: ["admin", "patients"] as const,
  patientSearch: (query: string) => ["admin", "patients", query] as const,
  settings: ["admin", "settings"] as const,
  invitations: ["admin", "invitations"] as const,
};

export const adminApi = {
  dashboard: () => api<DashboardResponse>("/api/admin/dashboard"),
  activity: () => api<ActivityEntry[]>("/api/admin/activity"),
  pendingApprovals: () => api<OnboardingRequest[]>("/api/admin/approvals/pending"),
  network: () => api<NetworkNode[]>("/api/admin/network"),
  hourlyMetrics: () => api<HourlyMetric[]>("/api/admin/metrics/hourly"),
  revenue: (period = "month") => api<RevenueResponse>(`/api/admin/revenue?period=${period}`),
  hospitalsStats: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<{ items: HospitalStat[]; total: number }>(
      `/api/admin/hospitals/stats${qs ? `?${qs}` : ""}`,
    );
  },
  hospitalsPilotEnding: () =>
    api<{ items: PilotHospitalStat[]; total: number }>("/api/admin/hospitals/stats/pilot-ending"),
  pharmaciesStats: (params?: { status?: string; limit?: number }) => {
    const q = new URLSearchParams();
    if (params?.status) q.set("status", params.status);
    if (params?.limit) q.set("limit", String(params.limit));
    const qs = q.toString();
    return api<{ items: PharmacyStat[]; total: number }>(
      `/api/admin/pharmacies/stats${qs ? `?${qs}` : ""}`,
    );
  },
  insurersStats: () => api<InsurerStat[]>("/api/admin/insurers/stats"),
  disputes: () => api<{ items: DisputeRow[]; total: number }>("/api/admin/disputes"),
  updateDispute: (
    id: string,
    status: "investigating" | "resolved" | "rejected",
    resolutionNotes?: string,
  ) =>
    api(`/api/admin/disputes/${id}`, {
      method: "PUT",
      body: JSON.stringify({
        status,
        ...(resolutionNotes ? { resolution_notes: resolutionNotes } : {}),
      }),
    }),
  auditLogs: (limit = 100) =>
    api<{ items: AuditLogRow[]; total: number }>(`/api/admin/audit-logs?limit=${limit}`),
  invoices: () => api<PlatformInvoice[]>("/api/admin/invoices"),
  transactionsLedger: (limit = 100) =>
    api<TransactionLedgerRow[]>(`/api/admin/transactions/ledger?limit=${limit}`),
  complianceSummary: () =>
    api<{ events_today: number; failed_logins: number; data_exports: number }>(
      "/api/admin/compliance/summary",
    ),
  systemHealth: () => api<ExtendedSystemHealth>("/api/admin/system/health/extended"),
  systemLatency: () => api<Array<{ hour: number; api_ms: number }>>("/api/admin/system/latency"),
  patientsEnriched: (limit = 50) =>
    api<EnrichedPatient[]>(`/api/admin/patients/enriched?limit=${limit}`),
  searchPatients: (query: string, limit = 50) =>
    api<{ items: AdminPatientSearchRow[]; total: number }>(
      `/api/admin/patients/search?q=${encodeURIComponent(query)}&limit=${limit}`,
    ),
  setPatientStatus: (id: string, flagged: boolean) =>
    api<{ flagged: boolean }>(`/api/admin/patients/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ flagged }),
    }),
  approveOnboarding: (id: string) =>
    api<{ status: string; organization_id?: string }>(`/api/admin/onboarding/${id}/approve`, {
      method: "POST",
      body: "{}",
    }),
  rejectOnboarding: (id: string, reason: string) =>
    api<{ status: string }>(`/api/admin/onboarding/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  approveHospital: (id: string, verifiedBy: string, pilotEndDate?: string) =>
    api<{ status: string }>(`/api/admin/hospitals/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({
        verified_by: verifiedBy,
        ...(pilotEndDate ? { pilot_end_date: pilotEndDate } : {}),
      }),
    }),
  rejectHospital: (id: string, reason: string) =>
    api<{ status: string }>(`/api/admin/hospitals/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  setHospitalStatus: (id: string, status: "active" | "disabled") =>
    api(`/api/admin/hospitals/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  approvePharmacy: (id: string, verifiedBy: string) =>
    api<{ status: string }>(`/api/admin/pharmacies/${id}/approve`, {
      method: "POST",
      body: JSON.stringify({ verified_by: verifiedBy }),
    }),
  rejectPharmacy: (id: string, reason: string) =>
    api<{ status: string }>(`/api/admin/pharmacies/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason }),
    }),
  setPharmacyStatus: (id: string, status: "active" | "disabled") =>
    api(`/api/admin/pharmacies/${id}/status`, {
      method: "PUT",
      body: JSON.stringify({ status }),
    }),
  getPlatformSettings: () => api<PlatformSettings>("/api/admin/settings"),
  updatePlatformSettings: (settings: Partial<PlatformSettings>) =>
    api<PlatformSettings>("/api/admin/settings", {
      method: "PUT",
      body: JSON.stringify(settings),
    }),
  createInvitation: (body: { email: string; role: string; organization_id?: string }) =>
    api<{ invitation_id: string; invite_url: string }>("/api/admin/invite", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  listInvitations: () => api<InvitationRow[]>("/api/admin/invitations"),
  deleteInvitation: (id: string) =>
    api(`/api/admin/invitations/${id}`, {
      method: "DELETE",
    }),
  exportAudit: (body: { date_range: { start: string; end: string }; format: "csv" | "json" }) =>
    api<{ download_url: string }>("/api/admin/audit-logs/export", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  exportDashboard: () =>
    api<{ download_url: string }>("/api/admin/dashboard/export", {
      method: "POST",
      body: "{}",
    }),
  insurerReport: () =>
    api<{ download_url: string }>("/api/admin/reports/insurer", {
      method: "POST",
      body: "{}",
    }),
};
