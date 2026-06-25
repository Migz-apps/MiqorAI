import { api } from "./client";

export type ProfileResponse = {
  id: string;
  user_id: string;
  first_name: string;
  last_name: string;
  national_id?: string | null;
  insurance_id?: string | null;
  date_of_birth: string;
  emergency_contact_name?: string | null;
  emergency_contact_phone?: string | null;
  email?: string;
  phone?: string;
};

export type PatientDashboard = {
  upcoming_appointments: Array<{
    id: string;
    scheduled_at: string;
    department?: string;
    provider?: string;
    hospital?: string;
    city?: string;
    status: string;
  }>;
  recent_activity: Array<{
    id: string;
    action: string;
    accessor: string;
    role: string;
    at: string;
  }>;
  health_insights: { summary?: string };
  quick_stats: {
    total_visits: number;
    active_prescriptions: number;
    allergies_count: number;
    conditions_count: number;
  };
};

export type MedicalRecord = {
  id: string;
  recordType: string;
  data: Record<string, unknown>;
  recordedAt: string;
};

export type AccessGrant = {
  id: string;
  name: string;
  org: string;
  scope: string;
  expires_at: string;
};

export type AccessLogItem = {
  id: string;
  action: string;
  accessor: { email: string; role: string };
  createdAt: string;
};

export type FamilyMember = {
  id: string;
  relationship: string;
  accessLevel: string;
  dependentPatient: {
    id: string;
    firstName: string;
    lastName: string;
    dateOfBirth: string;
  };
};

export type PatientSettings = {
  biometric_enabled: boolean;
  two_factor_enabled: boolean;
  notifications: Record<string, unknown>;
  language: string;
  theme: string;
};

export type EmergencyContact = {
  id: string;
  name: string;
  phone: string;
  relationship: string;
};

export type QrResponse = {
  qr_code: string;
  hash: string;
  version: number;
};

export const patientKeys = {
  profile: ["patient", "profile"] as const,
  dashboard: ["patient", "dashboard"] as const,
  records: (type?: string) => ["patient", "records", type] as const,
  grants: ["patient", "grants"] as const,
  accessLogs: ["patient", "access-logs"] as const,
  family: ["patient", "family"] as const,
  settings: ["patient", "settings"] as const,
  emergencyContacts: ["patient", "emergency-contacts"] as const,
  qr: ["patient", "qr"] as const,
  recovery: ["patient", "recovery"] as const,
};

export const patientApi = {
  profile: () => api<ProfileResponse>("/api/patient/profile"),
  updateProfile: (body: Record<string, unknown>) =>
    api<ProfileResponse>("/api/patient/profile", { method: "PUT", body: JSON.stringify(body) }),
  dashboard: () => api<PatientDashboard>("/api/patient/dashboard"),
  records: (type?: string) => {
    const q = type ? `?type=${encodeURIComponent(type)}` : "";
    return api<{ items: MedicalRecord[]; total: number }>(`/api/patient/records${q}`);
  },
  allergies: () => api<MedicalRecord[]>("/api/patient/allergies"),
  labs: () => api<Array<{ id: string; testName?: string; orderedAt?: string; status?: string }>>("/api/patient/labs"),
  accessGrants: () => api<AccessGrant[]>("/api/patient/access-grants"),
  revokeAccessGrant: (id: string) => api(`/api/patient/access-grants/${id}`, { method: "DELETE" }),
  accessLogs: () => api<{ items: AccessLogItem[]; total: number }>("/api/patient/access-logs"),
  family: () => api<FamilyMember[]>("/api/patient/family"),
  settings: () => api<PatientSettings>("/api/patient/settings"),
  updateSettings: (body: Record<string, unknown>) =>
    api<PatientSettings>("/api/patient/settings", { method: "PUT", body: JSON.stringify(body) }),
  emergencyContacts: () => api<EmergencyContact[]>("/api/patient/emergency-contacts"),
  createEmergencyContact: (body: Record<string, unknown>) =>
    api<EmergencyContact>("/api/patient/emergency-contacts", { method: "POST", body: JSON.stringify(body) }),
  deleteEmergencyContact: (id: string) => api(`/api/patient/emergency-contacts/${id}`, { method: "DELETE" }),
  qrCode: () => api<QrResponse>("/api/patient/qr-code"),
  recoveryPhrase: () => api<{ recovery_phrase?: string; phrase?: string }>("/api/patient/recovery-phrase"),
  exportData: () => api<{ download_url: string }>("/api/patient/export-data", { method: "POST", body: "{}" }),
  deleteAccount: () =>
    api("/api/patient/account", { method: "DELETE", body: JSON.stringify({ confirmation: "DELETE" }) }),
  register: (body: {
    phone: string;
    password: string;
    full_name: string;
    date_of_birth: string;
    email?: string;
  }) => api("/api/auth/register", { method: "POST", body: JSON.stringify(body) }),
};

export function profileToUser(p: ProfileResponse) {
  return {
    id: p.id,
    name: `${p.first_name} ${p.last_name}`.trim(),
    email: p.email ?? "",
    phone: p.phone ?? "",
    dob: p.date_of_birth,
    nationalId: p.national_id ?? "",
    insuranceId: p.insurance_id ?? "",
  };
}

export function timeAgo(date: string) {
  const sec = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
  if (sec < 60) return "just now";
  if (sec < 3600) return `${Math.floor(sec / 60)} minutes ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)} hours ago`;
  return `${Math.floor(sec / 86400)} days ago`;
}
