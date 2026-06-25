import type { ClaimStatus, Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { saveExportFile } from "./file.service.js";
import { generateExcelReport, generatePdfReport, toCsv } from "./report.service.js";
import { writeAuditLog } from "./audit.service.js";
import { badRequest, forbidden, notFound } from "../utils/errors.js";
import type { TokenPayload } from "../utils/crypto.js";

function requireInsurerId(user: TokenPayload): string {
  if (!user.organizationId || user.organizationType !== "insurer") {
    throw forbidden("Insurer organization required");
  }
  return user.organizationId;
}

export async function getInsurerDashboard(insurerId: string) {
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");

  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [savings, members, claims, adherenceSnapshots, hospitals] = await Promise.all([
    prisma.savingsRecord.aggregate({
      where: { insurerId, createdAt: { gte: monthStart } },
      _sum: { savings: true },
      _count: true,
    }),
    prisma.insurerMember.count({ where: { insurerId, isActive: true } }),
    prisma.claim.findMany({ where: { insurerId }, take: 100 }),
    prisma.patientAdherenceSnapshot.findMany({ take: 500 }),
    prisma.providerRiskScore.findMany({ orderBy: { anomalyScore: "desc" }, take: 7 }),
  ]);

  const avgAdherence =
    adherenceSnapshots.length === 0
      ? 0
      : adherenceSnapshots.reduce((s, a) => s + Number(a.overallRate), 0) / adherenceSnapshots.length;

  const grossSavings = Number(savings._sum.savings ?? 0);
  const fee = grossSavings * (Number(insurer.feePercentage) / 100);

  const savingsTrend = await prisma.savingsRecord.groupBy({
    by: ["category"],
    where: { insurerId },
    _sum: { savings: true },
    _count: true,
  });

  const medAdherence = await prisma.medicalRecord.groupBy({
    by: ["recordType"],
    where: { recordType: "medication", isActive: true },
    _count: true,
  });

  return {
    total_savings: grossSavings,
    members_covered: members,
    adherence_rate: Math.round(avgAdherence),
    roi: grossSavings > 0 ? Math.round((grossSavings / Math.max(fee, 1)) * 10) / 10 : 0,
    savings_trend: savingsTrend.map((s) => ({
      category: s.category,
      savings: Number(s._sum.savings ?? 0),
      count: s._count,
    })),
    top_hospitals: hospitals.map((h) => ({
      name: h.providerName,
      anomaly_score: h.anomalyScore,
      flagged: h.flaggedCount,
    })),
    top_medications: medAdherence.map((m) => ({
      type: m.recordType,
      count: m._count,
    })),
    fee,
    duplicate_tests_prevented: savings._count,
    flagged_claims: claims.filter((c) => c.status !== "cleared").length,
  };
}

export async function getInsurerSavings(
  insurerId: string,
  startDate?: string,
  endDate?: string,
) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");

  const records = await prisma.savingsRecord.findMany({
    where: { insurerId, createdAt: { gte: start, lte: end } },
  });

  const grossSavings = records.reduce((s, r) => s + Number(r.savings), 0);
  const fee = grossSavings * (Number(insurer.feePercentage) / 100);

  const byTest: Record<string, number> = {};
  const byHospital: Record<string, number> = {};
  for (const r of records) {
    byTest[r.testType] = (byTest[r.testType] ?? 0) + Number(r.savings);
    byHospital[r.attemptedProvider] = (byHospital[r.attemptedProvider] ?? 0) + Number(r.savings);
  }

  return {
    gross_savings: grossSavings,
    medpass_fee: fee,
    net_savings: grossSavings - fee,
    duplicate_tests_prevented: records.length,
    breakdown_by_test_type: byTest,
    breakdown_by_hospital: Object.entries(byHospital).map(([name, savings]) => ({ name, savings })),
  };
}

export async function getSavingsCalculator(insurerId: string, startDate?: string, endDate?: string) {
  const data = await getInsurerSavings(insurerId, startDate, endDate);
  return {
    total_waste: data.gross_savings * 1.2,
    potential_savings: data.gross_savings,
    estimated_fee: data.medpass_fee,
  };
}

export async function getInsurerAdherence(insurerId: string) {
  const members = await prisma.insurerMember.findMany({
    where: { insurerId, isActive: true },
    include: {
      patient: {
        include: { user: { select: { phone: true, email: true } } },
      },
    },
    take: 500,
  });

  const snapshots = await prisma.patientAdherenceSnapshot.findMany();
  const snapshotByPatient = new Map(snapshots.map((s) => [s.patientId, s]));

  const byMedication: Record<string, { total: number; count: number }> = {};
  const nonAdherent: Array<Record<string, unknown>> = [];

  for (const member of members) {
    const snap = snapshotByPatient.get(member.patientId);
    const rate = snap ? Number(snap.overallRate) : 0;
    if (rate < 75) {
      nonAdherent.push({
        patient_id: member.patientId,
        name: `${member.patient.firstName} ${member.patient.lastName}`,
        adherence_rate: rate,
        phone: member.patient.user?.phone,
      });
    }
    const meds = (snap?.medications as Array<{ name?: string }>) ?? [];
    for (const m of meds) {
      const name = m.name ?? "unknown";
      if (!byMedication[name]) byMedication[name] = { total: 0, count: 0 };
      byMedication[name].total += rate;
      byMedication[name].count += 1;
    }
  }

  const overall =
    snapshots.length === 0
      ? 0
      : snapshots.reduce((s, a) => s + Number(a.overallRate), 0) / snapshots.length;

  return {
    overall_rate: Math.round(overall),
    by_medication: Object.entries(byMedication).map(([medication, stats]) => ({
      medication,
      rate: Math.round(stats.total / Math.max(stats.count, 1)),
      patients: stats.count,
    })),
    non_adherent_patients: nonAdherent,
    estimated_savings: nonAdherent.length * 1200,
    intervention_outcomes: {
      reminders_sent: 0,
      reminders_opened: 0,
      refill_rate_after_reminder: 0,
    },
  };
}

