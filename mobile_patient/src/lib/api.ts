import { Platform } from 'react-native'

export type AuthTokens = {
  access_token: string
  refresh_token: string
}

export type PatientProfileResponse = {
  id: string
  user_id: string
  first_name: string
  last_name: string
  national_id?: string | null
  insurance_id?: string | null
  date_of_birth: string
  emergency_contact_name?: string | null
  emergency_contact_phone?: string | null
  email?: string | null
  phone?: string | null
  created_at?: string
  updated_at?: string
}

export type PatientDashboardResponse = {
  upcoming_appointments: Array<{
    id: string
    scheduled_at: string
    department?: string | null
    provider?: string | null
    hospital?: string | null
    city?: string | null
    status: string
  }>
  recent_activity: Array<{
    id: string
    action: string
    accessor: string
    role: string
    at: string
  }>
  health_insights?: {
    summary?: string
  }
  quick_stats?: {
    total_visits: number
    active_prescriptions: number
    allergies_count: number
    conditions_count: number
  }
}

export type PatientRecordResponse = {
  id: string
  recordType: string
  data: Record<string, unknown>
  recordedAt: string
}

export type PatientPrescriptionResponse = {
  id: string
  prescribedAt: string
  prescribedBy: string
  status: string
  notes?: string | null
  hospital?: { id: string; name: string } | null
  pharmacy?: { id: string; name: string } | null
  items: Array<{
    id: string
    drugName: string
    strength: string
    dose: string
    frequency?: string | null
    durationDays: number
  }>
}

export type PatientLabResponse = {
  id: string
  testName?: string
  testCode?: string | null
  orderedAt?: string
  resultsAvailableAt?: string | null
  status?: string
  results?: Record<string, unknown> | null
  hospital?: { id: string; name: string } | null
}

export type PatientAccessGrantResponse = {
  id: string
  grantee_type: 'hospital' | 'clinic' | 'pharmacy' | 'laboratory' | 'doctor'
  grantee_id: string
  name: string
  org: string
  scope: string
  granted_at: string
  expires_at: string
  last_accessed_at?: string | null
}

export type PatientAccessLogResponse = {
  id: string
  action: string
  accessor: { email: string; role: string }
  createdAt: string
}

export type PatientFamilyResponse = {
  id: string
  relationship: string
  accessLevel: string
  dependentPatient: {
    id: string
    firstName: string
    lastName: string
    dateOfBirth: string
    user?: {
      phone?: string | null
      email?: string | null
    }
  }
}

export type PatientSettingsResponse = {
  biometric_enabled: boolean
  two_factor_enabled: boolean
  notifications: Record<string, unknown>
  language: string
  theme: string
}

export type EmergencyContactResponse = {
  id: string
  name: string
  phone: string
  relationship: string
  email?: string | null
  isPrimary?: boolean
}

export type QrCodeResponse = {
  qr_code: string
  patient_id: string
  hash: string
  version: number
  generated_at: string
}

export type ProviderSearchResult = {
  grantee_type: 'hospital' | 'pharmacy' | 'doctor'
  grantee_id: string
  name: string
  org: string
  city?: string | null
}

export class ApiError extends Error {
  status: number
  body?: unknown

  constructor(status: number, message: string, body?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.body = body
  }
}

const defaultApiUrl =
  Platform.OS === 'android'
    ? 'http://10.0.2.2:3000'
    : 'http://localhost:3000'

const API_URL = (process.env.EXPO_PUBLIC_API_URL ?? defaultApiUrl).replace(/\/$/, '')

let sessionTokens: AuthTokens | null = null

export function setSessionTokens(tokens: AuthTokens | null) {
  sessionTokens = tokens
}

export function getSessionTokens() {
  return sessionTokens
}

function buildHeaders(init?: RequestInit) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(init?.headers as Record<string, string> | undefined),
  }

  if (sessionTokens?.access_token) {
    headers.Authorization = `Bearer ${sessionTokens.access_token}`
  }

  return headers
}

