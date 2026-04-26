import AsyncStorage from '@react-native-async-storage/async-storage'
import { create } from 'zustand'
import { createJSONStorage, persist } from 'zustand/middleware'

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
  setAuthenticated: (value: boolean) => void
  setOnboardingComplete: (value: boolean) => void
  setBiometricsEnabled: (value: boolean) => void
  setLastUnlockTime: (value: number) => void
  setProfile: (value: PatientProfile) => void
  setActiveFamilyMember: (value: string | null) => void
  setOnlineStatus: (value: boolean) => void
  regenerateQR: () => void
  refreshDerivedState: () => void
  addGrant: (value: AccessGrant) => void
  revokeGrant: (grantId: string) => void
  addFamilyMember: (value: FamilyMember) => void
  removeFamilyMember: (id: string) => void
  addActivityLog: (value: ActivityLogEntry) => void
  clearAllData: () => void
  loadMockData: () => void
}

const createId = (prefix: string) =>
  `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

const generateQRValue = (publicKey: string) => {
  const timestamp = Date.now()
  const nonce = Math.random().toString(36).slice(2, 14)

  return JSON.stringify({
    pk: publicKey,
    ts: timestamp,
    n: nonce,
    v: 1,
  })
}

const resolveActivePatient = (state: Pick<PatientStore, 'profile' | 'familyMembers' | 'activeFamilyMemberId'>) => {
  if (!state.activeFamilyMemberId) {
    return state.profile
  }

  return state.familyMembers.find((member) => member.id === state.activeFamilyMemberId)?.profile ?? state.profile
}

const createQrState = (profile: PatientProfile | null) => {
  if (!profile) {
    return {
      activePatient: null,
      qrValue: '',
      qrExpiresAt: 0,
    }
  }

  return {
    activePatient: profile,
    qrValue: generateQRValue(profile.publicKey),
    qrExpiresAt: Date.now() + 60_000,
  }
}

const initialState = {
  isAuthenticated: false,
  hasCompletedOnboarding: false,
  biometricsEnabled: false,
  lastUnlockTime: null,
  profile: null,
  activePatient: null,
  conditions: [],
  medications: [],
  allergies: [],
  labResults: [],
  immunizations: [],
  procedures: [],
  appointments: [],
  grants: [],
  activityLog: [],
  familyMembers: [],
  emergencyContacts: [],
  healthInsights: [],
  activeFamilyMemberId: null,
  isLoading: false,
  isOnline: true,
  offlineQueueCount: 0,
  lastSyncTime: null,
  qrValue: '',
  qrExpiresAt: 0,
}

export const usePatientStore = create<PatientStore>()(
  persist(
    (set, get) => ({
      ...initialState,
      setAuthenticated: (value) => set({ isAuthenticated: value }),
      setOnboardingComplete: (value) => set({ hasCompletedOnboarding: value }),
      setBiometricsEnabled: (value) => set({ biometricsEnabled: value }),
      setLastUnlockTime: (value) => set({ lastUnlockTime: value }),
      setProfile: (value) =>
        set((state) => ({
          profile: value,
          ...createQrState(state.activeFamilyMemberId ? state.activePatient : value),
        })),
      setActiveFamilyMember: (value) =>
        set((state) => ({
          activeFamilyMemberId: value,
          ...createQrState(
            value ? state.familyMembers.find((member) => member.id === value)?.profile ?? state.profile : state.profile,
          ),
        })),
      setOnlineStatus: (value) => set({ isOnline: value }),
      regenerateQR: () =>
        set((state) => {
          const profile = resolveActivePatient(state)
          if (!profile) {
            return state
          }

          return {
            qrValue: generateQRValue(profile.publicKey),
            qrExpiresAt: Date.now() + 60_000,
          }
        }),
      refreshDerivedState: () =>
        set((state) => ({
          ...createQrState(resolveActivePatient(state)),
        })),
      addGrant: (value) =>
        set((state) => ({
          grants: [...state.grants, value],
          activityLog: [
            ...state.activityLog,
            {
              id: createId('log'),
              timestamp: new Date().toISOString(),
              action: 'shared',
              provider: value.providerName,
              details: `Access granted to ${value.providerName}`,
            },
          ],
        })),
      revokeGrant: (grantId) =>
        set((state) => {
          const grant = state.grants.find((entry) => entry.id === grantId)

          return {
            grants: state.grants.filter((entry) => entry.id !== grantId),
            activityLog: grant
              ? [
                  ...state.activityLog,
                  {
                    id: createId('log'),
                    timestamp: new Date().toISOString(),
                    action: 'updated',
                    provider: grant.providerName,
                    details: `Access revoked from ${grant.providerName}`,
                  },
                ]
              : state.activityLog,
          }
        }),
      addFamilyMember: (value) =>
        set((state) => ({
          familyMembers: [...state.familyMembers, value],
        })),
      removeFamilyMember: (id) =>
        set((state) => {
          const familyMembers = state.familyMembers.filter((member) => member.id !== id)
          const activeFamilyMemberId = state.activeFamilyMemberId === id ? null : state.activeFamilyMemberId
          const activePatient = activeFamilyMemberId
            ? familyMembers.find((member) => member.id === activeFamilyMemberId)?.profile ?? state.profile
            : state.profile

          return {
            familyMembers,
            activeFamilyMemberId,
            ...createQrState(activePatient),
          }
        }),
      addActivityLog: (value) =>
        set((state) => ({
          activityLog: [...state.activityLog, value],
        })),
      clearAllData: () => set({ ...initialState }),
      loadMockData: () => {
        const profile: PatientProfile = {
          id: 'patient-001',
          firstName: 'Jean',
          lastName: 'Mugisha',
          dateOfBirth: '1988-05-15',
          nationalId: 'NID-1234567890',
          insuranceId: 'INS-2024-001',
          phoneNumber: '+250788123456',
          email: 'jean.mugisha@email.com',
          bloodType: 'O+',
          publicKey: 'ed25519:abc123def456ghi789jkl012mno345pqr678stu901vwx234yz',
          createdAt: '2024-01-15T10:00:00Z',
        }

        const conditions: MedicalCondition[] = [
          {
            id: 'cond-001',
            name: 'Type 2 Diabetes',
            diagnosedDate: '2022-03-10',
            status: 'chronic',
            notes: 'Well controlled with medication and diet',
            treatingDoctor: 'Dr. A. Nkurunziza',
          },
          {
            id: 'cond-002',
            name: 'Hypertension',
            diagnosedDate: '2023-01-20',
            status: 'active',
            notes: 'Monitoring blood pressure daily',
            treatingDoctor: 'Dr. A. Nkurunziza',
          },
          {
            id: 'cond-003',
            name: 'Malaria (uncomplicated)',
            diagnosedDate: '2026-01-15',
            status: 'resolved',
            notes: 'Treated successfully',
            treatingDoctor: 'Dr. M. Uwimana',
          },
        ]

        const medications: Medication[] = [
          {
            id: 'med-001',
            name: 'Metformin',
            dosage: '500mg',
            frequency: 'Twice daily',
            prescribedDate: '2022-03-15',
            prescribedBy: 'Dr. A. Nkurunziza',
            status: 'current',
            instructions: 'Take with meals',
          },
          {
            id: 'med-002',
            name: 'Lisinopril',
            dosage: '10mg',
            frequency: 'Once daily',
            prescribedDate: '2023-01-25',
            prescribedBy: 'Dr. A. Nkurunziza',
            status: 'current',
            instructions: 'Take in the morning',
          },
          {
            id: 'med-003',
            name: 'Artemether-Lumefantrine',
            dosage: '80/480mg',
            frequency: 'Twice daily for 3 days',
            prescribedDate: '2026-01-15',
            prescribedBy: 'Dr. M. Uwimana',
            status: 'completed',
            endDate: '2026-01-18',
            instructions: 'Complete full course',
          },
        ]

        const allergies: Allergy[] = [
          {
            id: 'allergy-001',
            name: 'Penicillin',
            severity: 'severe',
            type: 'drug',
            reaction: 'Anaphylaxis, severe rash',
            diagnosedDate: '2010-06-01',
          },
          {
            id: 'allergy-002',
            name: 'Peanuts',
            severity: 'severe',
            type: 'food',
            reaction: 'Anaphylaxis',
            diagnosedDate: '2005-01-01',
          },
          {
            id: 'allergy-003',
            name: 'Sulfa Drugs',
            severity: 'moderate',
            type: 'drug',
            reaction: 'Skin rash, itching',
            diagnosedDate: '2015-08-20',
          },
        ]

        const labResults: LabResult[] = [
          {
            id: 'lab-001',
            testName: 'HbA1c',
            result: '6.8',
            unit: '%',
            referenceRange: '< 5.7 (normal), 5.7-6.4 (prediabetes), >= 6.5 (diabetes)',
            date: '2026-01-10',
            orderedBy: 'Dr. A. Nkurunziza',
            facility: 'King Faisal Hospital',
            status: 'abnormal',
          },
          {
            id: 'lab-002',
            testName: 'Fasting Blood Glucose',
            result: '128',
            unit: 'mg/dL',
            referenceRange: '70-100 mg/dL',
            date: '2026-01-10',
            orderedBy: 'Dr. A. Nkurunziza',
            facility: 'King Faisal Hospital',
            status: 'abnormal',
          },
          {
            id: 'lab-003',
            testName: 'Complete Blood Count',
            result: 'Normal',
            date: '2026-01-15',
            orderedBy: 'Dr. M. Uwimana',
            facility: 'KNH',
            status: 'normal',
          },
          {
            id: 'lab-004',
            testName: 'Malaria RDT',
            result: 'Positive',
            date: '2026-01-15',
            orderedBy: 'Dr. M. Uwimana',
            facility: 'KNH',
            status: 'abnormal',
          },
        ]

        const immunizations: Immunization[] = [
          {
            id: 'imm-001',
            vaccineName: 'COVID-19 (Pfizer-BioNTech)',
            dateAdministered: '2021-06-15',
            facility: 'Kigali Convention Center',
            administeredBy: 'Ministry of Health',
            lotNumber: 'EL9269',
          },
          {
            id: 'imm-002',
            vaccineName: 'COVID-19 Booster (Pfizer)',
            dateAdministered: '2022-01-20',
            facility: 'King Faisal Hospital',
            lotNumber: 'FM3345',
          },
          {
            id: 'imm-003',
            vaccineName: 'Tetanus-Diphtheria (Td)',
            dateAdministered: '2023-05-10',
            facility: 'MediClinic Hospital',
            nextDoseDate: '2033-05-10',
          },
          {
            id: 'imm-004',
            vaccineName: 'Influenza (Seasonal)',
            dateAdministered: '2025-10-15',
            facility: 'MediClinic Hospital',
            nextDoseDate: '2026-10-15',
          },
        ]

        const procedures: Procedure[] = [
          {
            id: 'proc-001',
            name: 'Appendectomy',
            date: '2018-08-22',
            facility: 'King Faisal Hospital',
            surgeon: 'Dr. P. Habimana',
            status: 'completed',
            notes: 'Laparoscopic, no complications',
          },
          {
            id: 'proc-002',
            name: 'Annual Physical Examination',
            date: '2026-01-27',
            facility: 'MediClinic Hospital',
            status: 'scheduled',
          },
        ]

        const appointments: Appointment[] = [
          {
            id: 'apt-001',
            title: 'General Checkup',
            doctorName: 'Dr. A. Nkurunziza',
            facility: 'MediClinic Hospital',
            dateTime: '2026-01-27T10:30:00Z',
            type: 'checkup',
            status: 'upcoming',
          },
          {
            id: 'apt-002',
            title: 'Diabetes Follow-up',
            doctorName: 'Dr. A. Nkurunziza',
            facility: 'MediClinic Hospital',
            dateTime: '2026-02-15T14:00:00Z',
            type: 'followup',
            status: 'upcoming',
          },
        ]

        const grants: AccessGrant[] = [
          {
            id: 'grant-001',
            providerName: 'MediClinic Hospital',
            providerType: 'hospital',
            grantedAt: '2026-01-01T09:00:00Z',
            expiresAt: '2026-07-01T09:00:00Z',
            lastUsed: '2026-01-26T10:32:00Z',
            accessLevel: 'full',
          },
          {
            id: 'grant-002',
            providerName: 'GoodLife Pharmacy',
            providerType: 'pharmacy',
            grantedAt: '2026-01-10T11:00:00Z',
            expiresAt: '2026-06-15T11:00:00Z',
            lastUsed: '2026-01-15T14:20:00Z',
            accessLevel: 'partial',
            recordsAccessed: ['medications'],
          },
        ]

        const activityLog: ActivityLogEntry[] = [
          {
            id: 'log-001',
            timestamp: '2026-01-26T14:15:00Z',
            action: 'viewed',
            provider: 'KNH',
            details: 'Diagnosis: Malaria (uncomplicated)',
            recordType: 'conditions',
          },
          {
            id: 'log-002',
            timestamp: '2026-01-26T14:20:00Z',
            action: 'viewed',
            provider: 'GoodLife Pharmacy',
            details: 'Dispensed: Artemether-Lumefantrine',
            recordType: 'medications',
          },
          {
            id: 'log-003',
            timestamp: '2026-01-25T09:30:00Z',
            action: 'viewed',
            provider: 'MediClinic Hospital',
            details: 'Viewed lab results',
            recordType: 'labResults',
          },
        ]

        const familyMembers: FamilyMember[] = [
          {
            id: 'fam-001',
            relationship: 'child',
            profile: {
              id: 'patient-002',
              firstName: 'Grace',
              lastName: 'Mugisha',
              dateOfBirth: '2018-03-20',
              phoneNumber: '+250788123456',
              publicKey: 'ed25519:child123def456ghi789jkl012mno345pqr678stu901vwx234yz',
              createdAt: '2024-01-15T10:00:00Z',
            },
            accessLevel: 'full',
            addedAt: '2024-01-15T10:00:00Z',
          },
          {
            id: 'fam-002',
            relationship: 'parent',
            profile: {
              id: 'patient-003',
              firstName: 'John',
              lastName: 'Mugisha',
              dateOfBirth: '1958-11-05',
              phoneNumber: '+250788654321',
              bloodType: 'A+',
              publicKey: 'ed25519:parent123def456ghi789jkl012mno345pqr678stu901vwx234yz',
              createdAt: '2024-02-01T10:00:00Z',
            },
            accessLevel: 'caregiver',
            addedAt: '2024-02-01T10:00:00Z',
          },
        ]

        const emergencyContacts: EmergencyContact[] = [
          {
            id: 'ec-001',
            name: 'Marie Mugisha',
            relationship: 'Spouse',
            phoneNumber: '+250788111222',
            email: 'marie.mugisha@email.com',
            isPrimary: true,
          },
          {
            id: 'ec-002',
            name: 'Peter Mugisha',
            relationship: 'Brother',
            phoneNumber: '+250788333444',
            isPrimary: false,
          },
        ]

        const healthInsights: HealthInsight[] = [
          {
            id: 'insight-001',
            type: 'improvement',
            title: 'HbA1c Improving',
            description: 'Your HbA1c has improved from 7.2% to 6.8%',
            metric: 'HbA1c',
            previousValue: '7.2%',
            currentValue: '6.8%',
            date: '2026-01-10',
          },
          {
            id: 'insight-002',
            type: 'reminder',
            title: 'Flu Shot Due',
            description: 'Your annual flu vaccination is due in October',
            date: '2026-01-01',
          },
          {
            id: 'insight-003',
            type: 'milestone',
            title: '1 Year on Med-Pass',
            description: 'You have been using Med-Pass for 1 year!',
            date: '2025-01-15',
          },
        ]

        set({
          isAuthenticated: true,
          hasCompletedOnboarding: true,
          profile,
          conditions,
          medications,
          allergies,
          labResults,
          immunizations,
          procedures,
          appointments,
          grants,
          activityLog,
          familyMembers,
          emergencyContacts,
          healthInsights,
          lastSyncTime: new Date().toISOString(),
          ...createQrState(profile),
        })
      },
    }),
    {
      name: 'medpass-mobile-storage',
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
      }),
      onRehydrateStorage: () => (state) => {
        state?.refreshDerivedState()
      },
    },
  ),
)
