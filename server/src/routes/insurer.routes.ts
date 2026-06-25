import { ClaimStatus } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { forbidden } from "../utils/errors.js";
import { param } from "../utils/param.js";
import {
  createInsurerApiKey,
  getInsurerContractUsage,
  getInsurerSettings,
  listEnrichedInsurerMembers,
  listInsurerApiKeys,
  listInsurerReportHistory,
  revokeInsurerApiKey,
  updateInsurerSettings,
} from "../services/insurer-ext.service.js";
import {
  deactivateInsurerStaff,
  inviteInsurerStaff,
  listInsurerStaff,
  updateInsurerStaffRole,
} from "../services/staff.service.js";
import {
  enrollMember,
  generateInsurerReport,
  getFraudAnomalies,
  getInsurerAdherence,
  getInsurerAnalytics,
  getInsurerContract,
  getInsurerDashboard,
  getInsurerSavings,
  getSavingsCalculator,
  getUtilization,
  listInsurerAlerts,
  listInsurerAuditLogs,
  listInsurerInvoices,
  listInsurerPatients,
  listProviderRisk,
  payInsurerInvoice,
  updateClaimStatus,
} from "../services/insurer.service.js";
import {
  bulkUpdateFraudClaims,
  createReportSchedule,
  exportFraudClaims,
  exportInsurerAdherence,
  exportInsurerMembers,
  exportInsurerSavings,
  getEnrichedUtilization,
  getFraudClaimDetail,
  getInsurerContractPdf,
  getInsurerMemberStats,
  getInsurerReportById,
  markInsurerAlertRead,
  remindInsurerAdherence,
  requestContractAmendment,
  rotateInsurerApiKey,
  listSavingsRecords,
  insurerGlobalSearch,
  investigateProvider,
} from "../services/portal-complete.service.js";
import type { TokenPayload } from "../utils/crypto.js";

const router = Router();
const insurerRoles = ["insurer_admin", "insurer_analyst", "super_admin"] as const;

router.use(authenticate, requireRoles(...insurerRoles));

function insurerIdFrom(user: TokenPayload): string {
  if (!user.organizationId || user.organizationType !== "insurer") {
    throw forbidden("Insurer organization required");
  }
  return user.organizationId;
}

