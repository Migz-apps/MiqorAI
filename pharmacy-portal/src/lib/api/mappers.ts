import type { Patient, Role, Rx, RxItem, RxStatus, Staff, StockItem } from "@/lib/types";
import { formatDistanceToNow } from "date-fns";

type ApiHospital = { id?: string; name?: string } | string | null | undefined;

type ApiRxItem = {
  id?: string;
  drug_id?: string;
  drug_name: string;
  strength?: string;
  dosage_form?: string;
  dose?: string;
  duration_days?: number;
  quantity: number;
  unit_price: number;
  inventory_id?: string | null;
};

export type ApiPrescription = {
  id: string;
  patient_id: string;
  patient_name?: string;
  hospital?: ApiHospital;
  status: string;
  diagnosis?: string | null;
  notes?: string | null;
  insurance_provider?: string | null;
  insurance_member?: string | null;
  prescribed_at?: string;
  total_amount?: number;
  items?: ApiRxItem[];
  allergies?: unknown[];
  patient?: {
    id?: string;
    first_name?: string;
    last_name?: string;
    firstName?: string;
    lastName?: string;
    date_of_birth?: string;
    phone?: string;
    email?: string;
  };
  interactions?: Array<{ message?: string; severity?: string }>;
};

type ApiInventory = {
  id: string;
  drug_name: string;
  strength?: string;
  dosage_form?: string;
  barcode?: string | null;
  category?: string | null;
  stock: number;
  reorder_point?: number;
  unit_price: number;
  expiry_date?: string | null;
  supplier?: string | null;
  controlled?: boolean;
};

const DOSAGE_FORMS = ["Tablet", "Capsule", "Liquid", "Injection", "Cream"] as const;

function mapForm(form?: string): RxItem["form"] {
  const f = form ?? "Tablet";
  return (DOSAGE_FORMS.find((d) => d.toLowerCase() === f.toLowerCase()) ?? "Tablet") as RxItem["form"];
}

export function mapRxStatus(status: string): RxStatus {
  if (status === "sent_to_pharmacy") return "pending";
  if (status === "picked_up") return "dispensed";
  if (["pending", "verified", "ready", "dispensed", "held", "rejected"].includes(status)) {
    return status as RxStatus;
  }
  return "pending";
}

function hospitalName(hospital?: ApiHospital): string {
  if (!hospital) return "—";
  if (typeof hospital === "string") return hospital;
  return hospital.name ?? "—";
}

function patientName(rx: ApiPrescription): string {
  if (rx.patient_name) return rx.patient_name;
  const p = rx.patient;
  if (!p) return "Unknown";
  const first = p.first_name ?? p.firstName ?? "";
  const last = p.last_name ?? p.lastName ?? "";
  return `${first} ${last}`.trim() || "Unknown";
}

function ageFromDob(dob?: string | null): number {
  if (!dob) return 0;
  const born = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - born.getFullYear();
  const m = now.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < born.getDate())) age--;
  return Math.max(0, age);
}

function mapAllergies(allergies?: unknown[]): string[] {
  if (!allergies?.length) return [];
  return allergies.map((a) => {
    if (typeof a === "string") return a;
    if (a && typeof a === "object" && "name" in a) return String((a as { name: string }).name);
    if (a && typeof a === "object" && "allergen" in a) return String((a as { allergen: string }).allergen);
    return JSON.stringify(a);
  });
}

function mapRxItems(items?: ApiRxItem[]): RxItem[] {
  return (items ?? []).map((it) => ({
    drugId: it.inventory_id ?? it.drug_id ?? it.id ?? it.drug_name,
    name: it.drug_name,
    strength: it.strength ?? "",
    form: mapForm(it.dosage_form),
    dose: it.dose ?? "—",
    durationDays: it.duration_days ?? 0,
    quantity: it.quantity,
    unitPrice: it.unit_price,
  }));
}

export function mapPrescription(rx: ApiPrescription): Rx {
  const items = mapRxItems(rx.items);
  const total =
    rx.total_amount ??
    items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  return {
    id: rx.id,
    patientId: rx.patient_id,
    patientName: patientName(rx),
    patientAge: ageFromDob(rx.patient?.date_of_birth),
    patientPhone: rx.patient?.phone ?? "—",
    doctorName: "Prescriber",
    hospital: hospitalName(rx.hospital),
    issuedAt: rx.prescribed_at ?? new Date().toISOString(),
    status: mapRxStatus(rx.status),
    diagnosis: rx.diagnosis ?? "—",
    allergies: mapAllergies(rx.allergies),
    notes: rx.notes ?? undefined,
    items,
    insurance:
      rx.insurance_provider
        ? { provider: rx.insurance_provider, member: rx.insurance_member ?? "—" }
        : undefined,
    total,
  };
}

