import type {
  Patient,
  StaffMember,
  SyncItem,
  WaitlistEntry,
  DepartmentRecord,
  AuditLogEntry,
  Notification,
  Referral,
  Role,
  Department,
  Allergy,
  Prescription,
  LabOrder,
  Visit,
  PatientSafetyProfile,
  VisitDraftState,
  ClinicalFlags,
} from "./types";

const ALL_ROLES: Role[] = ["receptionist", "nurse", "doctor", "dept_head", "admin"];

export function mapVisitStatus(api: string): WaitlistEntry["status"] {
  const m: Record<string, WaitlistEntry["status"]> = {
    waiting: "waiting",
    with_nurse: "with-nurse",
    with_doctor: "with-doctor",
    completed: "completed",
    no_show: "no-show",
  };
  return m[api] ?? "waiting";
}

export function mapVisitStatusToApi(ui: WaitlistEntry["status"]): string {
  const m: Record<WaitlistEntry["status"], string> = {
    waiting: "waiting",
    "with-nurse": "with_nurse",
    "with-doctor": "with_doctor",
    completed: "completed",
    "no-show": "no_show",
  };
  return m[ui];
}

const fmtDate = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 10);
};

const fmtDateTime = (d: string | Date | null | undefined) => {
  if (!d) return "";
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toISOString().slice(0, 16).replace("T", " ");
};

const fmtHHMM = (d: string | Date) => {
  const dt = typeof d === "string" ? new Date(d) : d;
  return dt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", hour12: false });
};

function mapGender(g?: string | null): Patient["gender"] {
  if (!g) return "Other";
  const u = g.toUpperCase();
  if (u === "M" || u === "MALE") return "M";
  if (u === "F" || u === "FEMALE") return "F";
  return "Other";
}

function mapStaffRole(role: string): Role {
  const r = role.toLowerCase().replace(/-/g, "_");
  if (r === "hospital_admin" || r === "admin") return "admin";
  if (ALL_ROLES.includes(r as Role)) return r as Role;
  return "doctor";
}

function mapPrescriptionStatus(s: string): Prescription["status"] {
  if (["dispensed", "filled"].includes(s)) return "filled";
  if (["cancelled", "expired"].includes(s)) return "expired";
  if (s === "pending") return "pending";
  return "active";
}

function mapLabStatus(s: string): LabOrder["status"] {
  if (s === "in_progress") return "in-progress";
  if (s === "ordered" || s === "completed") return s as LabOrder["status"];
  return "ordered";
}

export function mapCheckinToWaitlistEntry(row: Record<string, unknown>): WaitlistEntry & { patientName?: string } {
  const ts = new Date(String(row.checkin_time)).getTime();
  return {
    id: String(row.visit_id),
    patientId: String(row.patient_id),
    patientName: row.name ? String(row.name) : undefined,
    checkInTime: fmtHHMM(String(row.checkin_time)),
    checkInTimestamp: ts,
    department: String(row.department ?? "General") as Department,
    priority: (row.priority as WaitlistEntry["priority"]) ?? "normal",
    status: mapVisitStatus(String(row.status ?? "waiting")),
    reason: row.reason ? String(row.reason) : undefined,
  };
}

