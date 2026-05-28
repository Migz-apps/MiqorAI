import type {
  Insurer, Staff, Hospital, MedicationAdherence, NonAdherent,
  FlaggedClaim, Provider, Invoice, Alert, AuditEntry, SavingsRecord,
} from "./types";

export const INSURER: Insurer = {
  code: "JUBILEE_001",
  name: "Jubilee Insurance",
  country: "Kenya",
  currency: "KSh",
  members: 247_000,
};

export const VALID_INSURER_CODES = ["JUBILEE_001", "NHIA_GH_002", "DISCOVERY_ZA_003", "RSSB_RW_004"];

export const STAFF: Staff[] = [
  { id: "U-1", name: "Wanjiku Mwangi", email: "wanjiku@jubilee.co.ke", role: "analyst", active: true, lastLogin: "2026-04-30T08:14:00Z" },
  { id: "U-2", name: "Brian Otieno", email: "brian@jubilee.co.ke", role: "fraud", active: true, lastLogin: "2026-04-30T07:52:00Z" },
  { id: "U-3", name: "Grace Kamau", email: "grace@jubilee.co.ke", role: "contracts", active: true, lastLogin: "2026-04-29T16:30:00Z" },
  { id: "U-4", name: "Daniel Njoroge", email: "daniel@jubilee.co.ke", role: "executive", active: true, lastLogin: "2026-04-30T06:05:00Z" },
  { id: "U-5", name: "Fatima Hassan", email: "fatima@jubilee.co.ke", role: "admin", active: true, lastLogin: "2026-04-29T14:21:00Z" },
];

// 12 months trailing — to April 2026
export const SAVINGS_TREND = [
  { month: "May", duplicates: 412, adherence: 180, fraud: 90 },
  { month: "Jun", duplicates: 480, adherence: 210, fraud: 110 },
  { month: "Jul", duplicates: 540, adherence: 260, fraud: 140 },
  { month: "Aug", duplicates: 610, adherence: 290, fraud: 160 },
  { month: "Sep", duplicates: 690, adherence: 330, fraud: 180 },
  { month: "Oct", duplicates: 760, adherence: 380, fraud: 210 },
  { month: "Nov", duplicates: 820, adherence: 420, fraud: 240 },
  { month: "Dec", duplicates: 890, adherence: 470, fraud: 270 },
  { month: "Jan", duplicates: 980, adherence: 520, fraud: 310 },
  { month: "Feb", duplicates: 1040, adherence: 580, fraud: 340 },
  { month: "Mar", duplicates: 1150, adherence: 640, fraud: 380 },
  { month: "Apr", duplicates: 1247, adherence: 712, fraud: 420 },
] as const;

export const HOSPITALS: Hospital[] = [
  { name: "Kenyatta National", region: "Nairobi", savings: 234_000, share: 18.8 },
  { name: "Aga Khan University", region: "Nairobi", savings: 187_000, share: 15.0 },
  { name: "Moi Teaching", region: "Eldoret", savings: 145_000, share: 11.6 },
  { name: "Nairobi West", region: "Nairobi", savings: 98_000, share: 7.9 },
  { name: "MP Shah", region: "Nairobi", savings: 76_000, share: 6.1 },
  { name: "Mater Misericordiae", region: "Nairobi", savings: 61_000, share: 4.9 },
  { name: "Coast General", region: "Mombasa", savings: 54_000, share: 4.3 },
];

export const MED_ADHERENCE: MedicationAdherence[] = [
  { medication: "Lisinopril", rate: 94, patients: 12_400, trend: 2, alert: false },
  { medication: "Metformin", rate: 91, patients: 23_100, trend: 0, alert: false },
  { medication: "Atorvastatin", rate: 87, patients: 8_200, trend: -3, alert: true },
  { medication: "Amlodipine", rate: 84, patients: 15_600, trend: 1, alert: false },
  { medication: "Insulin", rate: 79, patients: 3_400, trend: -2, alert: true },
  { medication: "Salbutamol", rate: 76, patients: 6_800, trend: -1, alert: true },
  { medication: "Levothyroxine", rate: 88, patients: 4_100, trend: 1, alert: false },
];

