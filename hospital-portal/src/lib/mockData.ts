import type {
  Patient, StaffMember, SyncItem, WaitlistEntry, DepartmentRecord,
  AuditLogEntry, Notification, Referral
} from "./types";

export const HOSPITAL = {
  code: "MP-LAGOS-001",
  name: "St. Catherine General Hospital",
  city: "Lagos, Nigeria",
  plan: "Enterprise",
  daysRemaining: 247,
};

export const VALID_HOSPITAL_CODES = ["MP-LAGOS-001", "MP-NAIROBI-002", "MP-ACCRA-003"];

export const STAFF: StaffMember[] = [
  { id: "S1", name: "Adaeze Okafor", role: "receptionist", email: "adaeze@stcatherine.med", department: "General", active: true, lastLogin: "2026-04-28 08:12" },
  { id: "S2", name: "Nurse Joseph Mensah", role: "nurse", email: "joseph@stcatherine.med", department: "General", active: true, lastLogin: "2026-04-28 07:45" },
  { id: "S3", name: "Dr. Amara Eze", role: "doctor", email: "amara@stcatherine.med", department: "General", active: true, lastLogin: "2026-04-28 09:01" },
  { id: "S4", name: "Dr. Ibrahim Musa", role: "doctor", email: "ibrahim@stcatherine.med", department: "Cardiology", active: true, lastLogin: "2026-04-27 18:22" },
  { id: "S5", name: "Tunde Adeyemi", role: "admin", email: "tunde@stcatherine.med", active: true, lastLogin: "2026-04-28 06:30" },
  { id: "S6", name: "Nurse Faith Owino", role: "nurse", email: "faith@stcatherine.med", department: "Pediatrics", active: false, lastLogin: "2026-03-12 14:00" },
  { id: "S7", name: "Dr. Chika Nwosu", role: "dept_head", email: "chika@stcatherine.med", department: "Cardiology", active: true, lastLogin: "2026-04-28 08:00" },
];

