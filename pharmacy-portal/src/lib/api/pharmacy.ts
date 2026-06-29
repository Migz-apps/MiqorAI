import { api } from "./client";

export const pharmacyApi = {
  dashboard: () => api<Record<string, unknown>>("/api/pharmacy/dashboard"),
  prescriptions: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<{ items: unknown[]; total: number }>(`/api/pharmacy/prescriptions${q}`);
  },
  prescription: (id: string) => api<Record<string, unknown>>(`/api/pharmacy/prescription/${id}`),
  verifyPrescription: (id: string) =>
    api(`/api/pharmacy/prescription/${id}/verify`, { method: "POST", body: "{}" }),
  readyPrescription: (id: string) =>
    api(`/api/pharmacy/prescription/${id}/ready`, { method: "POST", body: "{}" }),
  holdPrescription: (id: string, reason: string, notes?: string) =>
    api(`/api/pharmacy/prescription/${id}/hold`, {
      method: "POST",
      body: JSON.stringify({ reason, notes }),
    }),
  rejectPrescription: (id: string, reason: string, notes?: string) =>
    api(`/api/pharmacy/prescription/${id}/reject`, {
      method: "POST",
      body: JSON.stringify({ reason, notes }),
    }),
  dispensePrescription: (id: string, body: Record<string, unknown>) =>
    api(`/api/pharmacy/prescription/${id}/dispense`, {
      method: "POST",
      body: JSON.stringify(body),
    }),
  inventory: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<{ items: unknown[]; total: number }>(`/api/pharmacy/inventory${q}`);
  },
  adjustInventory: (body: {
    drug_id: string;
    adjustment: number;
    reason: string;
    prescription_id?: string;
  }) =>
    api("/api/pharmacy/inventory/adjust", { method: "POST", body: JSON.stringify(body) }),
  inventoryBarcode: (barcode: string) =>
    api<Record<string, unknown>>(`/api/pharmacy/inventory/barcode/${encodeURIComponent(barcode)}`),
  patients: () => api<unknown[]>("/api/pharmacy/patients"),
  patientsSearch: (q: string) =>
    api<unknown[]>(`/api/pharmacy/patients/search?q=${encodeURIComponent(q)}`),
  patient: (id: string) => api<Record<string, unknown>>(`/api/pharmacy/patient/${id}`),
  patientAdherence: (id: string) =>
    api<Record<string, unknown>>(`/api/pharmacy/patient/${id}/adherence`),
  patientAdherenceHistory: (id: string) =>
    api<unknown[]>(`/api/pharmacy/patient/${id}/adherence/history`),
  adherence: () => api<Record<string, unknown>>("/api/pharmacy/adherence"),
  reports: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<Record<string, unknown>>(`/api/pharmacy/reports${q}`);
  },
  exportReport: (body: Record<string, unknown>) =>
    api<{ download_url: string }>("/api/pharmacy/reports/export", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  auditLogs: (params?: Record<string, string>) => {
    const q = params ? `?${new URLSearchParams(params)}` : "";
    return api<{ items: unknown[]; total: number }>(`/api/pharmacy/audit-logs${q}`);
  },
  staff: () => api<unknown[]>("/api/pharmacy/staff"),
  settings: () => api<Record<string, unknown>>("/api/pharmacy/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    api("/api/pharmacy/settings", { method: "PUT", body: JSON.stringify(body) }),
  billingReceipts: (date?: string) => {
    const q = date ? `?date=${encodeURIComponent(date)}` : "";
    return api<unknown[]>(`/api/pharmacy/billing/receipts${q}`);
  },
  exportBilling: (format: "csv" | "pdf" = "csv") =>
    api<{ download_url: string }>("/api/pharmacy/billing/export", {
      method: "POST",
      body: JSON.stringify({ format }),
    }),
  scanQr: (patient_id: string, hash: string) =>
    api<Record<string, unknown>>("/api/pharmacy/scan/qr", {
      method: "POST",
      body: JSON.stringify({ patient_id, hash }),
    }),
  adherenceRemind: (body: { patient_id: string; message: string; medication_id?: string }) =>
    api("/api/pharmacy/adherence/remind", { method: "POST", body: JSON.stringify(body) }),
};

export const syncApi = {
  queue: () => api<{ items: unknown[] }>("/api/sync/queue"),
  push: (items: unknown[]) =>
    api("/api/sync/push", { method: "POST", body: JSON.stringify({ items }) }),
  process: (id: string) => api(`/api/sync/queue/${id}/process`, { method: "POST" }),
  delete: (id: string) => api(`/api/sync/queue/${id}`, { method: "DELETE" }),
};