router.get("/dashboard", async (req, res, next) => {
  try {
    res.json(await getInsurerDashboard(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/savings", async (req, res, next) => {
  try {
    res.json(
      await getInsurerSavings(
        insurerIdFrom(req.user!),
        req.query.start_date ? String(req.query.start_date) : undefined,
        req.query.end_date ? String(req.query.end_date) : undefined,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/savings/calculator", async (req, res, next) => {
  try {
    res.json(
      await getSavingsCalculator(
        insurerIdFrom(req.user!),
        req.query.start_date ? String(req.query.start_date) : undefined,
        req.query.end_date ? String(req.query.end_date) : undefined,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/adherence", async (req, res, next) => {
  try {
    res.json(await getInsurerAdherence(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/fraud/anomalies", async (req, res, next) => {
  try {
    const days = req.query.days ? parseInt(String(req.query.days), 10) : 7;
    res.json(await getFraudAnomalies(insurerIdFrom(req.user!), days));
  } catch (err) {
    next(err);
  }
});

const claimStatusSchema = z.object({
  status: z.enum(["investigating", "cleared", "confirmed", "flagged", "pending"]),
  notes: z.string().optional(),
});

router.put("/fraud/:claimId/status", validateBody(claimStatusSchema), async (req, res, next) => {
  try {
    const statusMap: Record<string, ClaimStatus> = {
      investigating: "investigating",
      cleared: "cleared",
      confirmed: "confirmed",
      flagged: "flagged",
      pending: "pending",
    };
    res.json(
      await updateClaimStatus(
        insurerIdFrom(req.user!),
        param(req.params.claimId),
        statusMap[req.body.status],
        req.body.notes,
        req.user!.sub,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/utilization", async (req, res, next) => {
  try {
    const insurerId = insurerIdFrom(req.user!);
    const base = await getUtilization(
      insurerId,
      req.query.start_date ? String(req.query.start_date) : undefined,
      req.query.end_date ? String(req.query.end_date) : undefined,
    );
    const enriched = await getEnrichedUtilization(insurerId);
    res.json({ ...base, ...enriched });
  } catch (err) {
    next(err);
  }
});

const reportSchema = z.object({
  date_range: z.object({ start: z.string(), end: z.string() }),
  metrics: z.array(z.string()),
  format: z.enum(["pdf", "csv", "excel"]),
});

router.post("/reports/generate", validateBody(reportSchema), async (req, res, next) => {
  try {
    res.json(
      await generateInsurerReport(insurerIdFrom(req.user!), req.user!.sub, req.body),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/contract", async (req, res, next) => {
  try {
    res.json(await getInsurerContract(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/invoices", async (req, res, next) => {
  try {
    res.json(await listInsurerInvoices(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.post("/invoices/:id/pay", async (req, res, next) => {
  try {
    res.json(await payInsurerInvoice(insurerIdFrom(req.user!), param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/analytics", async (req, res, next) => {
  try {
    res.json(
      await getInsurerAnalytics(
        insurerIdFrom(req.user!),
        req.query.start_date ? String(req.query.start_date) : undefined,
        req.query.end_date ? String(req.query.end_date) : undefined,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/patients/list", async (req, res, next) => {
  try {
    res.json(
      await listInsurerPatients(insurerIdFrom(req.user!), {
        status: req.query.status ? String(req.query.status) : undefined,
        search: req.query.search ? String(req.query.search) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/alerts", async (req, res, next) => {
  try {
    res.json(await listInsurerAlerts(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/providers/risk", async (req, res, next) => {
  try {
    res.json(await listProviderRisk(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    res.json(
      await listInsurerAuditLogs(
        insurerIdFrom(req.user!),
        req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      ),
    );
  } catch (err) {
    next(err);
  }
});

const memberSchema = z.object({
  patient_id: z.string().uuid(),
  member_number: z.string().min(1),
});

router.post("/members", validateBody(memberSchema), async (req, res, next) => {
  try {
    res.status(201).json(
      await enrollMember(insurerIdFrom(req.user!), req.body.patient_id, req.body.member_number),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/staff", async (req, res, next) => {
  try {
    res.json(await listInsurerStaff(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.post("/staff/invite", async (req, res, next) => {
  try {
    res.status(201).json(await inviteInsurerStaff(insurerIdFrom(req.user!), req.body));
  } catch (err) {
    next(err);
  }
});

router.delete("/staff/:userId", async (req, res, next) => {
  try {
    await deactivateInsurerStaff(insurerIdFrom(req.user!), param(req.params.userId));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.put("/staff/:userId/role", async (req, res, next) => {
  try {
    res.json(
      await updateInsurerStaffRole(insurerIdFrom(req.user!), param(req.params.userId), req.body.role),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/settings", async (req, res, next) => {
  try {
    res.json(await getInsurerSettings(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    res.json(await updateInsurerSettings(insurerIdFrom(req.user!), req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/api-keys", async (req, res, next) => {
  try {
    res.json(await listInsurerApiKeys(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.post("/api-keys", async (req, res, next) => {
  try {
    res.status(201).json(await createInsurerApiKey(insurerIdFrom(req.user!), req.body.label));
  } catch (err) {
    next(err);
  }
});

router.delete("/api-keys/:id", async (req, res, next) => {
  try {
    await revokeInsurerApiKey(insurerIdFrom(req.user!), param(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/contract/usage", async (req, res, next) => {
  try {
    res.json(await getInsurerContractUsage(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/reports/history", async (req, res, next) => {
  try {
    res.json(await listInsurerReportHistory(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/savings/records", async (req, res, next) => {
  try {
    res.json(await listSavingsRecords(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.post("/savings/export", async (req, res, next) => {
  try {
    res.json(await exportInsurerSavings(insurerIdFrom(req.user!), req.user!.sub, req.body.format === "pdf" ? "pdf" : "csv"));
  } catch (err) {
    next(err);
  }
});

router.post("/adherence/remind", async (req, res, next) => {
  try {
    res.json(await remindInsurerAdherence(insurerIdFrom(req.user!), req.body.member_ids ?? []));
  } catch (err) {
    next(err);
  }
});

router.post("/adherence/export", async (req, res, next) => {
  try {
    res.json(await exportInsurerAdherence(insurerIdFrom(req.user!), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/fraud/claims/:claimId", async (req, res, next) => {
  try {
    res.json(await getFraudClaimDetail(insurerIdFrom(req.user!), param(req.params.claimId)));
  } catch (err) {
    next(err);
  }
});

router.put("/fraud/bulk-status", async (req, res, next) => {
  try {
    res.json(await bulkUpdateFraudClaims(insurerIdFrom(req.user!), req.body.claim_ids ?? [], req.body.status));
  } catch (err) {
    next(err);
  }
});

router.post("/fraud/export", async (req, res, next) => {
  try {
    res.json(await exportFraudClaims(insurerIdFrom(req.user!), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/members/stats", async (req, res, next) => {
  try {
    res.json(await getInsurerMemberStats(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/members/export", async (req, res, next) => {
  try {
    res.json(await exportInsurerMembers(insurerIdFrom(req.user!), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/reports/schedule", async (req, res, next) => {
  try {
    const insurerId = insurerIdFrom(req.user!);
    res.status(201).json(await createReportSchedule("insurer", insurerId, req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/reports/history/:id", async (req, res, next) => {
  try {
    res.json(await getInsurerReportById(insurerIdFrom(req.user!), param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/contract/pdf", async (req, res, next) => {
  try {
    res.json(await getInsurerContractPdf(insurerIdFrom(req.user!), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/contract/amendment", async (req, res, next) => {
  try {
    res.json(await requestContractAmendment(insurerIdFrom(req.user!), req.body.notes ?? ""));
  } catch (err) {
    next(err);
  }
});

router.put("/alerts/:id/read", async (req, res, next) => {
  try {
    res.json(await markInsurerAlertRead(insurerIdFrom(req.user!), param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/api-keys/:id/rotate", async (req, res, next) => {
  try {
    res.json(await rotateInsurerApiKey(insurerIdFrom(req.user!), param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.get("/search", async (req, res, next) => {
  try {
    res.json(await insurerGlobalSearch(insurerIdFrom(req.user!), String(req.query.q ?? "")));
  } catch (err) {
    next(err);
  }
});

router.post("/providers/investigate", async (req, res, next) => {
  try {
    res.json(await investigateProvider(insurerIdFrom(req.user!), req.body.provider_name));
  } catch (err) {
    next(err);
  }
});

router.get("/utilization/enriched", async (req, res, next) => {
  try {
    res.json(await getEnrichedUtilization(insurerIdFrom(req.user!)));
  } catch (err) {
    next(err);
  }
});

router.get("/members/enriched", async (req, res, next) => {
  try {
    res.json(
      await listEnrichedInsurerMembers(insurerIdFrom(req.user!), {
        search: req.query.search ? String(req.query.search) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      }),
    );
  } catch (err) {
    next(err);
  }
});

export default router;
