import crypto from "crypto";
import { prisma } from "../lib/prisma.js";
import { hashToken, randomToken } from "../utils/crypto.js";
import { notFound } from "../utils/errors.js";
import { getOrgSettings, setOrgSettings } from "./hospital-ext.service.js";

export async function listInsurerApiKeys(insurerId: string) {
  const keys = await prisma.insurerApiKey.findMany({
    where: { insurerId, revokedAt: null },
    orderBy: { createdAt: "desc" },
  });
  return keys.map((k) => ({
    id: k.id,
    label: k.label,
    key_prefix: k.keyPrefix,
    last_used_at: k.lastUsedAt,
    created_at: k.createdAt,
  }));
}

export async function createInsurerApiKey(insurerId: string, label: string) {
  const raw = `miq_${randomToken()}`;
  const key = await prisma.insurerApiKey.create({
    data: {
      insurerId,
      label,
      keyPrefix: raw.slice(0, 12),
      keyHash: hashToken(raw),
    },
  });
  return { id: key.id, api_key: raw, key_prefix: key.keyPrefix };
}

export async function revokeInsurerApiKey(insurerId: string, keyId: string) {
  await prisma.insurerApiKey.updateMany({
    where: { id: keyId, insurerId },
    data: { revokedAt: new Date() },
  });
}

export async function getInsurerContractUsage(insurerId: string) {
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");
  const members = await prisma.insurerMember.count({ where: { insurerId } });
  const apiCalls = await prisma.auditLog.count({
    where: { organizationId: insurerId, createdAt: { gte: new Date(Date.now() - 30 * 86400000) } },
  });
  const settings = (await getOrgSettings("insurer", insurerId)) as Record<string, number>;
  return {
    members_enrolled: members,
    member_allowance: settings.member_allowance ?? 100000,
    api_calls_30d: apiCalls,
    api_call_limit: settings.api_call_limit ?? 1000000,
    storage_used_mb: settings.storage_used_mb ?? 12.4,
    storage_limit_mb: settings.storage_limit_mb ?? 100,
    fee_percentage: Number(insurer.feePercentage),
  };
}

export async function listInsurerReportHistory(insurerId: string) {
  return prisma.reportHistory.findMany({
    where: { ownerType: "insurer", ownerId: insurerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listEnrichedInsurerMembers(
  insurerId: string,
  filters: { status?: string; search?: string; limit?: number; offset?: number },
) {
  const members = await prisma.insurerMember.findMany({
    where: { insurerId },
    include: {
      patient: {
        include: {
          user: { select: { email: true, phone: true } },
          prescriptions: { take: 5, orderBy: { prescribedAt: "desc" }, include: { items: true } },
        },
      },
    },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });

  return members
    .filter((m) => {
      if (!filters.search) return true;
      const q = filters.search.toLowerCase();
      const name = `${m.patient.firstName} ${m.patient.lastName}`.toLowerCase();
      return name.includes(q) || m.memberNumber.toLowerCase().includes(q);
    })
    .map((m) => {
      const age = Math.floor(
        (Date.now() - m.patient.dateOfBirth.getTime()) / (365.25 * 86400000),
      );
      const activeMeds = m.patient.prescriptions.flatMap((p) => p.items.map((i) => i.drugName));
      const riskBand =
        activeMeds.length >= 4 ? "high" : activeMeds.length >= 2 ? "medium" : "low";
      return {
        member_number: m.memberNumber,
        patient_id: m.patientId,
        name: `${m.patient.firstName} ${m.patient.lastName}`,
        age,
        plan_tier: "standard",
        active_medications: activeMeds,
        adherence_rate: riskBand === "high" ? 72 : riskBand === "medium" ? 85 : 94,
        risk_band: riskBand,
        phone: m.patient.user.phone,
        email: m.patient.user.email,
      };
    });
}

export async function getInsurerSettings(insurerId: string) {
  return getOrgSettings("insurer", insurerId);
}

export async function updateInsurerSettings(insurerId: string, settings: Record<string, unknown>) {
  return setOrgSettings("insurer", insurerId, settings);
}

export async function getPharmacySettings(pharmacyId: string) {
  return getOrgSettings("pharmacy", pharmacyId);
}

export async function updatePharmacySettings(pharmacyId: string, settings: Record<string, unknown>) {
  return setOrgSettings("pharmacy", pharmacyId, settings);
}

export async function getHospitalSettings(hospitalId: string) {
  return getOrgSettings("hospital", hospitalId);
}

export async function updateHospitalSettings(hospitalId: string, settings: Record<string, unknown>) {
  return setOrgSettings("hospital", hospitalId, settings);
}

export function hashApiKeyPreview(): string {
  return crypto.randomBytes(4).toString("hex");
}
