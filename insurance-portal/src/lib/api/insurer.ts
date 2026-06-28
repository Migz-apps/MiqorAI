import { api } from "./client";
import type {
  Alert,
  AuditEntry,
  FlaggedClaim,
  Invoice,
  MedicationAdherence,
  NonAdherent,
  Provider,
  Role,
  SavingsRecord,
  Staff,
} from "@/lib/types";

export const insurerKeys = {
  dashboard: ["insurer", "dashboard"] as const,
  savings: (start?: string, end?: string) => ["insurer", "savings", start, end] as const,
  savingsRecords: ["insurer", "savings-records"] as const,
  adherence: ["insurer", "adherence"] as const,
  fraud: (days?: number) => ["insurer", "fraud", days] as const,
  providers: ["insurer", "providers"] as const,
  members: (search?: string) => ["insurer", "members", search] as const,
  memberStats: ["insurer", "member-stats"] as const,
  contract: ["insurer", "contract"] as const,
  invoices: ["insurer", "invoices"] as const,
  contractUsage: ["insurer", "contract-usage"] as const,
  staff: ["insurer", "staff"] as const,
  auditLogs: ["insurer", "audit-logs"] as const,
  alerts: ["insurer", "alerts"] as const,
  reports: ["insurer", "reports"] as const,
  settings: ["insurer", "settings"] as const,
  apiKeys: ["insurer", "api-keys"] as const,
};

export type DashboardResponse = {
  total_savings: number;
  members_covered: number;
  adherence_rate: number;
  roi: number;
  savings_trend: Array<{ category: string; savings: number; count: number }>;
  top_hospitals: Array<{ name: string; anomaly_score: number; flagged: number }>;
  top_medications: Array<{ type: string; count: number }>;
  fee: number;
  duplicate_tests_prevented: number;
  flagged_claims: number;
};

export type SavingsResponse = {
  gross_savings: number;
  medpass_fee: number;
  net_savings: number;
  duplicate_tests_prevented: number;
  breakdown_by_test_type: Record<string, number>;
  breakdown_by_hospital: Array<{ name: string; savings: number }>;
};

export type AdherenceResponse = {
  overall_rate: number;
  by_medication: Array<{ medication: string; rate: number; patients: number }>;
  non_adherent_patients: Array<{
    patient_id: string;
    name: string;
    adherence_rate: number;
    phone?: string;
  }>;
  estimated_savings: number;
};

export type FraudResponse = {
  high_risk: number;
  medium_risk: number;
  low_risk: number;
  flagged_claims: Array<{
    id: string;
    patient_id: string;
    provider: string;
    amount: number;
    score: number;
    pattern: string;
    status: string;
  }>;
};

export type MemberStatsResponse = {
  active_this_month: number;
  total_members: number;
  new_enrollments: number;
  high_risk_cohort: number;
};

export type EnrichedMember = {
  member_number: string;
  patient_id: string;
  name: string;
  age: number;
  plan_tier: string;
  active_medications: string[];
  adherence_rate: number;
  risk_band: string;
  phone?: string;
};

export type ContractResponse = {
  contract_id: string | null;
  start_date: string | Date;
  end_date: string | Date;
  fee_percentage: number;
  status: string;
  terms?: unknown;
};

export type ContractUsageResponse = {
  members_enrolled: number;
  member_allowance: number;
  api_calls_30d: number;
  api_call_limit: number;
  storage_used_mb: number;
  storage_limit_mb: number;
  fee_percentage: number;
};

