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
