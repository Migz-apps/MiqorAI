export type Role = "analyst" | "fraud" | "contracts" | "executive" | "admin";

export type Insurer = {
  code: string;
  name: string;
  country: string;
  currency: string;
  members: number;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastLogin: string;
};

export type SavingsRecord = {
  id: string;
  patientId: string;
  testType: string;
  category: "lab" | "imaging" | "other";
  firstTestDate: string;
  firstProvider: string;
  attemptedDate: string;
  attemptedProvider: string;
  preventionMethod: string;
  savings: number;
  timestamp: string;
};

export type Hospital = {
  name: string;
  region: string;
  savings: number;
  share: number;
};

export type MedicationAdherence = {
  medication: string;
  rate: number;
  patients: number;
  trend: number;
  alert: boolean;
};

export type NonAdherent = {
  patientId: string;
  name: string;
  medication: string;
  daysOverdue: number;
  phone: string;
};

export type FlaggedClaim = {
  id: string;
  patientId: string;
  patientName: string;
  provider: string;
  amount: number;
  score: number;
  pattern: string;
  status: "pending" | "flagged" | "investigating" | "cleared";
};

export type Provider = {
  name: string;
  totalClaims: number;
  anomalyScore: number;
  flagged: number;
};

export type Invoice = {
  id: string;
  sourceId: string;
  period: string;
  grossSavings: number;
  fee: number;
  status: "paid" | "pending" | "overdue";
  dueDate: string;
  paidDate?: string;
};

export type Alert = {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  message: string;
  timestamp: string;
  category: "adherence" | "fraud" | "savings" | "system";
};

export type AuditEntry = {
  id: string;
  user: string;
  role: Role;
  action: string;
  resource: string;
  ip: string;
  timestamp: string;
};