export const NON_ADHERENT: NonAdherent[] = [
  { patientId: "MP-8472-901", name: "James Otieno", medication: "Atorvastatin", daysOverdue: 5, phone: "+254712345678" },
  { patientId: "MP-3201-118", name: "Mary Wanjiru", medication: "Insulin", daysOverdue: 12, phone: "+254722901234" },
  { patientId: "MP-9987-054", name: "Peter Kariuki", medication: "Atorvastatin", daysOverdue: 3, phone: "+254733442211" },
  { patientId: "MP-1166-873", name: "Aisha Said", medication: "Salbutamol", daysOverdue: 8, phone: "+254700112233" },
  { patientId: "MP-4423-902", name: "Joseph Mutiso", medication: "Insulin", daysOverdue: 21, phone: "+254755667788" },
  { patientId: "MP-6655-220", name: "Lucy Atieno", medication: "Atorvastatin", daysOverdue: 6, phone: "+254766554433" },
];

export const FLAGGED_CLAIMS: FlaggedClaim[] = [
  { id: "CLM-2401", patientId: "MP-8472-901", patientName: "Grace Muthoni", provider: "Mbagathi Hospital", amount: 45, score: 98, pattern: "Duplicate lab (CBC)", status: "pending" },
  { id: "CLM-2402", patientId: "MP-3201-118", patientName: "James Otieno", provider: "Private Lab - Nairobi", amount: 210, score: 95, pattern: "Same X-ray within 2 days", status: "pending" },
  { id: "CLM-2398", patientId: "MP-9987-054", patientName: "John Kamau", provider: "Kenyatta National", amount: 320, score: 92, pattern: "Unusually high test volume", status: "flagged" },
  { id: "CLM-2410", patientId: "MP-1166-873", patientName: "Aisha Said", provider: "Mbagathi Hospital", amount: 180, score: 89, pattern: "Same-day duplicate visit", status: "investigating" },
  { id: "CLM-2415", patientId: "MP-4423-902", patientName: "Joseph Mutiso", provider: "Aga Khan University", amount: 540, score: 76, pattern: "Cost outlier vs cohort", status: "pending" },
  { id: "CLM-2419", patientId: "MP-6655-220", patientName: "Lucy Atieno", provider: "Private Lab - Nairobi", amount: 95, score: 73, pattern: "Repeat lipid panel <30d", status: "pending" },
  { id: "CLM-2423", patientId: "MP-7711-008", patientName: "Mark Owino", provider: "Coast General", amount: 420, score: 71, pattern: "Imaging without referral", status: "cleared" },
];

export const PROVIDERS: Provider[] = [
  { name: "Mbagathi Hospital", totalClaims: 1_247, anomalyScore: 87, flagged: 23 },
  { name: "Private Lab - Nairobi", totalClaims: 892, anomalyScore: 76, flagged: 8 },
  { name: "Kenyatta National", totalClaims: 2_345, anomalyScore: 34, flagged: 2 },
  { name: "Aga Khan University", totalClaims: 1_812, anomalyScore: 28, flagged: 1 },
  { name: "Moi Teaching", totalClaims: 1_109, anomalyScore: 41, flagged: 3 },
  { name: "Nairobi West", totalClaims: 784, anomalyScore: 22, flagged: 0 },
];

export const INVOICES: Invoice[] = [
  { id: "INV-2026-04", period: "Apr 2026", grossSavings: 1_247_000, fee: 249_400, status: "pending", dueDate: "2026-05-15" },
  { id: "INV-2026-03", period: "Mar 2026", grossSavings: 1_150_000, fee: 230_000, status: "paid", dueDate: "2026-04-15", paidDate: "2026-04-09" },
  { id: "INV-2026-02", period: "Feb 2026", grossSavings: 1_040_000, fee: 208_000, status: "paid", dueDate: "2026-03-15", paidDate: "2026-03-11" },
  { id: "INV-2026-01", period: "Jan 2026", grossSavings: 980_000, fee: 196_000, status: "paid", dueDate: "2026-02-15", paidDate: "2026-02-10" },
  { id: "INV-2025-12", period: "Dec 2025", grossSavings: 890_000, fee: 178_000, status: "paid", dueDate: "2026-01-15", paidDate: "2026-01-12" },
  { id: "INV-2025-11", period: "Nov 2025", grossSavings: 820_000, fee: 164_000, status: "paid", dueDate: "2025-12-15", paidDate: "2025-12-10" },
];

