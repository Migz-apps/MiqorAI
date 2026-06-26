import request from "supertest";
import { createApp } from "../../src/app.js";
import { connectDb, disconnectDb, prisma } from "../../src/lib/prisma.js";

export const app = createApp();
export const PASSWORD = "MiqorAI123!";

export type Role = "admin" | "patient" | "hospital" | "hospitalAdmin" | "pharmacy" | "insurer";

export interface TestContext {
  tokens: Record<Role, string>;
  refreshTokens: Partial<Record<Role, string>>;
  userIds: Record<Role, string>;
  patientId: string;
  patientUserId: string;
  hospitalId: string;
  hospitalIdAlt: string;
  pharmacyId: string;
  insurerId: string;
  visitId: string;
  visitIdWaiting: string;
  prescriptionId: string;
  prescriptionIdPending: string;
  claimId: string;
  grantId: string;
  recordId: string;
  labOrderId: string;
  departmentId: string;
  inventoryId: string;
  pharmacyStaffUserId: string;
  hospitalDoctorUserId: string;
  onboardingRequestId: string;
  dependentPatientId: string;
  familyMemberId: string;
  emergencyContactId: string;
  qrHash: string;
  toHospitalId: string;
}

let ctx: TestContext | null = null;

async function login(
  email: string,
  password: string,
  organization_code?: string,
): Promise<{ access_token: string; refresh_token: string; user: { id: string } }> {
  const res = await request(app)
    .post("/api/auth/login")
    .send({ email, password, organization_code });
  if (res.status !== 200) {
    throw new Error(`Login failed for ${email}: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body;
}

export async function initTestContext(): Promise<TestContext> {
  await connectDb();
  if (ctx) return ctx;
  await prisma.loginAttempt.deleteMany();
  await prisma.hospital.updateMany({
    where: { code: { in: ["KMC001", "SCH001"] } },
    data: { isActive: true },
  });
  await prisma.pharmacy.updateMany({ where: { code: "MPH001" }, data: { isActive: true } });
  await prisma.insurer.updateMany({ where: { code: "NHI001" }, data: { isActive: true } });

  const adminLogin = await login("admin@miqorai.com", PASSWORD);
  const patientLogin = await login("grace.muthoni@example.com", PASSWORD);
  const hospitalLogin = await login("dr.kimani@example.com", PASSWORD, "KMC001");
  const hospitalAdminLogin = await login("admin.sarah@example.com", PASSWORD, "SCH001");
  const pharmacyLogin = await login("pharm.kevin@example.com", PASSWORD, "MPH001");
  const insurerLogin = await login("claims.reviewer@nhidemo.demo", PASSWORD, "NHI001");

  const patient = await prisma.patient.findFirst({
    where: { user: { email: "grace.muthoni@example.com" } },
    include: { user: true },
  });
  if (!patient) throw new Error("Seed patient not found");

  const hospital = await prisma.hospital.findFirst({ where: { code: "KMC001" } });
  const hospitalAlt = await prisma.hospital.findFirst({ where: { code: "SCH001" } });
  const pharmacy = await prisma.pharmacy.findFirst({ where: { code: "MPH001" } });
  const insurer = await prisma.insurer.findFirst({ where: { code: "NHI001" } });
  if (!hospital || !hospitalAlt || !pharmacy || !insurer) {
    throw new Error("Seed organizations not found");
  }

  const visit = await prisma.visit.findFirst({
    where: { patientId: patient.id, hospitalId: hospital.id },
    orderBy: { checkedInAt: "desc" },
  });
  const waitingVisit = await prisma.visit.findFirst({
    where: { patientId: patient.id, hospitalId: hospital.id, status: "waiting" },
  });
  const prescription = await prisma.prescription.findFirst({
    where: { patientId: patient.id, pharmacyId: pharmacy.id },
    orderBy: { prescribedAt: "desc" },
  });
  const pendingRx = await prisma.prescription.findFirst({
    where: { patientId: patient.id, pharmacyId: pharmacy.id, status: "pending" },
  });
  const claim = await prisma.claim.findFirst({ where: { insurerId: insurer.id } });
  const grant = await prisma.accessGrant.findFirst({ where: { patientId: patient.id } });
  const record = await prisma.medicalRecord.findFirst({ where: { patientId: patient.id } });
  const lab = await prisma.labOrder.findFirst({ where: { patientId: patient.id } });
  const department = await prisma.department.findFirst({ where: { hospitalId: hospital.id } });
  const inventory = await prisma.pharmacyInventory.findFirst({ where: { pharmacyId: pharmacy.id } });
  const pharmStaff = await prisma.user.findFirst({ where: { email: "pharm.kevin@example.com" } });
  const doctor = await prisma.user.findFirst({ where: { email: "dr.kimani@example.com" } });
  const onboarding = await prisma.onboardingRequest.findFirst({ where: { status: "pending" } });
  const family = await prisma.familyMember.findFirst({ where: { primaryPatientId: patient.id } });
  const dependent = family
    ? await prisma.patient.findUnique({ where: { id: family.dependentPatientId } })
    : null;
  const emergency = await prisma.emergencyContact.findFirst({ where: { patientId: patient.id } });

  ctx = {
    tokens: {
      admin: adminLogin.access_token,
      patient: patientLogin.access_token,
      hospital: hospitalLogin.access_token,
      hospitalAdmin: hospitalAdminLogin.access_token,
      pharmacy: pharmacyLogin.access_token,
      insurer: insurerLogin.access_token,
    },
    refreshTokens: {
      admin: adminLogin.refresh_token,
      patient: patientLogin.refresh_token,
      hospital: hospitalLogin.refresh_token,
      pharmacy: pharmacyLogin.refresh_token,
      insurer: insurerLogin.refresh_token,
    },
    userIds: {
      admin: adminLogin.user.id,
      patient: patientLogin.user.id,
      hospital: hospitalLogin.user.id,
      hospitalAdmin: hospitalAdminLogin.user.id,
      pharmacy: pharmacyLogin.user.id,
      insurer: insurerLogin.user.id,
    },
    patientId: patient.id,
    patientUserId: patient.userId,
    hospitalId: hospital.id,
    hospitalIdAlt: hospitalAlt.id,
    pharmacyId: pharmacy.id,
    insurerId: insurer.id,
    visitId: visit?.id ?? "",
    visitIdWaiting: waitingVisit?.id ?? visit?.id ?? "",
    prescriptionId: prescription?.id ?? "",
    prescriptionIdPending: pendingRx?.id ?? prescription?.id ?? "",
    claimId: claim?.id ?? "",
    grantId: grant?.id ?? "",
    recordId: record?.id ?? "",
    labOrderId: lab?.id ?? "",
    departmentId: department?.id ?? "",
    inventoryId: inventory?.id ?? "",
    pharmacyStaffUserId: pharmStaff?.id ?? "",
    hospitalDoctorUserId: doctor?.id ?? "",
    onboardingRequestId: onboarding?.id ?? "",
    dependentPatientId: dependent?.id ?? "",
    familyMemberId: family?.id ?? "",
    emergencyContactId: emergency?.id ?? "",
    qrHash: patient.qrCodeHash ?? "",
    toHospitalId: hospitalAlt.id,
  };

  return ctx;
}

export function getContext(): TestContext {
  if (!ctx) throw new Error("Test context not initialized — call initTestContext() in beforeAll");
  return ctx;
}

export async function teardownTestContext(): Promise<void> {
  await disconnectDb();
  ctx = null;
}

export function auth(role: Role): string {
  return `Bearer ${getContext().tokens[role]}`;
}

export function expectSuccess(status: number): void {
  const ok = [200, 201, 204].includes(status);
  if (!ok) {
    throw new Error(`Expected success status, got ${status}`);
  }
}

function bearer(role: Role): string {
  return `Bearer ${getContext().tokens[role]}`;
}

export function authed(role: Role) {
  const agent = request(app);
  const header = bearer(role);
  return {
    get: (url: string) => agent.get(url).set("Authorization", header),
    post: (url: string) => agent.post(url).set("Authorization", header),
    put: (url: string) => agent.put(url).set("Authorization", header),
    patch: (url: string) => agent.patch(url).set("Authorization", header),
    delete: (url: string) => agent.delete(url).set("Authorization", header),
  };
}
