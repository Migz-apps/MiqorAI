import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

import {
  ApiError,
  type AuthTokens,
  type EmergencyContactResponse,
  type PatientAccessGrantResponse,
  type PatientAccessLogResponse,
  type PatientDashboardResponse,
  type PatientFamilyResponse,
  type PatientLabResponse,
  type PatientPrescriptionResponse,
  type PatientProfileResponse,
  type PatientRecordResponse,
  type PatientSettingsResponse,
  type QrCodeResponse,
  mobileApi,
  setSessionTokens,
} from './lib/api'

export interface PatientProfile {
  id: string
  firstName: string
  lastName: string
  dateOfBirth: string
  nationalId?: string
  insuranceId?: string
  phoneNumber: string
  email?: string
  bloodType?: string
  avatar?: string
  publicKey: string
  createdAt: string
}

export interface MedicalCondition {
  id: string
  name: string
  diagnosedDate: string
  status: 'active' | 'resolved' | 'chronic'
  notes?: string
  treatingDoctor?: string
}

export interface Medication {
  id: string
  name: string
  dosage: string
  frequency: string
  prescribedDate: string
  prescribedBy: string
  status: 'current' | 'completed' | 'discontinued'
  endDate?: string
  instructions?: string
}

export interface Allergy {
  id: string
  name: string
  severity: 'mild' | 'moderate' | 'severe'
  type: 'drug' | 'food' | 'environmental' | 'other'
  reaction?: string
  diagnosedDate: string
}

export interface LabResult {
  id: string
  testName: string
  result: string
  unit?: string
  referenceRange?: string
  date: string
  orderedBy: string
  facility: string
  status: 'normal' | 'abnormal' | 'critical'
  attachmentUrl?: string
}

export interface Immunization {
  id: string
  vaccineName: string
  dateAdministered: string
  facility: string
  administeredBy?: string
  lotNumber?: string
  nextDoseDate?: string
}

export interface Procedure {
  id: string
  name: string
  date: string
  facility: string
  surgeon?: string
  notes?: string
  status: 'scheduled' | 'completed' | 'cancelled'
}

export interface Appointment {
  id: string
  title: string
  doctorName: string
  facility: string
  dateTime: string
  type: 'checkup' | 'followup' | 'specialist' | 'emergency'
  status: 'upcoming' | 'completed' | 'cancelled'
  notes?: string
}

export interface AccessGrant {
  id: string
  providerName: string
  providerType: 'hospital' | 'clinic' | 'pharmacy' | 'laboratory' | 'doctor'
  grantedAt: string
  expiresAt: string
  lastUsed?: string
  accessLevel: 'full' | 'partial' | 'emergency'
  recordsAccessed?: string[]
}

export interface ActivityLogEntry {
  id: string
  timestamp: string
  action: 'viewed' | 'updated' | 'shared' | 'downloaded'
  provider: string
  details: string
  recordType?: string
}

export interface FamilyMember {
  id: string
  relationship: 'child' | 'spouse' | 'parent' | 'sibling' | 'other'
  profile: PatientProfile
  accessLevel: 'full' | 'caregiver' | 'view-only'
  addedAt: string
}

export interface EmergencyContact {
  id: string
  name: string
  relationship: string
  phoneNumber: string
  email?: string
  isPrimary: boolean
}

export interface HealthInsight {
  id: string
  type: 'improvement' | 'alert' | 'reminder' | 'milestone'
  title: string
  description: string
  metric?: string
  previousValue?: string
  currentValue?: string
  date: string
}

type LanguageCode = 'en' | 'rw' | 'fr'
type ThemeMode = 'light' | 'dark' | 'system'

type FamilyMemberDraft = {
  relationship: FamilyMember['relationship']
  firstName: string
  lastName: string
  dateOfBirth?: string
  phoneNumber?: string
}