export const PATIENTS: Patient[] = [
  {
    id: "MP-7421",
    name: "Grace Okonkwo",
    dob: "1978-03-14",
    gender: "F",
    phone: "+234 803 555 1241",
    emergencyContact: "Daniel Okonkwo (Husband) — +234 803 555 9988",
    bloodType: "O+",
    allergies: [{ name: "Penicillin", severity: "severe" }, { name: "Peanuts", severity: "moderate" }],
    conditions: ["Hypertension (2022)", "Type 2 Diabetes (2023)"],
    insuranceProvider: "AXA Mansard",
    nationalId: "NIN-12345678",
    lastVisit: "2026-04-25",
    visits: [
      { id: "V1", date: "2026-04-25", type: "Consultation", provider: "Dr. Amara Eze", diagnosis: "Hypertension follow-up", notes: "BP elevated, increased Lisinopril.", vitals: { recordedAt: "2026-04-25", bp: "142/92", hr: 78, temp: 36.7, spo2: 98, weight: 72, height: 165 }, status: "completed" },
      { id: "V2", date: "2026-03-10", type: "Lab", provider: "Lab Tech: Kemi A.", diagnosis: "Routine metabolic panel", notes: "HbA1c 7.1%", status: "completed" },
      { id: "V3", date: "2026-02-02", type: "Follow-up", provider: "Dr. Amara Eze", diagnosis: "Diabetes review", notes: "Adjust diet plan.", status: "completed" },
      { id: "V4", date: "2025-11-18", type: "Emergency", provider: "Dr. Ibrahim Musa", diagnosis: "Hypertensive crisis", notes: "Admitted overnight, stabilized.", status: "completed" },
    ],
    prescriptions: [
      { id: "P1", medication: "Lisinopril", dosage: "10mg", frequency: "1x daily", duration: "90 days", prescribedBy: "Dr. Amara Eze", date: "2026-04-25", pharmacy: "HealthPlus Ikeja", status: "active" },
      { id: "P2", medication: "Metformin", dosage: "500mg", frequency: "2x daily", duration: "90 days", prescribedBy: "Dr. Amara Eze", date: "2026-04-25", pharmacy: "HealthPlus Ikeja", status: "active" },
      { id: "P3", medication: "Amlodipine", dosage: "5mg", frequency: "1x daily", duration: "30 days", prescribedBy: "Dr. Ibrahim Musa", date: "2025-11-18", pharmacy: "MedPlus VI", status: "expired" },
    ],
    labs: [
      { id: "L1", test: "Lipid Panel", orderedBy: "Dr. Amara Eze", date: "2026-04-25", status: "in-progress" },
      { id: "L2", test: "HbA1c", orderedBy: "Dr. Amara Eze", date: "2026-03-10", status: "completed", result: "7.1%", numericResult: 7.1, unit: "%", refLow: 4, refHigh: 5.6 },
      { id: "L3", test: "HbA1c", orderedBy: "Dr. Amara Eze", date: "2025-12-08", status: "completed", result: "7.4%", numericResult: 7.4, unit: "%", refLow: 4, refHigh: 5.6 },
      { id: "L4", test: "HbA1c", orderedBy: "Dr. Amara Eze", date: "2025-09-05", status: "completed", result: "7.8%", numericResult: 7.8, unit: "%", refLow: 4, refHigh: 5.6 },
      { id: "L5", test: "HbA1c", orderedBy: "Dr. Amara Eze", date: "2025-06-04", status: "completed", result: "8.2%", numericResult: 8.2, unit: "%", refLow: 4, refHigh: 5.6 },
    ],
    upcomingAppointments: [{ date: "2026-05-15", reason: "BP review", provider: "Dr. Amara Eze" }],
  },
  {
    id: "MP-3087", name: "Samuel Adebayo", dob: "1991-07-22", gender: "M",
    phone: "+234 705 222 7711", emergencyContact: "Bisi Adebayo (Sister) — +234 705 222 0011",
    bloodType: "A+", allergies: [], conditions: ["Asthma"], lastVisit: "2026-04-20",
    visits: [{ id: "V1", date: "2026-04-20", type: "Consultation", provider: "Dr. Ibrahim Musa", diagnosis: "Asthma exacerbation", notes: "Prescribed inhaler refill.", vitals: { recordedAt: "2026-04-20", bp: "118/76", hr: 88, temp: 37.0, spo2: 95 }, status: "completed" }],
    prescriptions: [{ id: "P1", medication: "Salbutamol Inhaler", dosage: "100mcg", frequency: "PRN", duration: "30 days", prescribedBy: "Dr. Ibrahim Musa", date: "2026-04-20", pharmacy: "HealthPlus Ikeja", status: "active" }],
    labs: [], upcomingAppointments: [],
  },
  {
    id: "MP-9912", name: "Aisha Bello", dob: "2015-11-02", gender: "F",
    phone: "+234 802 100 4499", emergencyContact: "Halima Bello (Mother) — +234 802 100 4499",
    bloodType: "B+", allergies: [{ name: "Sulfa drugs", severity: "moderate" }], conditions: [], lastVisit: "2026-04-12",
    visits: [{ id: "V1", date: "2026-04-12", type: "Vaccination", provider: "Nurse Joseph Mensah", diagnosis: "Routine MMR booster", status: "completed" }],
    prescriptions: [], labs: [],
    upcomingAppointments: [{ date: "2026-10-12", reason: "Annual check-up", provider: "Dr. Amara Eze" }],
  },
  {
    id: "MP-5530", name: "Chinedu Obi", dob: "1965-01-30", gender: "M",
    phone: "+234 809 887 1122", emergencyContact: "Ngozi Obi (Wife) — +234 809 887 0001",
    bloodType: "AB-", allergies: [{ name: "Aspirin", severity: "severe" }],
    conditions: ["Coronary artery disease", "Hyperlipidemia"], lastVisit: "2026-04-26",
    visits: [{ id: "V1", date: "2026-04-26", type: "Follow-up", provider: "Dr. Amara Eze", diagnosis: "Post-stent review", notes: "Stable. Continue current regimen.", vitals: { recordedAt: "2026-04-26", bp: "128/82", hr: 70, spo2: 97 }, status: "completed" }],
    prescriptions: [
      { id: "P1", medication: "Atorvastatin", dosage: "40mg", frequency: "1x nightly", duration: "90 days", prescribedBy: "Dr. Amara Eze", date: "2026-04-26", pharmacy: "MedPlus VI", status: "active" },
      { id: "P2", medication: "Clopidogrel", dosage: "75mg", frequency: "1x daily", duration: "90 days", prescribedBy: "Dr. Amara Eze", date: "2026-04-26", pharmacy: "MedPlus VI", status: "active" },
    ],
    labs: [{ id: "L1", test: "Troponin I", orderedBy: "Dr. Amara Eze", date: "2026-04-26", status: "completed", result: "Normal" }],
    upcomingAppointments: [],
  },
  {
    id: "MP-1188", name: "Mary Wanjiku", dob: "1988-05-19", gender: "F",
    phone: "+254 712 334 556", emergencyContact: "John Wanjiku (Brother) — +254 712 334 999",
    bloodType: "O-", allergies: [], conditions: ["Pregnancy — 2nd trimester"], lastVisit: "2026-04-15",
    visits: [{ id: "V1", date: "2026-04-15", type: "Consultation", provider: "Dr. Amara Eze", diagnosis: "Antenatal visit", notes: "All normal.", vitals: { recordedAt: "2026-04-15", bp: "115/72", hr: 82, weight: 68 }, status: "completed" }],
    prescriptions: [{ id: "P1", medication: "Folic Acid", dosage: "5mg", frequency: "1x daily", duration: "ongoing", prescribedBy: "Dr. Amara Eze", date: "2026-04-15", pharmacy: "HealthPlus Ikeja", status: "active" }],
    labs: [],
    upcomingAppointments: [{ date: "2026-05-15", reason: "Antenatal", provider: "Dr. Amara Eze" }],
  },
];