export async function getFraudAnomalies(insurerId: string, days = 7) {
  const since = new Date(Date.now() - days * 86400000);
  const claims = await prisma.claim.findMany({
    where: { insurerId, createdAt: { gte: since } },
    orderBy: { fraudScore: "desc" },
  });

  const high = claims.filter((c) => c.fraudScore >= 90).length;
  const medium = claims.filter((c) => c.fraudScore >= 70 && c.fraudScore < 90).length;
  const low = claims.filter((c) => c.fraudScore < 70).length;

  return {
    high_risk: high,
    medium_risk: medium,
    low_risk: low,
    flagged_claims: claims.map((c) => ({
      id: c.id,
      patient_id: c.patientId,
      provider: c.providerName,
      amount: Number(c.amount),
      score: c.fraudScore,
      pattern: c.pattern,
      status: c.status,
    })),
  };
}

export async function updateClaimStatus(
  insurerId: string,
  claimId: string,
  status: ClaimStatus,
  notes: string | undefined,
  investigatorId: string,
) {
  const claim = await prisma.claim.findFirst({ where: { id: claimId, insurerId } });
  if (!claim) throw notFound("Claim not found");

  const updated = await prisma.claim.update({
    where: { id: claimId },
    data: { status, notes, investigatedBy: investigatorId },
  });

  await writeAuditLog({
    userId: investigatorId,
    action: "claim_status_update",
    resourceType: "claim",
    resourceId: claimId,
    organizationId: insurerId,
    success: true,
  });

  return updated;
}

export async function getUtilization(insurerId: string, startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 90 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();

  const claims = await prisma.claim.findMany({
    where: { insurerId, createdAt: { gte: start, lte: end } },
  });

  const volumeByDay: Record<string, number> = {};
  for (const c of claims) {
    const day = c.createdAt.toISOString().slice(0, 10);
    volumeByDay[day] = (volumeByDay[day] ?? 0) + 1;
  }

  return {
    claims_volume: Object.entries(volumeByDay).map(([date, count]) => ({ date, count })),
    top_procedures: [],
    top_medications: [],
    demographic_breakdown: {},
    total_claims: claims.length,
    total_amount: claims.reduce((s, c) => s + Number(c.amount), 0),
  };
}

export async function generateInsurerReport(
  insurerId: string,
  userId: string,
  input: {
    date_range: { start: string; end: string };
    metrics: string[];
    format: "pdf" | "csv" | "excel";
  },
) {
  const savings = await getInsurerSavings(insurerId, input.date_range.start, input.date_range.end);
  const adherence = input.metrics.includes("adherence")
    ? await getInsurerAdherence(insurerId)
    : null;
  const fraud = input.metrics.includes("fraud")
    ? await getFraudAnomalies(insurerId, 30)
    : null;

  const payload = { savings, adherence, fraud, generated_at: new Date().toISOString() };
  const rows = [
    { metric: "gross_savings", value: savings.gross_savings },
    { metric: "net_savings", value: savings.net_savings },
    { metric: "duplicate_tests_prevented", value: savings.duplicate_tests_prevented },
  ];

  let content: Buffer | string;
  let mimeType: string;
  let filename: string;

  if (input.format === "pdf") {
    content = await generatePdfReport("Insurer Report", payload as Record<string, unknown>);
    mimeType = "application/pdf";
    filename = `insurer-report-${insurerId}.pdf`;
  } else if (input.format === "excel") {
    content = await generateExcelReport("Insurer Report", rows);
    mimeType = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
    filename = `insurer-report-${insurerId}.xlsx`;
  } else {
    content = toCsv(rows);
    mimeType = "text/csv";
    filename = `insurer-report-${insurerId}.csv`;
  }

  const url = await saveExportFile(userId, filename, content, mimeType);
  await prisma.reportHistory.create({
    data: {
      ownerType: "insurer",
      ownerId: insurerId,
      title: `Insurer report (${input.format})`,
      format: input.format,
      downloadUrl: url,
      createdBy: userId,
    },
  });
  return { report_url: url };
}