interface PatientStore {
  isAuthenticated: boolean
  hasCompletedOnboarding: boolean
  biometricsEnabled: boolean
  lastUnlockTime: number | null
  profile: PatientProfile | null
  activePatient: PatientProfile | null
  conditions: MedicalCondition[]
  medications: Medication[]
  allergies: Allergy[]
  labResults: LabResult[]
  immunizations: Immunization[]
  procedures: Procedure[]
  appointments: Appointment[]
  grants: AccessGrant[]
  activityLog: ActivityLogEntry[]
  familyMembers: FamilyMember[]
  emergencyContacts: EmergencyContact[]
  healthInsights: HealthInsight[]
  activeFamilyMemberId: string | null
  isLoading: boolean
  isOnline: boolean
  offlineQueueCount: number
  lastSyncTime: string | null
  qrValue: string
  qrExpiresAt: number
  language: LanguageCode
  theme: ThemeMode
  recoveryPhrase: string | null
  authTokens: AuthTokens | null
  setAuthenticated: (value: boolean) => void
  setOnboardingComplete: (value: boolean) => void
  setBiometricsEnabled: (value: boolean) => void
  setLastUnlockTime: (value: number) => void
  setProfile: (value: PatientProfile) => void
  setActiveFamilyMember: (value: string | null) => void
  setOnlineStatus: (value: boolean) => void
  setLanguage: (value: LanguageCode) => void
  regenerateQR: () => void
  refreshDerivedState: () => void
  login: (credentials: { email: string; password: string }) => Promise<void>
  logout: () => Promise<void>
  syncRemoteData: () => Promise<void>
  updateProfile: (input: {
    firstName?: string
    lastName?: string
    phoneNumber?: string
    email?: string
  }) => Promise<void>
  grantAccess: (providerQuery: string, accessDuration: string) => Promise<void>
  revokeGrant: (grantId: string) => Promise<void>
  addFamilyMember: (value: FamilyMemberDraft) => Promise<void>
  removeFamilyMember: (id: string) => Promise<void>
  addEmergencyContact: (value: Omit<EmergencyContact, 'id'>) => Promise<void>
  removeEmergencyContact: (id: string) => Promise<void>
  requestExportData: () => Promise<string>
  deleteAccount: () => Promise<void>
  clearAllData: () => void
}

const resolveDurationDate = (value: string) => {
  const durationMs =
    {
      '24h': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000,
      '1y': 365 * 24 * 60 * 60 * 1000,
    }[value] ?? 7 * 24 * 60 * 60 * 1000

  return new Date(Date.now() + durationMs).toISOString().slice(0, 10)
}

const initialState = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  biometricsEnabled: false,
  lastUnlockTime: null,
  profile: null,
  activePatient: null,
  conditions: [] as MedicalCondition[],
  medications: [] as Medication[],
  allergies: [] as Allergy[],
  labResults: [] as LabResult[],
  immunizations: [] as Immunization[],
  procedures: [] as Procedure[],
  appointments: [] as Appointment[],
  grants: [] as AccessGrant[],
  activityLog: [] as ActivityLogEntry[],
  familyMembers: [] as FamilyMember[],
  emergencyContacts: [] as EmergencyContact[],
  healthInsights: [] as HealthInsight[],
  activeFamilyMemberId: null,
  isLoading: false,
  isOnline: true,
  offlineQueueCount: 0,
  lastSyncTime: null,
  qrValue: '',
  qrExpiresAt: 0,
  language: 'en' as LanguageCode,
  theme: 'system' as ThemeMode,
  recoveryPhrase: null,
  authTokens: null as AuthTokens | null,
}

function normalizeConditionStatus(value: unknown): MedicalCondition['status'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'resolved') return 'resolved'
  if (normalized === 'chronic') return 'chronic'
  return 'active'
}

function normalizeMedicationStatus(value: string): Medication['status'] {
  if (['dispensed', 'picked_up', 'completed', 'expired'].includes(value)) {
    return 'completed'
  }
  if (['held', 'rejected'].includes(value)) {
    return 'discontinued'
  }
  return 'current'
}

function normalizeSeverity(value: unknown): Allergy['severity'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'mild') return 'mild'
  if (normalized === 'severe') return 'severe'
  return 'moderate'
}

function normalizeAllergyType(value: unknown): Allergy['type'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'food') return 'food'
  if (normalized === 'environmental') return 'environmental'
  if (normalized === 'other') return 'other'
  return 'drug'
}

function normalizeLabStatus(input: { flag?: unknown; status?: unknown; refHigh?: unknown; resultValue?: unknown }): LabResult['status'] {
  const flag = String(input.flag ?? '').toLowerCase()
  const status = String(input.status ?? '').toLowerCase()
  if (flag === 'critical' || status === 'critical') return 'critical'
  if (flag === 'high' || flag === 'low' || status === 'abnormal') return 'abnormal'

  const resultValue = typeof input.resultValue === 'number' ? input.resultValue : Number(input.resultValue)
  const refHigh = typeof input.refHigh === 'number' ? input.refHigh : Number(input.refHigh)
  if (Number.isFinite(resultValue) && Number.isFinite(refHigh) && resultValue > refHigh) {
    return 'abnormal'
  }

  return 'normal'
}