export const ALERTS: Alert[] = [
  { id: "A-1", severity: "high", title: "Adherence dropped", message: "Atorvastatin adherence fell below 75% in Nairobi region — investigation recommended.", timestamp: "2026-04-30T07:42:00Z", category: "adherence" },
  { id: "A-2", severity: "high", title: "Duplicate test spike", message: "Mbagathi Hospital duplicate test rate is 340% vs baseline.", timestamp: "2026-04-30T06:14:00Z", category: "fraud" },
  { id: "A-3", severity: "medium", title: "New milestone", message: "KSh 1M in monthly savings reached — share with team.", timestamp: "2026-04-29T18:00:00Z", category: "savings" },
  { id: "A-4", severity: "low", title: "Report ready", message: "Q1 2026 board report has been generated and is available for download.", timestamp: "2026-04-29T11:30:00Z", category: "system" },
];

export const SAVINGS_RECORDS: SavingsRecord[] = Array.from({ length: 24 }, (_, i) => {
  const tests = [
    { type: "Complete Blood Count", cat: "lab" as const, save: 45 },
    { type: "Chest X-ray", cat: "imaging" as const, save: 156 },
    { type: "Lipid Panel", cat: "lab" as const, save: 89 },
    { type: "MRI Knee", cat: "imaging" as const, save: 480 },
    { type: "Liver Function Test", cat: "lab" as const, save: 62 },
    { type: "ECG", cat: "other" as const, save: 38 },
  ];
  const t = tests[i % tests.length];
  const provs = ["Kenyatta National", "Aga Khan University", "Moi Teaching", "Mbagathi Hospital", "MP Shah", "Nairobi West"];
  const day = String(((i * 3) % 28) + 1).padStart(2, "0");
  return {
    id: `SAV-${1000 + i}`,
    patientId: `MP-${8000 + i}-${100 + i}`,
    testType: t.type,
    category: t.cat,
    firstTestDate: `2026-04-${day}`,
    firstProvider: provs[i % provs.length],
    attemptedDate: `2026-04-${String(Math.min(28, ((i * 3) % 28) + 3)).padStart(2, "0")}`,
    attemptedProvider: provs[(i + 2) % provs.length],
    preventionMethod: "MediPass duplicate alert",
    savings: t.save,
    timestamp: `2026-04-${day}T09:23:15Z`,
  };
});

export const AUDIT_LOG: AuditEntry[] = [
  { id: "L-1", user: "Wanjiku Mwangi", role: "analyst", action: "Generated report", resource: "Monthly board report — Apr 2026", ip: "41.90.12.4", timestamp: "2026-04-30T08:15:00Z" },
  { id: "L-2", user: "Brian Otieno", role: "fraud", action: "Investigated claim", resource: "CLM-2410", ip: "41.90.12.4", timestamp: "2026-04-30T07:55:00Z" },
  { id: "L-3", user: "Daniel Njoroge", role: "executive", action: "Logged in", resource: "/dashboard", ip: "196.207.8.2", timestamp: "2026-04-30T06:05:00Z" },
  { id: "L-4", user: "Grace Kamau", role: "contracts", action: "Downloaded invoice", resource: "INV-2026-03.pdf", ip: "41.90.12.4", timestamp: "2026-04-29T16:32:00Z" },
  { id: "L-5", user: "Wanjiku Mwangi", role: "analyst", action: "Exported CSV", resource: "Adherence report — Mar 2026", ip: "41.90.12.4", timestamp: "2026-04-29T14:11:00Z" },
  { id: "L-6", user: "Fatima Hassan", role: "admin", action: "Updated user", resource: "U-2 (Brian Otieno) — role changed", ip: "41.90.12.4", timestamp: "2026-04-29T11:08:00Z" },
];

// Top metrics
export const KPI = {
  totalSavings: 1_247_000,            // KSh this month
  totalSavingsDelta: 23,              // % vs last month
  members: 247_000,
  membersDelta: 5,
  adherence: 82,                      // %
  adherenceTarget: 85,
  roi: 3.4,                           // x
  fee: 249_400,
  duplicateTests: 12_847,
  hospitalizationsPrevented: 312,
};
