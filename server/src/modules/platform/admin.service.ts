import { OnboardingStatus, OnboardingType, UserRole } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { config } from "../../config.js";
import { hashPassword, hashToken, randomToken } from "../../shared/utils/crypto.js";
import { saveExportFile } from "../../shared/services/file.service.js";
import { sendInvitationEmail, sendOnboardingApprovedEmail, sendOnboardingRejectedEmail } from "../../shared/services/notification.service.js";
import { writeAuditLog } from "../../shared/services/audit.service.js";
import { badRequest, conflict, notFound } from "../../shared/utils/errors.js";
import { getRedis } from "../../shared/lib/redis.js";
import { buildInvitationUrl } from "../identity/invitation.service.js";

export async function getAdminDashboard() {
  const [
    patients,
    hospitals,
    pharmacies,
    insurers,
    pendingApprovals,
    openDisputes,
    savings,
    revenue,
    activity,
    nodes,
  ] = await Promise.all([
    prisma.patient.count({ where: { isActive: true } }),
    prisma.hospital.count({ where: { isActive: true, verified: true } }),
    prisma.pharmacy.count({ where: { isActive: true, verified: true } }),
    prisma.insurer.count({ where: { isActive: true } }),
    prisma.onboardingRequest.count({ where: { status: "pending" } }),
    prisma.dispute.count({ where: { status: { in: ["open", "investigating"] } } }),
    prisma.savingsRecord.aggregate({ _sum: { savings: true } }),
    prisma.revenueSnapshot.findMany({ orderBy: { month: "desc" }, take: 1 }),
    prisma.activityFeedEntry.findMany({ orderBy: { createdAt: "desc" }, take: 15 }),
    prisma.networkNode.findMany(),
  ]);

  const latestRevenue = revenue[0];
  const mrr = latestRevenue
    ? Number(latestRevenue.insurersRevenue) +
      Number(latestRevenue.hospitalsRevenue) +
      Number(latestRevenue.pharmaciesRevenue)
    : 0;

  return {
    total_patients: patients,
    total_hospitals: hospitals,
    total_pharmacies: pharmacies,
    total_insurers: insurers,
    mrr,
    arr: mrr * 12,
    total_savings: Number(savings._sum.savings ?? 0),
    pending_approvals: pendingApprovals,
    open_disputes: openDisputes,
    system_health: await getSystemHealth(),
    recent_activity: activity,
    network_nodes: nodes,
  };
}

export async function getSystemHealth() {
  const redis = getRedis();
  let redisStatus = "down";
  try {
    if (redis.status === "ready") {
      await redis.ping();
      redisStatus = "up";
    } else {
      await redis.connect();
      await redis.ping();
      redisStatus = "up";
    }
  } catch {
    redisStatus = "down";
  }

  let databaseStatus = "down";
  let connections = 0;
  try {
    await prisma.$queryRaw`SELECT 1`;
    databaseStatus = "up";
    const rows = await prisma.$queryRaw<Array<{ count: bigint }>>`
      SELECT count(*)::bigint AS count FROM pg_stat_activity WHERE datname = current_database()
    `;
    connections = Number(rows[0]?.count ?? 0);
  } catch {
    databaseStatus = "down";
  }

  const pendingSync = await prisma.syncQueue.count({ where: { status: "pending" } });

  return {
    api_gateway: { status: "up", uptime: process.uptime() },
    database: { status: databaseStatus, connections },
    redis: { status: redisStatus },
    sync_queue: { pending: pendingSync },
  };
}

export async function listHospitals(filters: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.status === "pending") where.verified = false;
  if (filters.status === "active") where.verified = true;
  if (filters.status === "disabled") where.isActive = false;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.hospital.findMany({
      where,
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
      orderBy: { createdAt: "desc" },
    }),
    prisma.hospital.count({ where }),
  ]);
  return { items, total };
}

export async function getHospital(id: string) {
  const hospital = await prisma.hospital.findUnique({
    where: { id },
    include: { staff: { include: { user: { select: { email: true, phone: true } } } } },
  });
  if (!hospital) throw notFound("Hospital not found");
  return hospital;
}

export async function setHospitalStatus(id: string, active: boolean) {
  return prisma.hospital.update({ where: { id }, data: { isActive: active } });
}

