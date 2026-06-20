export const mockUser = {
  id: "MP-8472-901",
  name: "Grace Muthoni",
  email: "grace.muthoni@example.com",
  phone: "+254 712 345 678",
  dob: "1985-03-12",
  nationalId: "12345678",
  insuranceId: "NHIF-87654321",
};

export const mockConditions = [
  { id: 1, name: "Hypertension", since: "2019-06", status: "Managed", notes: "Stage 1, lifestyle controlled" },
  { id: 2, name: "Type 2 Diabetes", since: "2021-02", status: "Active", notes: "HbA1c 6.8%" },
];

export const mockMedications = [
  { id: 1, name: "Metformin", dose: "500mg", freq: "Twice daily", since: "2021-02" },
  { id: 2, name: "Lisinopril", dose: "10mg", freq: "Once daily", since: "2019-07" },
  { id: 3, name: "Vitamin D3", dose: "1000 IU", freq: "Once daily", since: "2022-01" },
];

export const mockAllergies = [
  { id: 1, name: "Penicillin", severity: "Severe", reaction: "Anaphylaxis" },
  { id: 2, name: "Peanuts", severity: "Moderate", reaction: "Hives, swelling" },
];

export const mockLabResults = [
  { id: 1, test: "Complete Blood Count", date: "2026-04-12", result: "Normal", flag: "ok" },
  { id: 2, test: "HbA1c", date: "2026-04-12", result: "6.8%", flag: "warn" },
  { id: 3, test: "Lipid Panel", date: "2026-03-02", result: "Normal", flag: "ok" },
  { id: 4, test: "Blood Pressure", date: "2026-05-01", result: "128/82", flag: "warn" },
];

export const mockImmunizations = [
  { id: 1, name: "COVID-19 Booster", date: "2025-10-14" },
  { id: 2, name: "Influenza", date: "2025-09-02" },
  { id: 3, name: "Tetanus", date: "2023-05-21" },
];

export const mockProcedures = [
  { id: 1, name: "Appendectomy", date: "2015-08-04", provider: "Nairobi Hospital" },
  { id: 2, name: "Wisdom Teeth Removal", date: "2010-12-12", provider: "Dental Plus" },
];

export const mockAppointments = [
  { id: 1, doctor: "Dr. Wanjiku", specialty: "Endocrinology", date: "2026-06-04", time: "10:30" },
  { id: 2, doctor: "Dr. Otieno", specialty: "Cardiology", date: "2026-06-18", time: "14:00" },
];

export const mockActivity = [
  { id: 1, text: "Lab results uploaded by Aga Khan Hospital", time: "2 hours ago" },
  { id: 2, text: "Dr. Otieno viewed your records", time: "Yesterday" },
  { id: 3, text: "Prescription refilled: Metformin", time: "3 days ago" },
];

export const mockGrants = [
  { id: 1, name: "Dr. Wanjiku Kamau", org: "Nairobi Hospital", scope: "Full Access", expires: "2026-07-01" },
  { id: 2, name: "Aga Khan Lab", org: "Aga Khan University Hospital", scope: "Lab Results", expires: "2026-06-15" },
];

export const mockAccessLog = [
  { id: 1, who: "Dr. Wanjiku", action: "Viewed conditions", time: "2 hours ago" },
  { id: 2, who: "Aga Khan Lab", action: "Uploaded lab results", time: "Yesterday" },
  { id: 3, who: "Dr. Otieno", action: "Viewed medications", time: "3 days ago" },
];

export const mockFamily = [
  { id: "MP-1001", name: "Baby Amani", relationship: "Child", dob: "2020-08-15", access: "Full" },
  { id: "MP-1002", name: "John Muthoni", relationship: "Spouse", dob: "1982-11-03", access: "Caregiver" },
];

export const mockEmergencyContacts = [
  { id: 1, name: "John Muthoni", phone: "+254 722 111 222", relationship: "Spouse" },
  { id: 2, name: "Mary Achieng", phone: "+254 733 444 555", relationship: "Sister" },
];

export const mockRecovery = "abandon ability able about above absent absorb abstract absurd abuse access accident";