export type ApiKeyRow = {
  id: string;
  label: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

export type ReportHistoryRow = {
  id: string;
  title: string;
  format: string;
  downloadUrl: string;
  createdAt: string;
  createdBy: string | null;
};

const STAFF_ROLE_MAP: Record<string, Role> = {
  analyst: "analyst",
  fraud_investigator: "fraud",
  contracts_manager: "contracts",
  executive: "executive",
  admin: "admin",
};

export function mapStaffRole(role: string): Role {
  return STAFF_ROLE_MAP[role] ?? "analyst";
}

function dateStr(d: string | Date): string {
  return typeof d === "string" ? d.slice(0, 10) : d.toISOString().slice(0, 10);
}

export function mapSavingsRecord(r: {
  id: string;
  patientId: string;
  testType: string;
  category: string;
  firstTestDate: string | Date;
  firstProvider: string;
  attemptedDate: string | Date;
  attemptedProvider: string;
  preventionMethod: string;
  savings: number | string;
  createdAt: string | Date;
}): SavingsRecord {
  return {
    id: r.id,
    patientId: r.patientId.slice(0, 8).toUpperCase(),
    testType: r.testType,
    category: r.category as SavingsRecord["category"],
    firstTestDate: dateStr(r.firstTestDate),
    firstProvider: r.firstProvider,
    attemptedDate: dateStr(r.attemptedDate),
    attemptedProvider: r.attemptedProvider,
    preventionMethod: r.preventionMethod,
    savings: Number(r.savings),
    timestamp: typeof r.createdAt === "string" ? r.createdAt : r.createdAt.toISOString(),
  };
}

export function mapAlert(a: {
  id: string;
  severity: string;
  title: string;
  message: string;
  createdAt: string | Date;
  category: string;
}): Alert {
  return {
    id: a.id,
    severity: a.severity as Alert["severity"],
    title: a.title,
    message: a.message,
    timestamp: typeof a.createdAt === "string" ? a.createdAt : a.createdAt.toISOString(),
    category: a.category as Alert["category"],
  };
}

export function mapFlaggedClaim(c: FraudResponse["flagged_claims"][number], idx: number): FlaggedClaim {
  return {
    id: c.id.slice(0, 8).toUpperCase(),
    patientId: c.patient_id.slice(0, 8).toUpperCase(),
    patientName: `Patient ${idx + 1}`,
    provider: c.provider,
    amount: c.amount,
    score: c.score,
    pattern: c.pattern,
    status: c.status as FlaggedClaim["status"],
  };
}

export function mapProvider(p: {
  providerName: string;
  totalClaims: number;
  anomalyScore: number;
  flaggedCount: number;
}): Provider {
  return {
    name: p.providerName,
    totalClaims: p.totalClaims,
    anomalyScore: p.anomalyScore,
    flagged: p.flaggedCount,
  };
}

export function mapInvoice(inv: {
  id: string;
  period: string;
  gross_savings: number;
  fee: number;
  status: string;
  due_date: string | Date;
  paid_at?: string | Date | null;
}): Invoice {
  return {
    id: inv.id.slice(0, 12).toUpperCase(),
    sourceId: inv.id,
    period: inv.period,
    grossSavings: inv.gross_savings,
    fee: inv.fee,
    status: inv.status as Invoice["status"],
    dueDate: dateStr(inv.due_date),
    paidDate: inv.paid_at ? dateStr(inv.paid_at) : undefined,
  };
}

export function mapStaffRow(s: {
  id: string;
  email: string;
  role: string;
  active: boolean;
  last_login: string | Date | null;
}): Staff {
  const local = s.email.split("@")[0].replace(/[._]/g, " ");
  const name = local.replace(/\b\w/g, (c) => c.toUpperCase());
  return {
    id: s.id,
    name,
    email: s.email,
    role: mapStaffRole(s.role),
    active: s.active,
    lastLogin: s.last_login
      ? typeof s.last_login === "string"
        ? s.last_login
        : s.last_login.toISOString()
      : new Date(0).toISOString(),
  };
}

export function mapMedication(m: { medication: string; rate: number; patients: number }): MedicationAdherence {
  return {
    medication: m.medication,
    rate: m.rate,
    patients: m.patients,
    trend: 0,
    alert: m.rate < 75,
  };
}

export function mapNonAdherent(p: AdherenceResponse["non_adherent_patients"][number]): NonAdherent {
  const daysOverdue = Math.max(1, Math.round((75 - p.adherence_rate) / 3));
  return {
    patientId: p.patient_id.slice(0, 8).toUpperCase(),
    name: p.name,
    medication: "Multiple",
    daysOverdue,
    phone: p.phone ?? "—",
  };
}

export function mapAuditEntry(e: {
  id: string;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  ipAddress?: string | null;
  createdAt: string | Date;
}): AuditEntry {
  return {
    id: e.id.slice(0, 8).toUpperCase(),
    user: e.userEmail ?? "System",
    role: "analyst",
    action: e.action.replace(/_/g, " "),
    resource: e.resourceId ? `${e.resourceType} ${e.resourceId.slice(0, 8)}` : e.resourceType,
    ip: e.ipAddress ?? "—",
    timestamp: typeof e.createdAt === "string" ? e.createdAt : e.createdAt.toISOString(),
  };
}

export const insurerApi = {
  dashboard: () => api<DashboardResponse>("/api/insurer/dashboard"),
  savings: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set("start_date", start);
    if (end) q.set("end_date", end);
    const qs = q.toString();
    return api<SavingsResponse>(`/api/insurer/savings${qs ? `?${qs}` : ""}`);
  },
  savingsRecords: () => api<Array<Parameters<typeof mapSavingsRecord>[0]>>("/api/insurer/savings/records"),
  adherence: () => api<AdherenceResponse>("/api/insurer/adherence"),
  fraud: (days = 7) => api<FraudResponse>(`/api/insurer/fraud/anomalies?days=${days}`),
  providers: () =>
    api<Array<{ providerName: string; totalClaims: number; anomalyScore: number; flaggedCount: number }>>(
      "/api/insurer/providers/risk",
    ),
  members: (search?: string) => {
    const q = search ? `?search=${encodeURIComponent(search)}` : "";
    return api<EnrichedMember[]>(`/api/insurer/members/enriched${q}`);
  },
  memberStats: () => api<MemberStatsResponse>("/api/insurer/members/stats"),
  contract: () => api<ContractResponse>("/api/insurer/contract"),
  invoices: () =>
    api<
      Array<{
        id: string;
        period: string;
        gross_savings: number;
        fee: number;
        status: string;
        due_date: string;
        paid_at?: string | null;
      }>
    >("/api/insurer/invoices"),
  contractUsage: () => api<ContractUsageResponse>("/api/insurer/contract/usage"),
  staff: () =>
    api<Array<{ id: string; email: string; role: string; active: boolean; last_login: string | null }>>(
      "/api/insurer/staff",
    ),
  auditLogs: (limit = 50) =>
    api<{ items: Parameters<typeof mapAuditEntry>[0][]; total: number }>(
      `/api/insurer/audit-logs?limit=${limit}`,
    ),
  alerts: () => api<Array<Parameters<typeof mapAlert>[0]>>("/api/insurer/alerts"),
  reportHistory: () => api<ReportHistoryRow[]>("/api/insurer/reports/history"),
  generateReport: (body: {
    date_range: { start: string; end: string };
    metrics: string[];
    format: "pdf" | "csv" | "excel";
  }) => api<{ report_url: string }>("/api/insurer/reports/generate", { method: "POST", body: JSON.stringify(body) }),
  settings: () => api<Record<string, unknown>>("/api/insurer/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    api("/api/insurer/settings", { method: "PUT", body: JSON.stringify(body) }),
  apiKeys: () => api<ApiKeyRow[]>("/api/insurer/api-keys"),
  createApiKey: (label: string) =>
    api<{ id: string; api_key: string; key_prefix: string }>("/api/insurer/api-keys", {
      method: "POST",
      body: JSON.stringify({ label }),
    }),
  rotateApiKey: (id: string) => api(`/api/insurer/api-keys/${id}/rotate`, { method: "POST", body: "{}" }),
  exportSavings: (format: "csv" | "pdf") =>
    api<{ download_url: string }>("/api/insurer/savings/export", {
      method: "POST",
      body: JSON.stringify({ format }),
    }),
  exportAdherence: () =>
    api<{ download_url: string }>("/api/insurer/adherence/export", { method: "POST", body: "{}" }),
  exportFraud: () => api<{ download_url: string }>("/api/insurer/fraud/export", { method: "POST", body: "{}" }),
  exportMembers: () => api<{ download_url: string }>("/api/insurer/members/export"),
  contractPdf: () => api<{ download_url: string }>("/api/insurer/contract/pdf"),
  invoicePdf: (id: string) => api<{ download_url: string }>(`/api/insurer/invoices/${id}/pdf`),
};