export async function approveHospital(
  id: string,
  verifiedBy: string,
  pilotEndDate?: string,
) {
  const hospital = await prisma.hospital.update({
    where: { id },
    data: {
      verified: true,
      verifiedBy,
      verifiedAt: new Date(),
      pilotEndDate: pilotEndDate ? new Date(pilotEndDate) : null,
      isActive: true,
    },
  });

  await prisma.onboardingRequest.updateMany({
    where: { organizationId: id, type: "hospital" },
    data: { status: "approved", reviewedBy: verifiedBy, reviewedAt: new Date() },
  });

  await prisma.activityFeedEntry.create({
    data: {
      kind: "approval",
      text: `Hospital approved: ${hospital.name}`,
      actor: "Admin",
    },
  });

  return { status: "approved", hospital };
}

export async function rejectHospital(id: string, reason: string, reviewedBy: string) {
  await prisma.hospital.update({ where: { id }, data: { isActive: false } });
  await prisma.onboardingRequest.updateMany({
    where: { organizationId: id, type: "hospital" },
    data: { status: "rejected", rejectReason: reason, reviewedBy, reviewedAt: new Date() },
  });
  return { status: "rejected" };
}

export async function listPharmacies(filters: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.status === "pending") where.verified = false;
  if (filters.status === "active") where.verified = true;
  if (filters.status === "disabled") where.isActive = false;
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { code: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [items, total] = await Promise.all([
    prisma.pharmacy.findMany({
      where,
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
      orderBy: { createdAt: "desc" },
    }),
    prisma.pharmacy.count({ where }),
  ]);
  return { items, total };
}

export async function approvePharmacy(id: string, verifiedBy: string) {
  const pharmacy = await prisma.pharmacy.update({
    where: { id },
    data: { verified: true, verifiedBy, verifiedAt: new Date(), isActive: true },
  });
  await prisma.onboardingRequest.updateMany({
    where: { organizationId: id, type: "pharmacy" },
    data: { status: "approved", reviewedBy: verifiedBy, reviewedAt: new Date() },
  });
  return { status: "approved", pharmacy };
}

export async function setPharmacyStatus(id: string, active: boolean) {
  return prisma.pharmacy.update({ where: { id }, data: { isActive: active } });
}

export async function listInsurers() {
  return prisma.insurer.findMany({ orderBy: { name: "asc" } });
}

export async function createInsurer(data: {
  name: string;
  registration_number: string;
  fee_percentage: number;
  code?: string;
  country?: string;
  currency?: string;
}) {
  return prisma.insurer.create({
    data: {
      name: data.name,
      registrationNumber: data.registration_number,
      code: data.code ?? data.registration_number,
      feePercentage: data.fee_percentage,
      country: data.country,
      currency: data.currency ?? "KES",
    },
  });
}

export async function updateInsurer(id: string, data: Partial<{
  name: string;
  fee_percentage: number;
  is_active: boolean;
  contract_start_date: string;
  contract_end_date: string;
}>) {
  return prisma.insurer.update({
    where: { id },
    data: {
      name: data.name,
      feePercentage: data.fee_percentage,
      isActive: data.is_active,
      contractStartDate: data.contract_start_date ? new Date(data.contract_start_date) : undefined,
      contractEndDate: data.contract_end_date ? new Date(data.contract_end_date) : undefined,
    },
  });
}

export async function listDisputes(filters: {
  status?: string;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.status) where.status = filters.status;

  const [items, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: {
        patient: { select: { firstName: true, lastName: true } },
        hospital: { select: { name: true } },
        pharmacy: { select: { name: true } },
      },
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.dispute.count({ where }),
  ]);
  return { items, total };
}

export async function updateDispute(
  id: string,
  status: "investigating" | "resolved" | "rejected",
  resolutionNotes: string | undefined,
  resolvedBy: string,
) {
  return prisma.dispute.update({
    where: { id },
    data: {
      status,
      resolutionNotes,
      resolvedBy,
    },
  });
}

export async function listAuditLogsAdmin(filters: {
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.userId) where.userId = filters.userId;
  if (filters.action) where.action = filters.action;
  if (filters.startDate || filters.endDate) {
    where.createdAt = {
      ...(filters.startDate ? { gte: filters.startDate } : {}),
      ...(filters.endDate ? { lte: filters.endDate } : {}),
    };
  }

  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: filters.limit ?? 100,
      skip: filters.offset ?? 0,
    }),
    prisma.auditLog.count({ where }),
  ]);
  return { items, total };
}