function normalizeProcedureStatus(value: unknown): Procedure['status'] {
  const normalized = String(value ?? '').toLowerCase()
  if (normalized === 'scheduled') return 'scheduled'
  if (normalized === 'cancelled') return 'cancelled'
  return 'completed'
}

function normalizeAppointmentStatus(value: string): Appointment['status'] {
  if (value === 'completed') return 'completed'
  if (value === 'cancelled' || value === 'no_show') return 'cancelled'
  return 'upcoming'
}

function normalizeGrantAccessLevel(scope: string): AccessGrant['accessLevel'] {
  if (scope === 'full') return 'full'
  if (scope === 'emergency_only') return 'emergency'
  return 'partial'
}

function normalizeFamilyAccessLevel(value: string): FamilyMember['accessLevel'] {
  if (value === 'full') return 'full'
  if (value === 'caregiver_only') return 'caregiver'
  return 'view-only'
}

function createPatientProfile(input: PatientProfileResponse): PatientProfile {
  return {
    id: input.id,
    firstName: input.first_name,
    lastName: input.last_name,
    dateOfBirth: input.date_of_birth,
    nationalId: input.national_id ?? undefined,
    insuranceId: input.insurance_id ?? undefined,
    phoneNumber: input.phone ?? '',
    email: input.email ?? undefined,
    publicKey: input.id,
    createdAt: input.created_at ?? new Date().toISOString(),
  }
}

function mapRecordCollections(records: PatientRecordResponse[]) {
  const conditions: MedicalCondition[] = []
  const allergies: Allergy[] = []
  const immunizations: Immunization[] = []
  const procedures: Procedure[] = []
  const recordLabs: LabResult[] = []
  const recordMeds: Medication[] = []

  for (const record of records) {
    const data = record.data ?? {}

    if (record.recordType === 'diagnosis') {
      conditions.push({
        id: record.id,
        name: String(data.name ?? data.assessment ?? data.code ?? 'Diagnosis'),
        diagnosedDate: String(data.since ?? record.recordedAt),
        status: normalizeConditionStatus(data.status),
        notes: typeof data.notes === 'string' ? data.notes : typeof data.assessment === 'string' ? data.assessment : undefined,
      })
      continue
    }

    if (record.recordType === 'allergy') {
      allergies.push({
        id: record.id,
        name: String(data.name ?? data.allergen ?? 'Unknown allergy'),
        severity: normalizeSeverity(data.severity),
        type: normalizeAllergyType(data.type),
        reaction: typeof data.reaction === 'string' ? data.reaction : undefined,
        diagnosedDate: String(data.since ?? record.recordedAt),
      })
      continue
    }

    if (record.recordType === 'immunization') {
      immunizations.push({
        id: record.id,
        vaccineName: String(data.name ?? data.vaccine_name ?? 'Immunization'),
        dateAdministered: String(data.date ?? record.recordedAt),
        facility: String(data.provider ?? data.facility ?? 'Recorded in MiqorAI'),
        administeredBy: typeof data.administered_by === 'string' ? data.administered_by : undefined,
        lotNumber: typeof data.lot_number === 'string' ? data.lot_number : undefined,
        nextDoseDate: typeof data.next_dose_date === 'string' ? data.next_dose_date : undefined,
      })
      continue
    }

    if (record.recordType === 'procedure') {
      procedures.push({
        id: record.id,
        name: String(data.name ?? 'Procedure'),
        date: String(data.date ?? record.recordedAt),
        facility: String(data.provider ?? data.facility ?? 'Recorded in MiqorAI'),
        surgeon: typeof data.surgeon === 'string' ? data.surgeon : undefined,
        notes: typeof data.notes === 'string' ? data.notes : undefined,
        status: normalizeProcedureStatus(data.status),
      })
      continue
    }

    if (record.recordType === 'lab_result') {
      const resultValue = data.result ?? data.value ?? 'Pending'
      const unit = typeof data.unit === 'string' ? data.unit : undefined
      const refLow = data.ref_low
      const refHigh = data.ref_high
      recordLabs.push({
        id: record.id,
        testName: String(data.test ?? data.name ?? 'Lab result'),
        result: String(resultValue),
        unit,
        referenceRange:
          refLow != null || refHigh != null
            ? `${refLow ?? '?'} - ${refHigh ?? '?'}${unit ? ` ${unit}` : ''}`
            : undefined,
        date: String(data.date ?? record.recordedAt),
        orderedBy: 'Care team',
        facility: String(data.provider ?? data.facility ?? 'Recorded in MiqorAI'),
        status: normalizeLabStatus({
          flag: data.flag,
          resultValue,
          refHigh,
        }),
      })
      continue
    }

    if (record.recordType === 'medication') {
      recordMeds.push({
        id: record.id,
        name: String(data.name ?? 'Medication'),
        dosage: String(data.dose ?? data.dosage ?? 'As directed'),
        frequency: String(data.freq ?? data.frequency ?? 'As directed'),
        prescribedDate: String(data.since ?? record.recordedAt),
        prescribedBy: 'Care team',
        status: normalizeMedicationStatus(String(data.status ?? 'active')),
        instructions: typeof data.instructions === 'string' ? data.instructions : undefined,
      })
    }
  }

  return { conditions, allergies, immunizations, procedures, recordLabs, recordMeds }
}

