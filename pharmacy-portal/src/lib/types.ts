export type Role = "cashier" | "technician" | "pharmacist" | "manager";

export type RxStatus =
  | "pending"      // newly received
  | "verified"     // pharmacist clinical-checked
  | "ready"        // dispensed package prepared
  | "dispensed"    // handed over
  | "held"         // on hold (clarification, OOS)
  | "rejected";    // rejected

export type Rx = {
  id: string;
  patientId: string;
  patientName: string;
  patientAge: number;
  patientPhone: string;
  doctorName: string;
  hospital: string;
  issuedAt: string;        // ISO
  status: RxStatus;
  diagnosis: string;
  allergies: string[];
  notes?: string;
  items: RxItem[];
  insurance?: { provider: string; member: string };
  total: number;           // KES
};

export type RxItem = {
  drugId: string;
  name: string;
  strength: string;
  form: "Tablet" | "Capsule" | "Liquid" | "Injection" | "Cream";
  dose: string;            // e.g., "1 tab x3/day"
  durationDays: number;
  quantity: number;
  unitPrice: number;
};

export type StockItem = {
  id: string;
  name: string;
  strength: string;
  form: "Tablet" | "Capsule" | "Liquid" | "Injection" | "Cream";
  barcode: string;
  category: string;
  stock: number;
  minStock: number;
  unitPrice: number;
  expiry: string;          // ISO date
  supplier: string;
  controlled?: boolean;
};

export type Patient = {
  id: string;
  name: string;
  age: number;
  phone: string;
  allergies: string[];
  conditions: string[];
  adherence: number;       // %
  lastVisit: string;
};

export type Staff = {
  id: string;
  name: string;
  email: string;
  role: Role;
  active: boolean;
  lastActive: string;
};