export async function exportAuditLogs(
  userId: string,
  start: string,
  end: string,
  format: "csv" | "json",
) {
  const logs = await prisma.auditLog.findMany({
    where: {
      createdAt: {
        gte: new Date(start),
        lte: new Date(end),
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const content =
    format === "csv"
      ? ["timestamp,user,action,resource,success", ...logs.map((l) =>
          `${l.createdAt.toISOString()},${l.userEmail ?? ""},${l.action},${l.resourceType}:${l.resourceId ?? ""},${l.success}`,
        )].join("\n")
      : JSON.stringify(logs, null, 2);

  const url = await saveExportFile(userId, `audit-export.${format}`, content, "text/plain");
  return { download_url: url };
}

export async function getRevenue(period: string) {
  const snapshots = await prisma.revenueSnapshot.findMany({ orderBy: { month: "desc" }, take: 12 });
  const latest = snapshots[0];
  const mrr = latest
    ? Number(latest.insurersRevenue) + Number(latest.hospitalsRevenue) + Number(latest.pharmaciesRevenue)
    : 0;

  return {
    mrr,
    arr: mrr * 12,
    total_revenue: snapshots.reduce(
      (s, r) => s + Number(r.insurersRevenue) + Number(r.hospitalsRevenue) + Number(r.pharmaciesRevenue),
      0,
    ),
    by_customer_type: snapshots.map((r) => ({
      month: r.month,
      insurers: Number(r.insurersRevenue),
      hospitals: Number(r.hospitalsRevenue),
      pharmacies: Number(r.pharmaciesRevenue),
    })),
    projected: { mrr: mrr * 1.05 },
    period,
  };
}

export async function createInvitation(
  email: string,
  role: string,
  organizationId?: string,
) {
  const token = randomToken();
  const invitation = await prisma.invitation.create({
    data: {
      email: email.toLowerCase(),
      role,
      organizationId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + config.invitationExpiryDays * 86400000),
    },
  });
  const inviteUrl = await buildInvitationUrl(invitation.organizationId, token);
  await sendInvitationEmail(email, inviteUrl);
  return { invitation_id: invitation.id, invite_url: inviteUrl };
}

export async function listInvitations() {
  return prisma.invitation.findMany({
    where: { acceptedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
}

export async function deleteInvitation(id: string) {
  await prisma.invitation.delete({ where: { id } });
}

export async function listSyncQueue() {
  return prisma.syncQueue.findMany({
    where: { status: { in: ["pending", "failed"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function retrySyncQueue(id: string) {
  const item = await prisma.syncQueue.findUnique({ where: { id } });
  if (!item) throw notFound("Queue item not found");
  await prisma.syncQueue.update({
    where: { id },
    data: { status: "pending", retryCount: { increment: 1 } },
  });
  return { status: "pending" };
}

export async function deleteSyncQueueItem(id: string) {
  await prisma.syncQueue.delete({ where: { id } });
}

export async function getPlatformSettings() {
  const rows = await prisma.platformSetting.findMany();
  const settings: Record<string, unknown> = {};
  for (const row of rows) settings[row.key] = row.value;
  return {
    default_pilot_duration_days: settings.default_pilot_duration_days ?? 90,
    infrastructure_fee_usd: settings.infrastructure_fee_usd ?? 0.01,
    savings_fee_percentage: settings.savings_fee_percentage ?? 20,
    invitation_expiry_days: settings.invitation_expiry_days ?? 7,
    ...settings,
  };
}

export async function updatePlatformSettings(data: Record<string, unknown>) {
  for (const [key, value] of Object.entries(data)) {
    await prisma.platformSetting.upsert({
      where: { key },
      create: { key, value: value as object },
      update: { value: value as object },
    });
  }
  return getPlatformSettings();
}

export async function listPendingApprovals() {
  return prisma.onboardingRequest.findMany({
    where: { status: "pending" },
    orderBy: { createdAt: "desc" },
  });
}

export async function listPlatformPatients(limit = 50, offset = 0) {
  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where: { isActive: true },
      include: { user: { select: { email: true, phone: true } } },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
    prisma.patient.count({ where: { isActive: true } }),
  ]);
  return { items, total };
}

export async function getHourlyMetrics() {
  const since = new Date(Date.now() - 24 * 3600000);
  return prisma.hourlyMetric.findMany({
    where: { hour: { gte: since } },
    orderBy: { hour: "asc" },
  });
}

export async function createOnboardingRequest(data: {
  type: OnboardingType;
  name: string;
  registration_ref: string;
  location?: string;
  submitted_by_email: string;
  password?: string;
}) {
  return prisma.onboardingRequest.create({
    data: {
      type: data.type,
      name: data.name,
      registrationRef: data.registration_ref,
      location: data.location,
      submittedByEmail: data.submitted_by_email,
      // Only the scrypt hash is ever stored; the plaintext is discarded here.
      passwordHash: data.password ? hashPassword(data.password) : null,
    },
  });
}


export async function listPlatformInvoices() {
  return prisma.platformInvoice.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getNetworkMap() {
  return prisma.networkNode.findMany();
}

const ONBOARDING_ADMIN_ROLE: Record<OnboardingType, UserRole> = {
  hospital: UserRole.hospital_admin,
  pharmacy: UserRole.pharmacy_manager,
  insurer: UserRole.insurer_admin,
};

function onboardingOrgCode(registrationRef: string) {
  return registrationRef.toUpperCase().replace(/\s+/g, "_").slice(0, 32);
}

async function createOnboardedOrganization(req: {
  type: OnboardingType;
  name: string;
  registrationRef: string;
  location: string | null;
  submittedByEmail: string;
}, reviewerId: string): Promise<string> {
  const code = onboardingOrgCode(req.registrationRef);
  const verification = {
    verified: true,
    verifiedBy: reviewerId,
    verifiedAt: new Date(),
    isActive: true,
  };

  if (req.type === "hospital") {
    const dup = await prisma.hospital.findFirst({
      where: { OR: [{ name: req.name }, { code }, { registrationNumber: req.registrationRef }] },
    });
    if (dup) throw conflict("A hospital with this name or code already exists");
    const hospital = await prisma.hospital.create({
      data: {
        code,
        name: req.name,
        registrationNumber: req.registrationRef,
        // Unused by the app, but unique in the schema: derive from the unique code.
        emailDomain: `${code.toLowerCase()}.miqorai.local`,
        address: req.location,
        ...verification,
      },
    });
    return hospital.id;
  }

  if (req.type === "pharmacy") {
    const dup = await prisma.pharmacy.findFirst({
      where: { OR: [{ name: req.name }, { code }, { licenseNumber: req.registrationRef }] },
    });
    if (dup) throw conflict("A pharmacy with this name or code already exists");
    const pharmacy = await prisma.pharmacy.create({
      data: {
        code,
        name: req.name,
        licenseNumber: req.registrationRef,
        address: req.location,
        ...verification,
      },
    });
    return pharmacy.id;
  }

  const dup = await prisma.insurer.findFirst({
    where: { OR: [{ name: req.name }, { code }, { registrationNumber: req.registrationRef }] },
  });
  if (dup) throw conflict("An insurer with this name or code already exists");
  const insurer = await prisma.insurer.create({
    data: {
      code,
      name: req.name,
      registrationNumber: req.registrationRef,
      address: req.location,
      isActive: true,
    },
  });
  return insurer.id;
}

async function createOnboardedAdminUser(
  req: { type: OnboardingType; submittedByEmail: string; passwordHash: string },
  organizationId: string,
) {
  const email = req.submittedByEmail.toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) throw conflict("A user with this email already exists");

  const user = await prisma.user.create({
    data: {
      email,
      // The hash was produced by the same scrypt util at submission time, so it
      // is used verbatim as the account's password hash.
      passwordHash: req.passwordHash,
      role: ONBOARDING_ADMIN_ROLE[req.type],
      organizationId,
      organizationType: req.type,
    },
  });

  if (req.type === "hospital") {
    await prisma.hospitalStaff.create({
      data: { hospitalId: organizationId, userId: user.id, role: "admin" },
    });
  } else if (req.type === "pharmacy") {
    await prisma.pharmacyStaff.create({
      data: { pharmacyId: organizationId, userId: user.id, role: "manager" },
    });
  } else {
    await prisma.insurerStaff.create({
      data: { insurerId: organizationId, userId: user.id, role: "admin" },
    });
  }

  return user;
}

export async function approveOnboardingRequest(id: string, reviewerId: string) {
  const req = await prisma.onboardingRequest.findUnique({ where: { id } });
  if (!req) throw notFound("Onboarding request not found");
  if (req.status !== "pending") throw badRequest("Onboarding request has already been reviewed");

  const organizationId = await createOnboardedOrganization(req, reviewerId);
  const adminUser = req.passwordHash
    ? await createOnboardedAdminUser({ type: req.type, submittedByEmail: req.submittedByEmail, passwordHash: req.passwordHash }, organizationId)
    : null;

  await prisma.onboardingRequest.update({
    where: { id },
    data: {
      status: "approved",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      organizationId,
      // The hash has served its purpose (or was absent): never keep it around.
      passwordHash: null,
    },
  });

  await prisma.activityFeedEntry.create({
    data: {
      kind: "approval",
      text: `${req.type} onboarding approved: ${req.name}`,
      actor: "Admin",
    },
  });

  await sendOnboardingApprovedEmail(req.submittedByEmail, req.name, req.type, Boolean(adminUser));

  return { status: "approved", organization_id: organizationId, admin_user_id: adminUser?.id ?? null };
}

export async function rejectOnboardingRequest(id: string, reviewerId: string, reason: string) {
  const req = await prisma.onboardingRequest.findUnique({ where: { id } });
  if (!req) throw notFound("Onboarding request not found");

  await prisma.onboardingRequest.update({
    where: { id },
    data: {
      status: "rejected",
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
      rejectReason: reason,
      passwordHash: null,
    },
  });

  await sendOnboardingRejectedEmail(req.submittedByEmail, req.name, reason);

  return { status: "rejected" };
}

export async function searchPlatformPatients(q: string, limit = 50, offset = 0) {
  const where = {
    isActive: true,
    OR: [
      { firstName: { contains: q, mode: "insensitive" as const } },
      { lastName: { contains: q, mode: "insensitive" as const } },
      { nationalId: { contains: q, mode: "insensitive" as const } },
      { insuranceId: { contains: q, mode: "insensitive" as const } },
      { user: { phone: { contains: q, mode: "insensitive" as const } } },
      { user: { email: { contains: q, mode: "insensitive" as const } } },
    ],
  };
  const [items, total] = await Promise.all([
    prisma.patient.findMany({
      where,
      include: {
        user: { select: { email: true, phone: true } },
        visits: { take: 1, orderBy: { checkedInAt: "desc" } },
        claims: { where: { status: "flagged" }, take: 1 },
      },
      take: limit,
      skip: offset,
      orderBy: { createdAt: "desc" },
    }),
    prisma.patient.count({ where }),
  ]);
  return {
    items: items.map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`,
      email: p.user.email,
      phone: p.user.phone,
      national_id: p.nationalId,
      insurance_id: p.insuranceId,
      visit_count: p.visits.length,
      flagged: p.claims.length > 0,
    })),
    total,
  };
}

export async function listPlatformTransactions(limit = 100) {
  return prisma.activityFeedEntry.findMany({
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function listHospitalsWithStats(filters: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const base = await listHospitals(filters);
  const items = await Promise.all(
    base.items.map(async (h) => {
      const patients = await prisma.visit.groupBy({ by: ["patientId"], where: { hospitalId: h.id } });
      const patientIds = patients.map((p) => p.patientId);
      const savingsAgg =
        patientIds.length > 0
          ? await prisma.savingsRecord.aggregate({
              where: { patientId: { in: patientIds } },
              _sum: { savings: true },
            })
          : { _sum: { savings: null } };
      return {
        ...h,
        patient_count: patients.length,
        total_savings: Number(savingsAgg._sum.savings ?? 0),
        pilot_days_remaining: h.pilotEndDate
          ? Math.max(0, Math.ceil((h.pilotEndDate.getTime() - Date.now()) / 86400000))
          : null,
      };
    }),
  );
  return { items, total: base.total };
}

export async function listPharmaciesWithStats(filters: {
  status?: string;
  search?: string;
  limit?: number;
  offset?: number;
}) {
  const base = await listPharmacies(filters);
  const items = await Promise.all(
    base.items.map(async (p) => {
      const scripts = await prisma.prescription.count({ where: { pharmacyId: p.id } });
      return { ...p, script_volume: scripts };
    }),
  );
  return { items, total: base.total };
}