export function mapPatientFromApi(raw: Record<string, unknown>): Patient {
  const user = (raw.user as { phone?: string; email?: string }) ?? {};
  const medicalRecords = (raw.medicalRecords as Array<Record<string, unknown>>) ?? [];
  const visits = (raw.visits as Array<Record<string, unknown>>) ?? [];
  const prescriptions = (raw.prescriptions as Array<Record<string, unknown>>) ?? [];
  const labOrders = (raw.labOrders as Array<Record<string, unknown>>) ?? [];

  const allergies: Allergy[] = medicalRecords
    .filter((r) => r.recordType === "allergy")
    .map((r) => {
      const d = (r.data as { name?: string; severity?: string }) ?? {};
      const sev = d.severity?.toLowerCase();
      return {
        name: d.name ?? "Unknown",
        severity: (sev === "mild" || sev === "moderate" || sev === "severe" ? sev : "moderate") as Allergy["severity"],
      };
    });

  const conditions = medicalRecords
    .filter((r) => r.recordType === "diagnosis")
    .map((r) => {
      const d = r.data as { name?: string; codes?: string[] };
      return d.name ?? d.codes?.join(", ") ?? "Diagnosis";
    });

  const mappedVisits: Visit[] = visits.map((v) => {
    const vitals = v.vitals as Record<string, unknown> | null;
    const bp =
      vitals?.bp_systolic != null && vitals?.bp_diastolic != null
        ? `${vitals.bp_systolic}/${vitals.bp_diastolic}`
        : vitals?.bp != null
          ? String(vitals.bp)
          : undefined;
    return {
      id: String(v.id),
      date: fmtDate(v.checkedInAt as string),
      type: "Consultation",
      provider: String(v.assignedStaffId ?? "Staff"),
      diagnosis: Array.isArray(v.diagnosisCodes) ? (v.diagnosisCodes as string[]).join(", ") : undefined,
      notes: v.notes ? String(v.notes) : v.chiefComplaint ? String(v.chiefComplaint) : undefined,
      vitals: vitals
        ? {
            recordedAt: fmtDate((vitals.recorded_at as string) ?? (v.checkedInAt as string)),
            bp,
            hr: vitals.heart_rate as number | undefined,
            temp: vitals.temperature as number | undefined,
            spo2: vitals.spo2 as number | undefined,
            weight: vitals.weight as number | undefined,
            height: vitals.height as number | undefined,
          }
        : undefined,
      status: v.status === "completed" ? "completed" : v.status === "waiting" ? "in-progress" : "completed",
    };
  });

  const mappedRx: Prescription[] = prescriptions.flatMap((rx) => {
    const items = (rx.items as Array<Record<string, unknown>>) ?? [];
    const date = fmtDate(rx.prescribedAt as string);
    const by = String(rx.prescribedBy ?? "Doctor");
    const pharmacy = String(rx.pharmacyId ?? "Hospital");
    const status = mapPrescriptionStatus(String(rx.status ?? "active"));
    if (items.length === 0) {
      return [
        {
          id: String(rx.id),
          medication: "Prescription",
          dosage: "—",
          frequency: "—",
          duration: "—",
          prescribedBy: by,
          date,
          pharmacy,
          status,
        },
      ];
    }
    return items.map((item) => ({
      id: String(item.id ?? rx.id),
      medication: String(item.drugName ?? item.drug_name ?? "Medication"),
      dosage: String(item.strength ?? item.dosage ?? "—"),
      frequency: String(item.frequency ?? "—"),
      duration: item.durationDays ? `${item.durationDays} days` : String(item.duration_days ?? "—"),
      prescribedBy: by,
      date,
      pharmacy,
      status,
    }));
  });

  const mappedLabs: LabOrder[] = labOrders.map((l) => ({
    id: String(l.id),
    test: String(l.testName ?? l.test_name ?? "Lab"),
    orderedBy: String(l.orderedBy ?? "Doctor"),
    date: fmtDate(l.orderedAt as string),
    status: mapLabStatus(String(l.status ?? "ordered")),
    result: l.results ? String(l.results) : undefined,
  }));

  const lastVisit = mappedVisits[0]?.date;

  const latestVitals = mappedVisits.find((v) => v.vitals?.height || v.vitals?.weight)?.vitals;
  const height = latestVitals?.height;
  const weight = latestVitals?.weight;
  const bmi =
    height && weight && height > 0
      ? Math.round((weight / ((height / 100) ** 2)) * 10) / 10
      : undefined;

  return {
    id: String(raw.id),
    name: `${raw.firstName ?? ""} ${raw.lastName ?? ""}`.trim(),
    dob: fmtDate(raw.dateOfBirth as string),
    gender: mapGender(raw.gender as string),
    phone: user.phone ?? "",
    emergencyContact: [raw.emergencyContactName, raw.emergencyContactPhone].filter(Boolean).join(" — ") || "—",
    bloodType: String(raw.bloodType ?? raw.bloodGroup ?? "—"),
    allergies,
    conditions,
    visits: mappedVisits,
    prescriptions: mappedRx,
    labs: mappedLabs,
    upcomingAppointments: [],
    insuranceProvider: raw.insuranceId ? String(raw.insuranceId) : undefined,
    nationalId: raw.nationalId ? String(raw.nationalId) : undefined,
    lastVisit,
    height,
    weight,
    bmi,
  };
}

export function mapCensusPatient(row: Record<string, unknown>): Patient {
  return {
    id: String(row.id),
    name: String(row.name ?? ""),
    dob: "",
    gender: "Other",
    phone: "",
    emergencyContact: "—",
    bloodType: String(row.blood_type ?? "—"),
    allergies: [],
    conditions: [],
    visits: [],
    prescriptions: [],
    labs: [],
    upcomingAppointments: [],
    lastVisit: row.last_visit ? fmtDate(row.last_visit as string) : undefined,
  };
}