export function mapInventoryItem(item: ApiInventory): StockItem {
  return {
    id: item.id,
    name: item.drug_name,
    strength: item.strength ?? "",
    form: mapForm(item.dosage_form),
    barcode: item.barcode ?? "",
    category: item.category ?? "General",
    stock: item.stock,
    minStock: item.reorder_point ?? 0,
    unitPrice: item.unit_price,
    expiry: item.expiry_date ?? "—",
    supplier: item.supplier ?? "—",
    controlled: item.controlled ?? false,
  };
}

export function mapPatientListItem(p: {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  adherence?: number;
}): Patient {
  return {
    id: p.id,
    name: p.name,
    age: 0,
    phone: p.phone ?? "—",
    allergies: [],
    conditions: [],
    adherence: p.adherence ?? 0,
    lastVisit: "—",
  };
}

export function mapPatientDetail(data: {
  id: string;
  first_name: string;
  last_name: string;
  date_of_birth?: string | null;
  phone?: string | null;
  prescriptions?: ApiPrescription[];
}, adherence?: { overall_rate?: number }): Patient {
  return {
    id: data.id,
    name: `${data.first_name} ${data.last_name}`.trim(),
    age: ageFromDob(data.date_of_birth),
    phone: data.phone ?? "—",
    allergies: [],
    conditions: [],
    adherence: adherence?.overall_rate ? Math.round(adherence.overall_rate) : 0,
    lastVisit: data.prescriptions?.[0]?.prescribed_at
      ? formatDistanceToNow(new Date(data.prescriptions[0].prescribed_at), { addSuffix: true })
      : "—",
  };
}

export function mapStaffMember(s: {
  user_id: string;
  email: string;
  role: string;
  active: boolean;
  last_login?: string | null;
  display_name?: string | null;
}): Staff {
  return {
    id: s.user_id,
    name: s.display_name ?? s.email.split("@")[0],
    email: s.email,
    role: s.role as Role,
    active: s.active,
    lastActive: s.last_login
      ? formatDistanceToNow(new Date(s.last_login), { addSuffix: true })
      : "—",
  };
}

export function mapAdherenceTrend(trend: Array<{ month?: string; adherence_rate?: number }>) {
  return trend.map((t) => ({
    month: t.month?.slice(5) ?? t.month ?? "",
    value: Math.round(t.adherence_rate ?? 0),
  }));
}

export function mapRevenueTrend(trend: Array<{ date?: string; amount?: number }>) {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return trend.map((t) => ({
    day: t.date ? days[new Date(t.date).getDay()] ?? t.date.slice(5) : "—",
    value: t.amount ?? 0,
  }));
}

export function mapAuditLog(item: {
  id: string;
  action: string;
  userEmail?: string | null;
  createdAt: string;
  success?: boolean;
}) {
  const level = item.success === false ? "warning" as const : "info" as const;
  return {
    id: item.id,
    at: item.createdAt,
    actor: item.userEmail ?? "System",
    action: item.action,
    level,
  };
}

export function mapSyncItem(item: {
  id: string;
  operation: string;
  resourceType: string;
  resourceData?: Record<string, unknown>;
  status: string;
  createdAt: string;
}) {
  const data = item.resourceData ?? {};
  const label =
    typeof data.label === "string"
      ? data.label
      : `${item.operation} ${item.resourceType}`;
  const typeMap: Record<string, "dispense" | "stock-adjust" | "verify"> = {
    dispense: "dispense",
    prescription: "dispense",
    inventory: "stock-adjust",
    verify: "verify",
  };
  const statusMap: Record<string, "pending" | "synced" | "failed" | "conflict"> = {
    pending: "pending",
    synced: "synced",
    failed: "failed",
    conflict: "conflict",
  };
  return {
    id: item.id,
    type: typeMap[item.resourceType] ?? item.resourceType,
    label,
    status: statusMap[item.status] ?? "pending",
    at: new Date(item.createdAt).getTime(),
  };
}

export function mapBillingReceipt(r: {
  id: string;
  patient_name: string;
  dispensed_at?: string | null;
  total: number;
  payment_type: string;
}) {
  return {
    id: r.id,
    patientName: r.patient_name,
    dispensedAt: r.dispensed_at ?? new Date().toISOString(),
    total: r.total,
    paymentType: r.payment_type as "cash" | "insurance",
  };
}
