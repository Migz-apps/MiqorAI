import { api } from "./client";

export const hospitalApi = {
  dashboard: () => api<Record<string, unknown>>("/api/hospital/dashboard"),
  patients: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<unknown>(`/api/hospital/patients${q}`);
  },
  patientsCensus: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<unknown[]>(`/api/hospital/patients/census${q}`);
  },
  patientsSearch: (q: string) => api<unknown>(`/api/hospital/patients/search?q=${encodeURIComponent(q)}`),
  patient: (id: string) => api<Record<string, unknown>>(`/api/hospital/patient/${id}`),
  patientSummary: (id: string) => api<Record<string, unknown>>(`/api/hospital/patient/${id}/summary`),
  patientQr: (id: string) => api<{ qr_code: string; hash: string }>(`/api/hospital/patient/${id}/qr`),
  checkinsToday: () => api<unknown>("/api/hospital/checkins/today"),
  checkin: (body: Record<string, unknown>) =>
    api("/api/hospital/checkin", { method: "POST", body: JSON.stringify(body) }),
  registerPatient: (body: Record<string, unknown>) =>
    api("/api/hospital/patient/register", { method: "POST", body: JSON.stringify(body) }),
  visitVitals: (visitId: string, body: Record<string, unknown>) =>
    api(`/api/hospital/visit/${visitId}/vitals`, { method: "POST", body: JSON.stringify(body) }),
  visitDiagnosis: (visitId: string, body: Record<string, unknown>) =>
    api(`/api/hospital/visit/${visitId}/diagnosis`, { method: "PUT", body: JSON.stringify(body) }),
  visitCheckout: (visitId: string, body: Record<string, unknown>) =>
    api(`/api/hospital/visit/${visitId}/checkout`, { method: "POST", body: JSON.stringify(body) }),
  visitStatus: (visitId: string, status: string) =>
    api(`/api/hospital/checkin/${visitId}/status`, { method: "PUT", body: JSON.stringify({ status }) }),
  visitAssign: (visitId: string, staffUserId: string) =>
    api(`/api/hospital/visit/${visitId}/assign`, { method: "PUT", body: JSON.stringify({ staff_user_id: staffUserId }) }),
  visitPriority: (visitId: string, priority: string) =>
    api(`/api/hospital/visit/${visitId}/priority`, { method: "PUT", body: JSON.stringify({ priority }) }),
  prescription: (body: Record<string, unknown>) =>
    api("/api/hospital/prescription", { method: "POST", body: JSON.stringify(body) }),
  checkAllergies: (patient_id: string, drug_names: string[]) =>
    api("/api/hospital/prescription/check-allergies", {
      method: "POST",
      body: JSON.stringify({ patient_id, drug_names }),
    }),
  labOrder: (body: Record<string, unknown>) =>
    api("/api/hospital/lab-order", { method: "POST", body: JSON.stringify(body) }),
  prescriptions: () => api<unknown[]>("/api/hospital/prescriptions"),
  labs: () => api<unknown[]>("/api/hospital/labs"),
  labTrends: (patientId?: string) =>
    api<unknown[]>(`/api/hospital/labs/trends${patientId ? `?patient_id=${patientId}` : ""}`),
  referrals: () => api<unknown[]>("/api/hospital/referrals"),
  referral: (body: Record<string, unknown>) =>
    api("/api/hospital/referral", { method: "POST", body: JSON.stringify(body) }),
  staff: () => api<unknown[]>("/api/hospital/staff/enriched"),
  staffInvite: (body: Record<string, unknown>) =>
    api("/api/hospital/staff/invite", { method: "POST", body: JSON.stringify(body) }),
  departments: () => api<unknown[]>("/api/hospital/departments"),
  createDepartment: (body: Record<string, unknown>) =>
    api("/api/hospital/departments", { method: "POST", body: JSON.stringify(body) }),
  updateDepartment: (id: string, body: Record<string, unknown>) =>
    api(`/api/hospital/departments/${id}`, { method: "PUT", body: JSON.stringify(body) }),
  deleteDepartment: (id: string) => api(`/api/hospital/departments/${id}`, { method: "DELETE" }),
  notifications: () => api<unknown[]>("/api/hospital/notifications"),
  markNotificationRead: (id: string) =>
    api(`/api/hospital/notifications/${id}/read`, { method: "PUT" }),
  markAllNotificationsRead: () =>
    api("/api/hospital/notifications/read-all", { method: "PUT" }),
  billing: () => api<Record<string, unknown>>("/api/hospital/billing"),
  invoicePdf: (id: string) => api<{ download_url: string }>(`/api/hospital/billing/invoices/${id}/pdf`),
  reports: () => api<unknown[]>("/api/hospital/reports"),
  generateReport: (body: Record<string, unknown>) =>
    api("/api/hospital/reports/generate", { method: "POST", body: JSON.stringify(body) }),
  analytics: (start?: string, end?: string) => {
    const q = new URLSearchParams();
    if (start) q.set("start_date", start);
    if (end) q.set("end_date", end);
    return api<Record<string, unknown>>(`/api/hospital/analytics?${q}`);
  },
  analyticsExtended: () => api<Record<string, unknown>>("/api/hospital/analytics/extended"),
  auditLogs: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<unknown>(`/api/hospital/audit-logs${q}`);
  },
  exportAudit: () => api<{ download_url: string }>("/api/hospital/audit-logs/export", { method: "POST", body: "{}" }),
  settings: () => api<Record<string, unknown>>("/api/hospital/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    api("/api/hospital/settings", { method: "PUT", body: JSON.stringify(body) }),
  systemHealth: () => api<Record<string, unknown>>("/api/hospital/system/health"),
  savings: () => api<Record<string, unknown>>("/api/hospital/savings"),
};

export const referenceApi = {
  icd: (q?: string) => api<unknown[]>(`/api/reference/icd${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  drugs: (q?: string) => api<unknown[]>(`/api/reference/drugs${q ? `?q=${encodeURIComponent(q)}` : ""}`),
  interactions: (drugs: string[]) =>
    api("/api/reference/drug-interactions", { method: "POST", body: JSON.stringify({ drugs }) }),
  pharmacies: () => api<unknown[]>("/api/reference/pharmacies"),
};

export const syncApi = {
  queue: () => api<{ items: unknown[] }>("/api/sync/queue"),
  push: (items: unknown[]) =>
    api("/api/sync/push", { method: "POST", body: JSON.stringify({ items }) }),
  process: (id: string) => api(`/api/sync/queue/${id}/process`, { method: "POST" }),
  delete: (id: string) => api(`/api/sync/queue/${id}`, { method: "DELETE" }),
  resolve: (id: string, resolution = "client") =>
    api(`/api/sync/queue/${id}/resolve`, { method: "POST", body: JSON.stringify({ resolution }) }),
};

export const scanApi = {
  qr: (patient_id: string, hash: string) =>
    api("/api/scan/qr", { method: "POST", body: JSON.stringify({ patient_id, hash, context: "hospital" }) }),
};