function mapPrescriptions(prescriptions: PatientPrescriptionResponse[]) {
  return prescriptions.flatMap((prescription) =>
    prescription.items.map((item) => ({
      id: item.id,
      name: item.drugName,
      dosage: item.strength,
      frequency: item.frequency ?? 'As directed',
      prescribedDate: prescription.prescribedAt,
      prescribedBy: prescription.hospital?.name ?? 'Care team',
      status: normalizeMedicationStatus(prescription.status),
      endDate: item.durationDays ? new Date(new Date(prescription.prescribedAt).getTime() + item.durationDays * 86400000).toISOString() : undefined,
      instructions: item.dose,
    })),
  )
}

function readLabResultValue(results: Record<string, unknown> | null | undefined) {
  if (!results) return { result: 'Pending', unit: undefined as string | undefined }

  if (results.value != null) {
    return {
      result: String(results.value),
      unit: typeof results.unit === 'string' ? results.unit : undefined,
    }
  }

  const meaningfulEntries = Object.entries(results).filter(([key]) => !['unit', 'ref_low', 'ref_high'].includes(key))
  if (!meaningfulEntries.length) {
    return { result: 'Pending', unit: typeof results.unit === 'string' ? results.unit : undefined }
  }

  const [firstKey, firstValue] = meaningfulEntries[0]
  return {
    result: `${firstKey}: ${String(firstValue)}`,
    unit: typeof results.unit === 'string' ? results.unit : undefined,
  }
}

function mapLabs(labs: PatientLabResponse[]) {
  return labs.map((lab) => {
    const { result, unit } = readLabResultValue(lab.results)
    const refLow = lab.results?.ref_low
    const refHigh = lab.results?.ref_high
    return {
      id: lab.id,
      testName: lab.testName ?? 'Lab result',
      result,
      unit,
      referenceRange:
        refLow != null || refHigh != null
          ? `${refLow ?? '?'} - ${refHigh ?? '?'}${unit ? ` ${unit}` : ''}`
          : undefined,
      date: lab.resultsAvailableAt ?? lab.orderedAt ?? new Date().toISOString(),
      orderedBy: 'Care team',
      facility: lab.hospital?.name ?? 'Lab',
      status: normalizeLabStatus({
        status: lab.status,
        resultValue: lab.results?.value,
        refHigh,
      }),
    } satisfies LabResult
  })
}

function mapAppointments(dashboard: PatientDashboardResponse) {
  return dashboard.upcoming_appointments.map((appointment) => ({
    id: appointment.id,
    title: appointment.department || appointment.provider || 'Appointment',
    doctorName: appointment.provider || 'Care team',
    facility: appointment.hospital || appointment.city || 'Hospital',
    dateTime: appointment.scheduled_at,
    type: 'checkup' as const,
    status: normalizeAppointmentStatus(appointment.status),
  }))
}

function mapHealthInsights(dashboard: PatientDashboardResponse) {
  const summary = dashboard.health_insights?.summary?.trim()
  if (!summary) return []

  return [
    {
      id: 'insight-summary',
      type: 'reminder' as const,
      title: 'Health Insight',
      description: summary,
      date: new Date().toISOString(),
    },
  ]
}