const now = Date.now();
const min = (m: number) => now - m * 60_000;

export const INITIAL_WAITLIST: WaitlistEntry[] = [
  { id: "W1", patientId: "MP-7421", checkInTime: "08:42", checkInTimestamp: min(67), department: "General", priority: "normal", assignedTo: "Dr. Amara Eze", status: "with-doctor", reason: "BP follow-up" },
  { id: "W2", patientId: "MP-3087", checkInTime: "09:05", checkInTimestamp: min(45), department: "Cardiology", priority: "urgent", assignedTo: "Dr. Ibrahim Musa", status: "with-nurse", reason: "Inhaler refill" },
  { id: "W3", patientId: "MP-9912", checkInTime: "09:18", checkInTimestamp: min(32), department: "Pediatrics", priority: "normal", status: "waiting", reason: "Vaccination" },
  { id: "W4", patientId: "MP-1188", checkInTime: "09:30", checkInTimestamp: min(20), department: "Maternity", priority: "normal", assignedTo: "Dr. Amara Eze", status: "waiting", reason: "Antenatal" },
  { id: "W5", patientId: "MP-5530", checkInTime: "07:55", checkInTimestamp: min(72), department: "Cardiology", priority: "emergency", assignedTo: "Dr. Ibrahim Musa", status: "waiting", reason: "Chest pain" },
];

// Backwards-compat for any existing imports
export const CHECK_IN_QUEUE = INITIAL_WAITLIST.map(w => ({
  patientId: w.patientId, checkedInAt: w.checkInTime, reason: w.reason || "", status: w.status as any,
}));