export function mapSearchPatient(row: Record<string, unknown>): Patient {
  return {
    id: String(row.patient_id),
    name: String(row.name ?? ""),
    dob: "",
    gender: "Other",
    phone: String(row.phone ?? ""),
    emergencyContact: "—",
    bloodType: "—",
    allergies: [],
    conditions: [],
    visits: [],
    prescriptions: [],
    labs: [],
    upcomingAppointments: [],
    nationalId: row.national_id ? String(row.national_id) : undefined,
  };
}

export function mapStaffMember(row: Record<string, unknown>): StaffMember {
  return {
    id: String(row.id),
    name: String(row.name ?? row.email ?? "Staff"),
    role: mapStaffRole(String(row.role ?? "doctor")),
    email: String(row.email ?? ""),
    department: row.department ? (String(row.department) as Department) : undefined,
    active: Boolean(row.active ?? true),
    lastLogin: row.last_login ? fmtDateTime(row.last_login as string) : "—",
    userId: row.user_id ? String(row.user_id) : undefined,
  };
}

export function mapDepartment(row: Record<string, unknown>): DepartmentRecord {
  return {
    id: String(row.id),
    name: String(row.name) as Department,
    headDoctorId: String(row.headStaffId ?? row.head_staff_id ?? ""),
    targetWaitTimeMin: Number(row.slaTargetMinutes ?? row.sla_target_minutes ?? 30),
    isActive: Boolean(row.isActive ?? row.is_active ?? true),
  };
}

export function mapNotification(row: Record<string, unknown>): Notification {
  return {
    id: String(row.id),
    type: (row.type as Notification["type"]) ?? "system",
    title: String(row.title ?? ""),
    body: String(row.body ?? ""),
    createdAt: fmtDateTime(row.createdAt as string),
    read: Boolean(row.read),
    audience: ALL_ROLES,
  };
}

export function mapSyncItem(row: Record<string, unknown>): SyncItem {
  const resourceType = String(row.resourceType ?? row.resource_type ?? "visit");
  const data = (row.resourceData ?? row.resource_data) as Record<string, unknown> | undefined;
  const typeMap: Record<string, SyncItem["type"]> = {
    visit: "visit",
    prescription: "prescription",
    vitals: "vitals",
    checkin: "check-in",
    check_in: "check-in",
    registration: "registration",
  };
  const apiStatus = String(row.status ?? "pending");
  const status: SyncItem["status"] =
    apiStatus === "synced" ? "synced" : apiStatus === "conflict" ? "conflict" : "pending";
  return {
    id: String(row.id),
    type: typeMap[resourceType] ?? "visit",
    patientName: String(data?.patient_name ?? data?.patientName ?? "Patient"),
    createdAt: fmtDateTime(row.createdAt as string),
    status,
  };
}

export function mapAuditEntry(row: Record<string, unknown>, staffName?: string): AuditLogEntry {
  return {
    id: String(row.id),
    timestamp: fmtDateTime(row.createdAt as string),
    staffName: staffName ?? String(row.userId ?? row.user_id ?? "System"),
    action: String(row.action ?? ""),
    patientId: row.resourceId ? String(row.resourceId) : row.resource_id ? String(row.resource_id) : undefined,
    ipAddress: String(row.ipAddress ?? row.ip_address ?? "—"),
    reason: String(row.metadata ?? row.reason ?? "—"),
  };
}

export function mapReferral(row: Record<string, unknown>): Referral {
  const urgencyRaw = String(row.urgency ?? "routine");
  const urgency =
    urgencyRaw.toLowerCase() === "urgent"
      ? "Urgent"
      : urgencyRaw.toLowerCase() === "emergency"
        ? "Emergency"
        : "Routine";
  const codes = row.icdCodes ?? row.icd_codes;
  return {
    id: String(row.id),
    patientId: String(row.patientId ?? row.patient_id),
    referFrom: String(row.fromDepartment ?? row.from_department ?? "General"),
    referTo: String(row.toDepartment ?? row.to_department ?? "—"),
    urgency,
    reason: String(row.reason ?? ""),
    icd11: Array.isArray(codes) && codes.length ? String(codes[0]) : undefined,
    date: fmtDate(row.createdAt as string),
    status: (row.status as Referral["status"]) ?? "pending",
  };
}

export function mapDrug(row: Record<string, unknown>) {
  const strength = String(row.strength ?? "");
  return {
    name: String(row.name ?? ""),
    class: String(row.category ?? row.dosageForm ?? "Drug"),
    forms: strength ? [strength] : ["—"],
  };
}

