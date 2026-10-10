import { prisma } from "../../shared/lib/prisma.js";
import { hashToken, randomToken } from "../../shared/utils/crypto.js";
import { notFound } from "../../shared/utils/errors.js";
import { saveExportFile } from "../../shared/services/file.service.js";
import { generatePdfReport, toCsv } from "../../shared/services/report.service.js";
import { sendSms } from "../../shared/services/sms.service.js";

export async function listSavingsRecords(insurerId: string) {
  return prisma.savingsRecord.findMany({
    where: { insurerId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function exportInsurerSavings(insurerId: string, userId: string, format: "csv" | "pdf") {
  const rows = await listSavingsRecords(insurerId);
  const content =
    format === "csv"
      ? toCsv(
          rows.map((r) => ({
            id: r.id,
            category: r.category,
            savings: Number(r.savings),
            created_at: r.createdAt.toISOString(),
          })),
        )
      : await generatePdfReport("Savings report", { rows });
  const url = await saveExportFile(userId, `savings.${format === "csv" ? "csv" : "pdf"}`, content, format === "csv" ? "text/csv" : "application/pdf");
  return { download_url: url };
}

export async function exportInsurerAdherence(insurerId: string, userId: string) {
  const members = await prisma.insurerMember.findMany({ where: { insurerId }, take: 200, include: { patient: true } });
  const csv = toCsv(members.map((m) => ({ member: m.memberNumber, patient: `${m.patient.firstName} ${m.patient.lastName}` })));
  const url = await saveExportFile(userId, "adherence-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function remindInsurerAdherence(insurerId: string, memberIds: string[]) {
  const members = await prisma.insurerMember.findMany({
    where: { insurerId, id: { in: memberIds } },
    include: { patient: { include: { user: { select: { phone: true } } } } },
  });
  for (const m of members) {
    if (m.patient.user.phone) {
      await sendSms(m.patient.user.phone, "Reminder: please refill your medications to stay adherent.");
    }
  }
  return { sent: members.length };
}

export async function getFraudClaimDetail(insurerId: string, claimId: string) {
  const claim = await prisma.claim.findFirst({ where: { id: claimId, insurerId } });
  if (!claim) throw notFound("Claim not found");
  const logs = await prisma.auditLog.findMany({
    where: { resourceId: claimId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
  return { claim, audit_trail: logs };
}

export async function bulkUpdateFraudClaims(insurerId: string, claimIds: string[], status: string) {
  await prisma.claim.updateMany({ where: { insurerId, id: { in: claimIds } }, data: { status: status as never } });
  return { updated: claimIds.length };
}

export async function exportFraudClaims(insurerId: string, userId: string) {
  const claims = await prisma.claim.findMany({ where: { insurerId }, take: 500 });
  const csv = toCsv(claims.map((c) => ({ id: c.id, provider: c.providerName, amount: Number(c.amount), score: c.fraudScore, status: c.status })));
  const url = await saveExportFile(userId, "fraud-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function getInsurerMemberStats(insurerId: string) {
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const memberRows = await prisma.insurerMember.findMany({
    where: { insurerId },
    select: { patientId: true, isActive: true, enrolledAt: true },
    take: 1000,
  });
  const patientIds = memberRows.map((row) => row.patientId);
  const snapshots = await prisma.patientAdherenceSnapshot.findMany({
    where: patientIds.length > 0 ? { patientId: { in: patientIds } } : { patientId: { in: [] } },
    select: { patientId: true, overallRate: true },
  });
  const highRiskCount = snapshots.filter((snapshot) => Number(snapshot.overallRate) < 75).length;
  const active = memberRows.filter((row) => row.isActive).length;
  const total = memberRows.length;
  const newEnrollments = memberRows.filter((row) => row.enrolledAt >= monthStart).length;
  return {
    active_this_month: active,
    total_members: total,
    new_enrollments: newEnrollments,
    high_risk_cohort: highRiskCount,
  };
}

export async function exportInsurerMembers(insurerId: string, userId: string) {
  const members = await prisma.insurerMember.findMany({ where: { insurerId }, include: { patient: true } });
  const csv = toCsv(
    members.map((m) => ({
      member_number: m.memberNumber,
      name: `${m.patient.firstName} ${m.patient.lastName}`,
      active: m.isActive ? 1 : 0,
    })),
  );
  const url = await saveExportFile(userId, "members-export.csv", csv, "text/csv");
  return { download_url: url };
}

export async function getInsurerReportById(insurerId: string, reportId: string) {
  const report = await prisma.reportHistory.findFirst({ where: { id: reportId, ownerId: insurerId, ownerType: "insurer" } });
  if (!report) throw notFound("Report not found");
  return report;
}

export async function getInsurerContractPdf(insurerId: string, userId: string) {
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");
  const pdf = await generatePdfReport(`Contract: ${insurer.name}`, { fee: Number(insurer.feePercentage), code: insurer.code });
  const url = await saveExportFile(userId, `contract-${insurer.code}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}

export async function getInsurerInvoicePdf(insurerId: string, invoiceId: string, userId: string) {
  const invoice = await prisma.insurerInvoice.findFirst({
    where: { id: invoiceId, insurerId },
  });
  if (!invoice) throw notFound("Invoice not found");
  const pdf = await generatePdfReport(`Insurer invoice ${invoice.period}`, {
    amount: Number(invoice.fee),
    gross_savings: Number(invoice.grossSavings),
    status: invoice.status,
    due_date: invoice.dueDate,
    created_at: invoice.createdAt,
  });
  const url = await saveExportFile(userId, `insurer-invoice-${invoice.id}.pdf`, pdf, "application/pdf");
  return { download_url: url };
}

export async function requestContractAmendment(insurerId: string, notes: string) {
  await prisma.activityFeedEntry.create({
    data: { kind: "contract", text: `Amendment requested: ${notes}`, actor: insurerId },
  });
  return { status: "submitted" };
}

export async function rotateInsurerApiKey(insurerId: string, keyId: string) {
  await prisma.insurerApiKey.updateMany({ where: { id: keyId, insurerId }, data: { revokedAt: new Date() } });
  const raw = `miq_${randomToken()}`;
  const key = await prisma.insurerApiKey.create({
    data: { insurerId, label: "rotated", keyPrefix: raw.slice(0, 12), keyHash: hashToken(raw) },
  });
  return { id: key.id, api_key: raw };
}

export async function markInsurerAlertRead(insurerId: string, alertId: string) {
  await prisma.insurerAlert.updateMany({ where: { id: alertId, insurerId }, data: { readAt: new Date() } });
  return { read: true };
}

export async function insurerGlobalSearch(insurerId: string, q: string) {
  const query = q.trim().toLowerCase();
  if (query.length < 2) return { members: [], claims: [], providers: [] };
  const [members, claims] = await Promise.all([
    prisma.insurerMember.findMany({
      where: { insurerId },
      include: { patient: true },
      take: 20,
    }),
    prisma.claim.findMany({ where: { insurerId }, take: 20, include: { patient: true } }),
  ]);
  return {
    members: members
      .filter((m) => `${m.patient.firstName} ${m.patient.lastName}`.toLowerCase().includes(query) || m.memberNumber.toLowerCase().includes(query))
      .map((m) => ({ id: m.id, name: `${m.patient.firstName} ${m.patient.lastName}`, member_number: m.memberNumber })),
    claims: claims
      .filter((c) => c.providerName.toLowerCase().includes(query) || c.id.includes(query))
      .map((c) => ({ id: c.id, provider: c.providerName, amount: Number(c.amount) })),
    providers: claims
      .filter((c) => c.providerName.toLowerCase().includes(query))
      .map((c) => ({ name: c.providerName }))
      .slice(0, 10),
  };
}

export async function investigateProvider(insurerId: string, providerName: string) {
  const claims = await prisma.claim.findMany({
    where: { insurerId, providerName: { contains: providerName, mode: "insensitive" } },
    take: 50,
  });
  const risk = await prisma.providerRiskScore.findFirst({
    where: { providerName: { contains: providerName, mode: "insensitive" } },
  });
  return { provider: providerName, claims, risk_score: risk?.anomalyScore ?? 0 };
}

export async function getEnrichedUtilization(insurerId: string) {
  const claims = await prisma.claim.findMany({ where: { insurerId }, take: 200 });
  const proc: Record<string, number> = {};
  const meds: Record<string, number> = {};
  for (const c of claims) {
    if (c.pattern) proc[c.pattern] = (proc[c.pattern] ?? 0) + 1;
    if (c.providerName) meds[c.providerName] = (meds[c.providerName] ?? 0) + 1;
  }
  return {
    top_procedures: Object.entries(proc).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    top_medications: Object.entries(meds).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 10),
    demographic_breakdown: await computeDemographics(insurerId),
  };
}

async function computeDemographics(insurerId: string) {
  const members = await prisma.insurerMember.findMany({
    where: { insurerId },
    select: { patient: { select: { dateOfBirth: true } } },
    take: 5000,
  });
  const buckets = { under_18: 0, age_18_35: 0, age_36_55: 0, over_55: 0 };
  const now = Date.now();
  for (const m of members) {
    const age = Math.floor((now - m.patient.dateOfBirth.getTime()) / (365.25 * 86400000));
    if (age < 18) buckets.under_18++;
    else if (age <= 35) buckets.age_18_35++;
    else if (age <= 55) buckets.age_36_55++;
    else buckets.over_55++;
  }
  return buckets;
}