export const SYNC_QUEUE: SyncItem[] = [
  { id: "SQ1", type: "visit", patientName: "Grace Okonkwo", createdAt: "2026-04-28 09:12", status: "pending" },
  { id: "SQ2", type: "prescription", patientName: "Samuel Adebayo", createdAt: "2026-04-28 09:18", status: "pending" },
  { id: "SQ3", type: "vitals", patientName: "Aisha Bello", createdAt: "2026-04-28 09:22", status: "synced" },
];

export const ICD11_CODES = [
  { code: "BA00", label: "Essential hypertension" },
  { code: "5A11", label: "Type 2 diabetes mellitus" },
  { code: "CA23", label: "Asthma" },
  { code: "1A00", label: "Cholera" },
  { code: "1F40", label: "Malaria" },
  { code: "MD90", label: "Fever, unspecified" },
  { code: "MG30", label: "Chronic pain" },
  { code: "BD10", label: "Coronary artery disease" },
];

export const DRUG_DATABASE = [
  { name: "Lisinopril", class: "ACE inhibitor", forms: ["5mg","10mg","20mg"] },
  { name: "Losartan", class: "ARB", forms: ["25mg","50mg","100mg"] },
  { name: "Metformin", class: "Biguanide", forms: ["500mg","850mg","1000mg"] },
  { name: "Amlodipine", class: "Calcium channel blocker", forms: ["2.5mg","5mg","10mg"] },
  { name: "Atorvastatin", class: "Statin", forms: ["10mg","20mg","40mg","80mg"] },
  { name: "Salbutamol Inhaler", class: "Beta-2 agonist", forms: ["100mcg"] },
  { name: "Amoxicillin", class: "Penicillin", forms: ["250mg","500mg"] },
  { name: "Azithromycin", class: "Macrolide", forms: ["250mg","500mg"] },
  { name: "Paracetamol", class: "Analgesic", forms: ["500mg","1000mg"] },
  { name: "Ibuprofen", class: "NSAID", forms: ["200mg","400mg","600mg"] },
  { name: "Clopidogrel", class: "Antiplatelet", forms: ["75mg"] },
  { name: "Folic Acid", class: "Vitamin", forms: ["1mg","5mg"] },
  { name: "Warfarin", class: "Anticoagulant", forms: ["1mg","2mg","5mg"] },
];

// Pairs that interact (each unordered)
export const DRUG_INTERACTIONS: { a: string; b: string; severity: "moderate" | "severe"; note: string }[] = [
  { a: "Lisinopril", b: "Losartan", severity: "severe", note: "Combined ACEi + ARB increases risk of acute kidney injury and hyperkalemia." },
  { a: "Warfarin", b: "Ibuprofen", severity: "severe", note: "NSAIDs increase bleeding risk with anticoagulants." },
  { a: "Clopidogrel", b: "Ibuprofen", severity: "moderate", note: "May increase risk of GI bleeding." },
  { a: "Atorvastatin", b: "Azithromycin", severity: "moderate", note: "Possible increased statin levels — monitor for myopathy." },
];

export const PHARMACIES = ["HealthPlus Ikeja", "MedPlus VI", "Alpha Pharmacy Lekki", "Hospital In-house"];

export const DEPARTMENTS: DepartmentRecord[] = [
  { id: "dept_general",  name: "General",    headDoctorId: "S3", targetWaitTimeMin: 30, isActive: true },
  { id: "dept_cardio",   name: "Cardiology", headDoctorId: "S7", targetWaitTimeMin: 25, isActive: true },
  { id: "dept_peds",     name: "Pediatrics", headDoctorId: "S2", targetWaitTimeMin: 20, isActive: true },
  { id: "dept_maternity",name: "Maternity",  headDoctorId: "S3", targetWaitTimeMin: 30, isActive: true },
  { id: "dept_er",       name: "Emergency",  headDoctorId: "S4", targetWaitTimeMin: 5,  isActive: true },
  { id: "dept_lab",      name: "Lab",        headDoctorId: "S3", targetWaitTimeMin: 15, isActive: true },
  { id: "dept_pharm",    name: "Pharmacy",   headDoctorId: "S5", targetWaitTimeMin: 10, isActive: true },
];