async function refreshAccessToken() {
  if (!sessionTokens?.refresh_token) {
    return false
  }

  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refresh_token: sessionTokens.refresh_token }),
  })

  if (!response.ok) {
    return false
  }

  const data = (await response.json()) as { access_token: string }
  sessionTokens = {
    ...sessionTokens,
    access_token: data.access_token,
  }
  return true
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const makeRequest = () =>
    fetch(`${API_URL}${path}`, {
      ...init,
      headers: buildHeaders(init),
    })

  let response = await makeRequest()

  if (response.status === 401 && sessionTokens?.refresh_token) {
    const refreshed = await refreshAccessToken()
    if (refreshed) {
      response = await makeRequest()
    }
  }

  if (!response.ok) {
    const body = await response.json().catch(() => ({}))
    const message =
      (body as { error?: { message?: string } })?.error?.message ??
      response.statusText ??
      'Request failed'
    throw new ApiError(response.status, message, body)
  }

  if (response.status === 204) {
    return undefined as T
  }

  return (await response.json()) as T
}

export const mobileApi = {
  apiUrl: API_URL,
  async login(email: string, password: string) {
    setSessionTokens(null)
    const data = await request<AuthTokens>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    })
    setSessionTokens(data)
    return data
  },
  async logout() {
    const tokens = getSessionTokens()
    if (tokens?.refresh_token) {
      await request('/api/auth/logout', {
        method: 'POST',
        body: JSON.stringify({ refresh_token: tokens.refresh_token }),
      }).catch(() => undefined)
    }
    setSessionTokens(null)
  },
  profile: () => request<PatientProfileResponse>('/api/patient/profile'),
  updateProfile: (body: Record<string, unknown>) =>
    request<PatientProfileResponse>('/api/patient/profile', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  dashboard: () => request<PatientDashboardResponse>('/api/patient/dashboard'),
  records: () => request<{ items: PatientRecordResponse[]; total: number }>('/api/patient/records'),
  prescriptions: () => request<PatientPrescriptionResponse[]>('/api/patient/prescriptions'),
  labs: () => request<PatientLabResponse[]>('/api/patient/labs'),
  accessGrants: () => request<PatientAccessGrantResponse[]>('/api/patient/access-grants'),
  accessLogs: () => request<{ items: PatientAccessLogResponse[]; total: number }>('/api/patient/access-logs'),
  family: () => request<PatientFamilyResponse[]>('/api/patient/family'),
  settings: () => request<PatientSettingsResponse>('/api/patient/settings'),
  updateSettings: (body: Record<string, unknown>) =>
    request<PatientSettingsResponse>('/api/patient/settings', {
      method: 'PUT',
      body: JSON.stringify(body),
    }),
  emergencyContacts: () => request<EmergencyContactResponse[]>('/api/patient/emergency-contacts'),
  createEmergencyContact: (body: Record<string, unknown>) =>
    request<EmergencyContactResponse>('/api/patient/emergency-contacts', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  deleteEmergencyContact: (id: string) =>
    request(`/api/patient/emergency-contacts/${id}`, {
      method: 'DELETE',
    }),
  qrCode: () => request<QrCodeResponse>('/api/patient/qr-code'),
  recoveryPhrase: () => request<{ recovery_phrase?: string; phrase?: string }>('/api/patient/recovery-phrase'),
  exportData: () =>
    request<{ download_url: string }>('/api/patient/export-data', {
      method: 'POST',
      body: '{}',
    }),
  deleteAccount: () =>
    request('/api/patient/account', {
      method: 'DELETE',
      body: JSON.stringify({ confirmation: 'DELETE' }),
    }),
  searchProviders: (query: string) =>
    request<ProviderSearchResult[]>(`/api/patient/providers/search?q=${encodeURIComponent(query)}`),
  createAccessGrant: (body: Record<string, unknown>) =>
    request('/api/patient/access-grants', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  revokeAccessGrant: (id: string) =>
    request(`/api/patient/access-grants/${id}`, {
      method: 'DELETE',
    }),
  createFamilyDependent: (body: Record<string, unknown>) =>
    request('/api/patient/family/dependents', {
      method: 'POST',
      body: JSON.stringify(body),
    }),
  removeFamilyMember: (id: string) =>
    request(`/api/patient/family/${id}`, {
      method: 'DELETE',
    }),
}
