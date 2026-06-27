export type Role = "receptionist" | "nurse" | "doctor" | "dept_head" | "admin";

export type Department =
  | "General"
  | "Cardiology"
  | "Pediatrics"
  | "Maternity"
  | "Emergency"
  | "Lab"
  | "Pharmacy";

export type Priority = "normal" | "urgent" | "emergency";

export type Allergy = { name: string; severity: "mild" | "moderate" | "severe" };

export type Vital = {
  recordedAt: string;
  bp?: string; hr?: number; temp?: number; spo2?: number; weight?: number; height?: number;
  recordedBy?: string;
};

export type Visit = {
  id: string;
  date: string;
  type: "Consultation" | "Lab" | "Follow-up" | "Emergency" | "Vaccination";
  provider: string;
  diagnosis?: string;
  notes?: string;
  vitals?: Vital;
  status: "completed" | "draft" | "in-progress";
};

export type Prescription = {
  id: string;
  medication: string;
  dosage: string;
  frequency: string;
  duration: string;
  prescribedBy: string;
  date: string;
  pharmacy: string;
  status: "active" | "filled" | "expired" | "pending";
};

export type LabOrder = {
  id: string; test: string; orderedBy: string; date: string;
  status: "ordered" | "in-progress" | "completed";
  result?: string;
  numericResult?: number;
  unit?: string;
  refLow?: number;
  refHigh?: number;
};

export type Patient = {
  id: string;
  name: string;
  dob: string;
  gender: "M" | "F" | "Other";
  phone: string;
  emergencyContact: string;
  bloodType: string;
  allergies: Allergy[];
  conditions: string[];
  visits: Visit[];
  prescriptions: Prescription[];
  labs: LabOrder[];
  upcomingAppointments: { date: string; reason: string; provider: string }[];
  insuranceProvider?: string;
  nationalId?: string;
  lastVisit?: string;
  checkedInAt?: string;
  photoUrl?: string;
  height?: number;
  weight?: number;
  bmi?: number;
  myPrescriptionsCount?: number;
  myPrescriptionMedications?: string[];
  myLastPrescribedAt?: string;
  hasActiveDraft?: boolean;
  activeDraftId?: string;
  activeDraftUpdatedAt?: string;
  openVisitId?: string;
  openVisitStatus?: string;
};

export type ClinicalFlags = {
  highRisk: boolean;
  fallRisk: boolean;
  seizureHistory: boolean;
  bleedingDisorder: boolean;
  immunocompromised: boolean;
  isolationPrecautions?: string;
};

export type PatientSafetyProfile = {
  patientId: string;
  name: string;
  dob: string;
  age: number;
  sex: Patient["gender"];
  bloodGroup: string;
  height?: number;
  weight?: number;
  bmi?: number;
  emergencyContact: string;
  insuranceProvider?: string;
  criticalMedicalInfo: string[];
  drugAllergies: string[];
  foodAllergies: string[];
  otherAllergies: string[];
  chronicDiseases: string[];
  activeConditions: string[];
  currentMedications: string[];
  pregnancyStatus?: string;
  transplantStatus?: string;
  implantableDevices: string[];
  codeStatus?: string;
  clinicalFlags: ClinicalFlags;
};

export type VisitDraftPrescription = {
  id: string;
  medication: string;
  strength: string;
  instructions: string;
  frequency: string;
  duration: string;
  durationDays: number;
  quantity: number;
  pharmacyId?: string | null;
  pharmacyName?: string;
};

export type VisitDraftState = {
  chief: string;
  symptoms: string;
  assessment: string;
  duration: string;
  severity: string;
  bp: string;
  hr: string;
  temp: string;
  spo2: string;
  height: string;
  weight: string;
  diagnoses: { code: string; label: string }[];
  labs: string[];
  prescriptions: VisitDraftPrescription[];
  notes: string;
};

export type DraftVisitWorkspace = {
  draftId: string;
  patientId: string;
  visitId?: string | null;
  createdAt: string;
  updatedAt: string;
  draft: VisitDraftState;
  openVisit?: {
    id: string;
    status: "waiting" | "with_nurse" | "with_doctor" | "completed" | "no_show";
    checkedInAt: string;
    department: string;
    reason?: string | null;
  } | null;
};

export type DoctorPrescriptionWorkspace = {
  id: string;
  prescribedAt: string;
  status: string;
  items: Array<{
    id: string;
    medication: string;
    strength: string;
    instructions: string;
    frequency?: string | null;
    durationDays: number;
  }>;
};

export type DoctorPatientWorkspace = {
  openVisit?: DraftVisitWorkspace["openVisit"];
  activeDrafts: DraftVisitWorkspace[];
  doctorPrescriptions: DoctorPrescriptionWorkspace[];
};

export type PriorLabMatch = {
  test_name: string;
  taken_on: string;
  taken_on_iso: string;
  results: string;
  lab_order_id: string;
};

export type VisitRecordSection = {
  title: string;
  content: string;
};

export type StaffMember = {
  id: string;
  userId?: string;
  name: string;
  role: Role;
  email: string;
  department?: Department;
  active: boolean;
  lastLogin: string;
};

export type SyncItem = {
  id: string;
  type: "visit" | "prescription" | "vitals" | "check-in" | "registration";
  patientName: string;
  createdAt: string;
  status: "pending" | "synced" | "conflict";
};

export type WaitlistEntry = {
  id: string;
  patientId: string;
  patientName?: string;
  checkInTime: string; // HH:MM
  checkInTimestamp: number;
  department: Department;
  priority: Priority;
  assignedTo?: string; // staff name
  status: "waiting" | "with-nurse" | "with-doctor" | "completed" | "no-show";
  reason?: string;
};

export type DepartmentRecord = {
  id: string;
  name: Department;
  headDoctorId: string;
  targetWaitTimeMin: number;
  isActive: boolean;
};

export type AuditLogEntry = {
  id: string;
  timestamp: string;
  staffName: string;
  action: string;
  patientId?: string;
  ipAddress: string;
  reason: string;
};

export type Notification = {
  id: string;
  type: "wait_alert" | "lab_ready" | "system" | "billing" | "staff_invite";
  title: string;
  body: string;
  createdAt: string;
  read: boolean;
  audience: Role[];
};

export type Referral = {
  id: string;
  patientId: string;
  referFrom: string;
  referTo: string;
  urgency: "Routine" | "Urgent" | "Emergency";
  reason: string;
  icd11?: string;
  date: string;
  status: "pending" | "accepted" | "completed";
};