export const AUDIT_LOG: AuditLogEntry[] = [
  { id: "A1", timestamp: "2026-04-28 10:32:15", staffName: "Dr. Amara Eze", action: "View patient record", patientId: "MP-7421", ipAddress: "196.43.134.52", reason: "Routine care" },
  { id: "A2", timestamp: "2026-04-28 10:18:02", staffName: "Adaeze Okafor", action: "Patient checked in",  patientId: "MP-1188", ipAddress: "196.43.134.51", reason: "Antenatal" },
  { id: "A3", timestamp: "2026-04-28 09:55:41", staffName: "Dr. Ibrahim Musa", action: "Prescribed medication", patientId: "MP-3087", ipAddress: "196.43.134.60", reason: "Asthma" },
  { id: "A4", timestamp: "2026-04-28 09:12:08", staffName: "Tunde Adeyemi", action: "Updated hospital settings", ipAddress: "196.43.134.10", reason: "Configuration" },
  { id: "A5", timestamp: "2026-04-28 08:42:01", staffName: "Adaeze Okafor", action: "Patient checked in", patientId: "MP-7421", ipAddress: "196.43.134.51", reason: "BP follow-up" },
  { id: "A6", timestamp: "2026-04-27 17:31:18", staffName: "Dr. Chika Nwosu", action: "Ordered lab", patientId: "MP-5530", ipAddress: "196.43.134.55", reason: "Cardiac workup" },
];

export const NOTIFICATIONS: Notification[] = [
  { id: "N1", type: "wait_alert", title: "3 patients waiting > 60 min", body: "Sarah, John and Mary need triage.", createdAt: "2026-04-28 10:30", read: false, audience: ["receptionist","admin","dept_head"] },
  { id: "N2", type: "lab_ready",  title: "Lab results ready: Grace Okonkwo", body: "Lipid Panel completed.", createdAt: "2026-04-28 10:12", read: false, audience: ["doctor","nurse","dept_head"] },
  { id: "N3", type: "system",     title: "Scheduled maintenance", body: "Sun 02:00 UTC — 30 min downtime.", createdAt: "2026-04-27 18:00", read: true, audience: ["receptionist","nurse","doctor","dept_head","admin"] },
  { id: "N4", type: "billing",    title: "Invoice #INV-2026-04 ready", body: "Due May 5, 2026.", createdAt: "2026-04-27 09:00", read: false, audience: ["admin"] },
  { id: "N5", type: "staff_invite", title: "New staff invite accepted", body: "Dr. Chika Nwosu joined Cardiology.", createdAt: "2026-04-26 14:20", read: true, audience: ["admin"] },
];

export const REFERRALS: Referral[] = [
  { id: "R1", patientId: "MP-5530", referFrom: "General", referTo: "Cardiology", urgency: "Urgent", reason: "Recurrent angina", icd11: "BD10", date: "2026-04-26", status: "accepted" },
];

// System health (admin)
export const SYSTEM_SERVICES = [
  { service: "API Gateway",   status: "Operational", lastCheck: "Now",   responseTime: "47ms" },
  { service: "Database",      status: "Operational", lastCheck: "Now",   responseTime: "12ms" },
  { service: "QR Scanner",    status: "Operational", lastCheck: "Now",   responseTime: "—" },
  { service: "Pharmacy Sync", status: "Operational", lastCheck: "2s ago",responseTime: "234ms" },
  { service: "Print Service", status: "Degraded",    lastCheck: "5s ago",responseTime: "Timeout" },
] as const;

export const RECENT_INCIDENTS = [
  "2026-04-27 14:23: Printer queue backlog (resolved)",
  "2026-04-26 09:15: API latency spike (resolved)",
];