export async function getInsurerContract(insurerId: string) {
  const contract = await prisma.insurerContract.findFirst({
    where: { insurerId, status: "active" },
    orderBy: { startDate: "desc" },
  });
  const insurer = await prisma.insurer.findUnique({ where: { id: insurerId } });
  if (!insurer) throw notFound("Insurer not found");

  if (!contract) {
    return {
      contract_id: null,
      start_date: insurer.contractStartDate,
      end_date: insurer.contractEndDate,
      fee_percentage: Number(insurer.feePercentage),
      status: "active",
    };
  }

  const now = new Date();
  let status = "active";
  if (contract.endDate < now) status = "expired";
  else if (contract.endDate.getTime() - now.getTime() < 30 * 86400000) status = "expiring";

  return {
    contract_id: contract.id,
    start_date: contract.startDate,
    end_date: contract.endDate,
    fee_percentage: Number(contract.feePercentage),
    status,
    terms: contract.terms,
  };
}

export async function listInsurerInvoices(insurerId: string) {
  const invoices = await prisma.insurerInvoice.findMany({
    where: { insurerId },
    orderBy: { createdAt: "desc" },
  });
  return invoices.map((inv) => ({
    id: inv.id,
    period: inv.period,
    gross_savings: Number(inv.grossSavings),
    fee: Number(inv.fee),
    status: inv.status,
    due_date: inv.dueDate,
    paid_at: inv.paidAt,
  }));
}

export async function payInsurerInvoice(insurerId: string, invoiceId: string) {
  const invoice = await prisma.insurerInvoice.findFirst({
    where: { id: invoiceId, insurerId },
  });
  if (!invoice) throw notFound("Invoice not found");
  if (invoice.status === "paid") throw badRequest("Invoice already paid");

  await prisma.insurerInvoice.update({
    where: { id: invoiceId },
    data: { status: "paid", paidAt: new Date() },
  });
  return { status: "paid" };
}

export async function getInsurerAnalytics(insurerId: string, startDate?: string, endDate?: string) {
  const start = startDate ? new Date(startDate) : new Date(Date.now() - 30 * 86400000);
  const end = endDate ? new Date(endDate) : new Date();

  const [claims, members] = await Promise.all([
    prisma.claim.findMany({ where: { insurerId, createdAt: { gte: start, lte: end } } }),
    prisma.insurerMember.count({ where: { insurerId, isActive: true } }),
  ]);

  const totalAmount = claims.reduce((s, c) => s + Number(c.amount), 0);

  return {
    total_claims: claims.length,
    total_patients: members,
    cost_per_patient: members > 0 ? Math.round(totalAmount / members) : 0,
    trends: {
      claims: claims.length,
      amount: totalAmount,
    },
  };
}

export async function listInsurerPatients(
  insurerId: string,
  filters: { status?: string; search?: string; limit?: number; offset?: number },
) {
  const where: Prisma.InsurerMemberWhereInput = { insurerId, isActive: true };
  const members = await prisma.insurerMember.findMany({
    where,
    include: {
      patient: {
        include: { user: { select: { phone: true, email: true } } },
      },
    },
    take: filters.limit ?? 50,
    skip: filters.offset ?? 0,
  });

  const snapshots = await prisma.patientAdherenceSnapshot.findMany();
  const snapMap = new Map(snapshots.map((s) => [s.patientId, Number(s.overallRate)]));

  let results = members.map((m) => ({
    patient_id: m.patientId,
    member_number: m.memberNumber,
    name: `${m.patient.firstName} ${m.patient.lastName}`,
    phone: m.patient.user.phone,
    adherence_rate: snapMap.get(m.patientId) ?? 0,
    status: (snapMap.get(m.patientId) ?? 100) >= 75 ? "adherent" : "non_adherent",
  }));

  if (filters.status === "adherent") results = results.filter((r) => r.status === "adherent");
  if (filters.status === "non_adherent") results = results.filter((r) => r.status === "non_adherent");
  if (filters.search) {
    const q = filters.search.toLowerCase();
    results = results.filter((r) => r.name.toLowerCase().includes(q));
  }

  return results;
}

export async function listInsurerAlerts(insurerId: string) {
  return prisma.insurerAlert.findMany({
    where: { insurerId },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

export async function listInsurerAuditLogs(insurerId: string, limit = 50, offset = 0) {
  const [items, total] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: insurerId },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.auditLog.count({ where: { organizationId: insurerId } }),
  ]);
  return { items, total };
}

export async function enrollMember(
  insurerId: string,
  patientId: string,
  memberNumber: string,
) {
  const existing = await prisma.insurerMember.findUnique({
    where: { insurerId_patientId: { insurerId, patientId } },
  });
  if (existing?.isActive) throw badRequest("Member already enrolled");

  const member = await prisma.insurerMember.upsert({
    where: { insurerId_patientId: { insurerId, patientId } },
    create: { insurerId, patientId, memberNumber },
    update: { isActive: true, memberNumber, enrolledAt: new Date() },
  });

  await prisma.insurer.update({
    where: { id: insurerId },
    data: { memberCount: { increment: 1 } },
  });

  return member;
}

export async function listProviderRisk(insurerId: string) {
  void insurerId;
  return prisma.providerRiskScore.findMany({ orderBy: { anomalyScore: "desc" }, take: 20 });
}