export function mapIcd(row: Record<string, unknown>) {
  return {
    code: String(row.code ?? ""),
    label: String(row.description ?? row.label ?? ""),
  };
}

export const mapApiPatient = mapPatientFromApi;
export const mapIcdCode = mapIcd;

const FOOD_ALLERGY_KEYWORDS = [
  "peanut", "tree nut", "shellfish", "fish", "egg", "milk", "soy", "wheat", "gluten", "sesame", "food",
];
const DRUG_ALLERGY_KEYWORDS = [
  "penicillin", "amoxicillin", "aspirin", "ibuprofen", "sulfa", "ciprofloxacin", "doxycycline",
  "morphine", "gentamicin", "codeine", "warfarin", "naproxen", "cipro",
];

function categorizeAllergy(name: string): "drug" | "food" | "other" {
  const lower = name.toLowerCase();
  if (lower.includes("none known") || lower === "none") return "other";
  if (FOOD_ALLERGY_KEYWORDS.some((k) => lower.includes(k))) return "food";
  if (DRUG_ALLERGY_KEYWORDS.some((k) => lower.includes(k))) return "drug";
  return "drug";
}

function calcAge(dob: string): number {
  return Math.floor((Date.now() - new Date(dob).getTime()) / (365.25 * 86400 * 1000));
}

function calcBmi(heightCm?: number, weightKg?: number): number | undefined {
  if (!heightCm || !weightKg || heightCm <= 0) return undefined;
  return Math.round((weightKg / ((heightCm / 100) ** 2)) * 10) / 10;
}

function parseVitalDraft(v: VisitDraftState | undefined, field: "height" | "weight"): number | undefined {
  if (!v) return undefined;
  const raw = field === "height" ? v.height : v.weight;
  const num = parseFloat(raw);
  return Number.isFinite(num) && num > 0 ? num : undefined;
}

export function mapPatientSafetyProfile(
  patient: Patient,
  raw?: Record<string, unknown>,
  visitDraft?: VisitDraftState,
): PatientSafetyProfile {
  const medicalRecords = (raw?.medicalRecords as Array<Record<string, unknown>>) ?? [];

  const drugAllergies: string[] = [];
  const foodAllergies: string[] = [];
  const otherAllergies: string[] = [];
  for (const a of patient.allergies) {
    const label = a.severity ? `${a.name} (${a.severity})` : a.name;
    const cat = categorizeAllergy(a.name);
    if (cat === "food") foodAllergies.push(label);
    else if (cat === "drug") drugAllergies.push(label);
    else otherAllergies.push(label);
  }

  const chronicDiseases: string[] = [];
  const activeConditions: string[] = [];
  const currentMedications: string[] = [];
  const criticalMedicalInfo: string[] = [];
  const implantableDevices: string[] = [];
  let pregnancyStatus: string | undefined;
  let transplantStatus: string | undefined;
  let codeStatus: string | undefined;
  let isolationPrecautions: string | undefined;

  const chronicKeywords = ["diabetes", "hypertension", "asthma", "kidney", "heart failure", "copd", "epilepsy", "eczema"];

  for (const r of medicalRecords) {
    const data = (r.data as Record<string, unknown>) ?? {};
    const name = String(data.name ?? "");
    const status = String(data.status ?? "active").toLowerCase();

    if (r.recordType === "diagnosis") {
      const entry = data.codes ? `${name} [${(data.codes as string[]).join(", ")}]` : name;
      if (status === "active") activeConditions.push(entry);
      if (chronicKeywords.some((k) => name.toLowerCase().includes(k))) chronicDiseases.push(entry);
      if (/pregnancy/i.test(name)) pregnancyStatus = status === "active" ? "Pregnant — active supervision" : name;
      if (/transplant/i.test(name)) transplantStatus = name;
    }

    if (r.recordType === "medication" && status === "active") {
      const dose = data.dose ? ` ${data.dose}` : "";
      const freq = data.freq ? ` — ${data.freq}` : data.frequency ? ` — ${data.frequency}` : "";
      currentMedications.push(`${name}${dose}${freq}`);
    }

    if (r.recordType === "procedure") {
      if (/pacemaker|defibrillator|implant/i.test(name)) implantableDevices.push(name);
    }

    if (data.critical === true || data.critical_info) {
      criticalMedicalInfo.push(String(data.critical_info ?? name));
    }
    if (data.code_status) codeStatus = String(data.code_status);
    if (data.isolation_precautions) isolationPrecautions = String(data.isolation_precautions);
  }

  for (const rx of patient.prescriptions.filter((p) => p.status === "active" || p.status === "pending")) {
    const entry = `${rx.medication} ${rx.dosage} — ${rx.frequency}`;
    if (!currentMedications.some((m) => m.toLowerCase().includes(rx.medication.toLowerCase()))) {
      currentMedications.push(entry);
    }
  }

  if (patient.allergies.some((a) => a.severity === "severe")) {
    criticalMedicalInfo.push("Severe allergy documented — verify before prescribing");
  }

  const draftHeight = parseVitalDraft(visitDraft, "height");
  const draftWeight = parseVitalDraft(visitDraft, "weight");
  const height = draftHeight ?? patient.height;
  const weight = draftWeight ?? patient.weight;
  const bmi = calcBmi(height, weight) ?? patient.bmi;

  const age = calcAge(patient.dob);
  const flags: ClinicalFlags = {
    highRisk:
      patient.allergies.some((a) => a.severity === "severe") ||
      chronicDiseases.length >= 2 ||
      activeConditions.length >= 3,
    fallRisk: age >= 65 || activeConditions.some((c) => /fall|frailty/i.test(c)),
    seizureHistory: activeConditions.some((c) => /seizure|epilepsy/i.test(c)),
    bleedingDisorder:
      patient.allergies.some((a) => /warfarin|bleeding/i.test(a.name)) ||
      activeConditions.some((c) => /bleeding|coagulopathy|anticoagulant/i.test(c)),
    immunocompromised: activeConditions.some((c) => /immunocomprom|hiv|chemotherapy|transplant/i.test(c)),
    isolationPrecautions,
  };

  const insurerMembers = (raw?.insurerMembers as Array<Record<string, unknown>>) ?? [];
  const insurerName = insurerMembers[0]
    ? String((insurerMembers[0].insurer as { name?: string })?.name ?? insurerMembers[0].plan ?? "")
    : undefined;

  return {
    patientId: patient.id,
    name: patient.name,
    dob: patient.dob,
    age,
    sex: patient.gender,
    bloodGroup: patient.bloodType,
    height,
    weight,
    bmi,
    emergencyContact: patient.emergencyContact,
    insuranceProvider: insurerName || patient.insuranceProvider,
    criticalMedicalInfo,
    drugAllergies,
    foodAllergies,
    otherAllergies,
    chronicDiseases,
    activeConditions,
    currentMedications,
    pregnancyStatus,
    transplantStatus,
    implantableDevices,
    codeStatus,
    clinicalFlags: flags,
  };
}