function mapAccessGrants(grants: PatientAccessGrantResponse[]) {
  return grants.map((grant) => ({
    id: grant.id,
    providerName: grant.name,
    providerType: grant.grantee_type,
    grantedAt: grant.granted_at,
    expiresAt: grant.expires_at,
    lastUsed: grant.last_accessed_at ?? undefined,
    accessLevel: normalizeGrantAccessLevel(grant.scope),
    recordsAccessed:
      grant.scope === 'lab_results'
        ? ['labs']
        : grant.scope === 'medications'
        ? ['medications']
        : undefined,
  }))
}

function mapAccessLogs(logs: PatientAccessLogResponse[]) {
  return logs.map((entry) => ({
    id: entry.id,
    timestamp: entry.createdAt,
    action:
      entry.action === 'view_records' || entry.action === 'view_lab' || entry.action === 'view_prescription'
        ? 'viewed'
        : entry.action === 'add_record'
        ? 'updated'
        : entry.action === 'scan_qr'
        ? 'shared'
        : 'downloaded',
    provider: entry.accessor.email,
    details: entry.action.replace(/_/g, ' '),
    recordType: entry.accessor.role,
  } satisfies ActivityLogEntry))
}

function mapFamilyMembers(members: PatientFamilyResponse[]) {
  return members.map((member) => ({
    id: member.id,
    relationship: member.relationship as FamilyMember['relationship'],
    accessLevel: normalizeFamilyAccessLevel(member.accessLevel),
    addedAt: new Date().toISOString(),
    profile: {
      id: member.dependentPatient.id,
      firstName: member.dependentPatient.firstName,
      lastName: member.dependentPatient.lastName,
      dateOfBirth: member.dependentPatient.dateOfBirth,
      phoneNumber: member.dependentPatient.user?.phone ?? '',
      email: member.dependentPatient.user?.email ?? undefined,
      publicKey: member.dependentPatient.id,
      createdAt: new Date().toISOString(),
    },
  }))
}

function mapEmergencyContacts(contacts: EmergencyContactResponse[]) {
  return contacts.map((contact) => ({
    id: contact.id,
    name: contact.name,
    relationship: contact.relationship,
    phoneNumber: contact.phone,
    email: contact.email ?? undefined,
    isPrimary: Boolean(contact.isPrimary),
  }))
}

function buildQrPayload(qr: QrCodeResponse) {
  return `miqorai://patient/${qr.patient_id}?v=${qr.hash}`
}

function resolveActivePatient(state: Pick<PatientStore, 'profile' | 'familyMembers' | 'activeFamilyMemberId'>) {
  if (!state.activeFamilyMemberId) {
    return state.profile
  }

  return state.familyMembers.find((member) => member.id === state.activeFamilyMemberId)?.profile ?? state.profile
}

function toApiMessage(error: unknown) {
  if (error instanceof ApiError) {
    return error.message
  }

  if (error instanceof Error) {
    return error.message
  }

  return 'Something went wrong'
}