export function visitDraftHasContent(draft: VisitDraftState): boolean {
  return Boolean(
    draft.chief.trim() ||
      draft.notes.trim() ||
      draft.bp ||
      draft.hr ||
      draft.temp ||
      draft.spo2 ||
      draft.height ||
      draft.weight ||
      draft.diagnoses.length ||
      draft.labs.length,
  );
}

export function emptyVisitDraft(): VisitDraftState {
  return {
    chief: "",
    duration: "3 days",
    severity: "Moderate",
    bp: "",
    hr: "",
    temp: "",
    spo2: "",
    height: "",
    weight: "",
    diagnoses: [],
    labs: [],
    notes: "",
  };
}

export function mapDrugInteraction(row: Record<string, unknown>) {
  return {
    a: String(row.drug_a ?? row.drugA ?? ""),
    b: String(row.drug_b ?? row.drugB ?? ""),
    severity: (row.severity === "severe" ? "severe" : "moderate") as "moderate" | "severe",
    note: String(row.note ?? ""),
  };
}

export function mapPrescriptionListItem(row: Record<string, unknown>) {
  const items = (row.items as Array<Record<string, unknown>>) ?? [];
  const first = items[0];
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    medication: first ? String(first.drugName ?? first.drug_name ?? "—") : "Prescription",
    dosage: first ? String(first.strength ?? first.dosage ?? "—") : "—",
    frequency: first ? String(first.frequency ?? "—") : "—",
    pharmacy: "—",
    date: fmtDate(row.prescribed_at as string),
    status: mapPrescriptionStatus(String(row.status ?? "active")),
    prescribedBy: "Doctor",
    duration: first?.durationDays ? `${first.durationDays} days` : "—",
  };
}

export function mapLabListItem(row: Record<string, unknown>) {
  return {
    id: String(row.id),
    patientId: String(row.patient_id),
    patientName: String(row.patient_name ?? ""),
    test: String(row.test_name ?? ""),
    orderedBy: "Doctor",
    date: fmtDate(row.ordered_at as string),
    status: mapLabStatus(String(row.status ?? "ordered")),
    result: row.results ? String(row.results) : undefined,
  };
}