async function syncAllRemoteData() {
  const [profile, dashboard, records, prescriptions, labs, accessGrants, accessLogs, family, settings, emergencyContacts, qr, recovery] =
    await Promise.all([
      mobileApi.profile(),
      mobileApi.dashboard(),
      mobileApi.records(),
      mobileApi.prescriptions(),
      mobileApi.labs(),
      mobileApi.accessGrants(),
      mobileApi.accessLogs(),
      mobileApi.family(),
      mobileApi.settings(),
      mobileApi.emergencyContacts(),
      mobileApi.qrCode(),
      mobileApi.recoveryPhrase().catch(() => ({ recovery_phrase: undefined, phrase: undefined })),
    ])

  const recordCollections = mapRecordCollections(records.items)
  const prescriptionMedications = mapPrescriptions(prescriptions)
  const labResults = [...mapLabs(labs), ...recordCollections.recordLabs].reduce<LabResult[]>((acc, item) => {
    if (!acc.some((entry) => entry.id === item.id)) {
      acc.push(item)
    }
    return acc
  }, [])
  const medications = [...prescriptionMedications, ...recordCollections.recordMeds].reduce<Medication[]>((acc, item) => {
    if (!acc.some((entry) => entry.id === item.id || (entry.name === item.name && entry.prescribedDate === item.prescribedDate))) {
      acc.push(item)
    }
    return acc
  }, [])

  return {
    profile: createPatientProfile(profile),
    conditions: recordCollections.conditions,
    medications,
    allergies: recordCollections.allergies,
    labResults,
    immunizations: recordCollections.immunizations,
    procedures: recordCollections.procedures,
    appointments: mapAppointments(dashboard),
    grants: mapAccessGrants(accessGrants),
    activityLog: mapAccessLogs(accessLogs.items),
    familyMembers: mapFamilyMembers(family),
    emergencyContacts: mapEmergencyContacts(emergencyContacts),
    healthInsights: mapHealthInsights(dashboard),
    biometricsEnabled: settings.biometric_enabled,
    language: (settings.language as LanguageCode) || 'en',
    theme: (settings.theme as ThemeMode) || 'system',
    recoveryPhrase: recovery.recovery_phrase ?? recovery.phrase ?? null,
    qrValue: buildQrPayload(qr),
    qrExpiresAt: new Date(qr.generated_at).getTime() + 60_000,
    lastSyncTime: new Date().toISOString(),
  }
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setOnboardingComplete: (value) => set({ hasCompletedOnboarding: value }),
      setBiometricsEnabled: (value) => {
        set({ biometricsEnabled: value })
        if (get().isAuthenticated) {
          void mobileApi.updateSettings({ biometric_enabled: value }).catch(() => undefined)
        }
      },
      setLastUnlockTime: (value) => set({ lastUnlockTime: value }),
      setProfile: (value) =>
        set((state) => ({
          profile: value,
          activePatient: state.activeFamilyMemberId
            ? state.familyMembers.find((member) => member.id === state.activeFamilyMemberId)?.profile ?? value
            : value,
        })),
      setActiveFamilyMember: (value) =>
        set((state) => ({
          activeFamilyMemberId: value,
          activePatient: value
            ? state.familyMembers.find((member) => member.id === value)?.profile ?? state.profile
            : state.profile,
          qrValue: value ? '' : state.qrValue,
          qrExpiresAt: value ? 0 : state.qrExpiresAt,
        })),
      setOnlineStatus: (value) => set({ isOnline: value }),
      setLanguage: (value) => {
        set({ language: value })
        if (get().isAuthenticated) {
          void mobileApi.updateSettings({ language: value }).catch(() => undefined)
        }
      },
      regenerateQR: () => {
        if (get().activeFamilyMemberId) {
          return
        }

        void mobileApi.qrCode()
          .then((qr) => {
            set({
              qrValue: buildQrPayload(qr),
              qrExpiresAt: new Date(qr.generated_at).getTime() + 60_000,
            })
          })
          .catch(() => undefined)
      },
      refreshDerivedState: () =>
        set((state) => ({
          activePatient: resolveActivePatient(state),
        })),
      async login(credentials) {
        set({ isLoading: true })
        try {
          const tokens = await mobileApi.login(credentials.email, credentials.password)
          const remote = await syncAllRemoteData()
          set({
            ...remote,
            authTokens: tokens,
            isAuthenticated: true,
            hasCompletedOnboarding: true,
            activeFamilyMemberId: null,
            activePatient: remote.profile,
            isLoading: false,
            isOnline: true,
          })
        } catch (error) {
          set({ isLoading: false, isAuthenticated: false })
          throw new Error(toApiMessage(error))
        }
      },
      async logout() {
        await mobileApi.logout()
        setSessionTokens(null)
        set({
          ...initialState,
          hasCompletedOnboarding: get().hasCompletedOnboarding,
          language: get().language,
          theme: get().theme,
          biometricsEnabled: get().biometricsEnabled,
        })
      },
      async syncRemoteData() {
        if (!get().isAuthenticated) {
          return
        }

        set({ isLoading: true })
        try {
          const remote = await syncAllRemoteData()
          set((state) => ({
            ...remote,
            profile: remote.profile,
            activePatient: state.activeFamilyMemberId
              ? remote.familyMembers.find((member) => member.id === state.activeFamilyMemberId)?.profile ?? remote.profile
              : remote.profile,
            isLoading: false,
            isOnline: true,
          }))
        } catch (error) {
          set({ isLoading: false, isOnline: false })
          throw new Error(toApiMessage(error))
        }
      },
      async updateProfile(input) {
        const response = await mobileApi.updateProfile({
          ...(input.firstName ? { first_name: input.firstName } : {}),
          ...(input.lastName ? { last_name: input.lastName } : {}),
          ...(input.phoneNumber ? { phone: input.phoneNumber } : {}),
          ...(input.email ? { email: input.email } : {}),
        })

        const updated = createPatientProfile(response)
        set((state) => ({
          profile: updated,
          activePatient: state.activeFamilyMemberId ? state.activePatient : updated,
        }))
      },
      async grantAccess(providerQuery, accessDuration) {
        const providers = await mobileApi.searchProviders(providerQuery)
        const provider = providers.find((entry) => entry.name.toLowerCase() === providerQuery.trim().toLowerCase()) ?? providers[0]
        if (!provider) {
          throw new Error('No matching provider found')
        }

        await mobileApi.createAccessGrant({
          grantee_type: provider.grantee_type,
          grantee_id: provider.grantee_id,
          expires_at: resolveDurationDate(accessDuration),
        })

        const grants = await mobileApi.accessGrants()
        set({ grants: mapAccessGrants(grants) })
      },
      async revokeGrant(grantId) {
        await mobileApi.revokeAccessGrant(grantId)
        set((state) => ({
          grants: state.grants.filter((entry) => entry.id !== grantId),
        }))
      },
      async addFamilyMember(value) {
        await mobileApi.createFamilyDependent({
          name: `${value.firstName} ${value.lastName}`.trim(),
          date_of_birth: value.dateOfBirth || '2000-01-01',
          relationship: value.relationship,
          access_level: value.relationship === 'child' ? 'full' : 'caregiver_only',
        })

        const family = await mobileApi.family()
        set({ familyMembers: mapFamilyMembers(family) })
      },
      async removeFamilyMember(id) {
        await mobileApi.removeFamilyMember(id)
        set((state) => {
          const familyMembers = state.familyMembers.filter((member) => member.id !== id)
          const activeFamilyMemberId = state.activeFamilyMemberId === id ? null : state.activeFamilyMemberId
          return {
            familyMembers,
            activeFamilyMemberId,
            activePatient: activeFamilyMemberId
              ? familyMembers.find((member) => member.id === activeFamilyMemberId)?.profile ?? state.profile
              : state.profile,
          }
        })
      },
      async addEmergencyContact(value) {
        await mobileApi.createEmergencyContact({
          name: value.name,
          phone: value.phoneNumber,
          relationship: value.relationship,
          email: value.email,
          isPrimary: value.isPrimary,
        })

        const emergencyContacts = await mobileApi.emergencyContacts()
        set({ emergencyContacts: mapEmergencyContacts(emergencyContacts) })
      },
      async removeEmergencyContact(id) {
        await mobileApi.deleteEmergencyContact(id)
        set((state) => ({
          emergencyContacts: state.emergencyContacts.filter((contact) => contact.id !== id),
        }))
      },
      async requestExportData() {
        const result = await mobileApi.exportData()
        return result.download_url
      },
      async deleteAccount() {
        await mobileApi.deleteAccount()
        await mobileApi.logout().catch(() => undefined)
        setSessionTokens(null)
        set({
          ...initialState,
          hasCompletedOnboarding: false,
        })
      },
      clearAllData: () => {
        setSessionTokens(null)
        set({ ...initialState })
      },
    }),
    {
      name: 'MiqorAI-mobile-storage',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        hasCompletedOnboarding: state.hasCompletedOnboarding,
        biometricsEnabled: state.biometricsEnabled,
        lastUnlockTime: state.lastUnlockTime,
        profile: state.profile,
        conditions: state.conditions,
        medications: state.medications,
        allergies: state.allergies,
        labResults: state.labResults,
        immunizations: state.immunizations,
        procedures: state.procedures,
        appointments: state.appointments,
        grants: state.grants,
        activityLog: state.activityLog,
        familyMembers: state.familyMembers,
        emergencyContacts: state.emergencyContacts,
        healthInsights: state.healthInsights,
        activeFamilyMemberId: state.activeFamilyMemberId,
        lastSyncTime: state.lastSyncTime,
        qrValue: state.qrValue,
        qrExpiresAt: state.qrExpiresAt,
        language: state.language,
        theme: state.theme,
        recoveryPhrase: state.recoveryPhrase,
        authTokens: state.authTokens,
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) {
          return
        }

        setSessionTokens(state.authTokens ?? null)
        state.refreshDerivedState()
      },
    },
  ),
)
