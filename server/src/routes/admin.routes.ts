import { Router } from "express";
import { z } from "zod";
import { authenticate, requireRoles } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import { param } from "../utils/param.js";
import {
  approveHospital,
  approvePharmacy,
  createInsurer,
  createInvitation,
  deleteInvitation,
  deleteSyncQueueItem,
  exportAuditLogs,
  getAdminDashboard,
  getHourlyMetrics,
  getHospital,
  getNetworkMap,
  getPlatformSettings,
  getRevenue,
  getSystemHealth,
  listAuditLogsAdmin,
  listDisputes,
  listHospitals,
  listInsurers,
  listInvitations,
  listPendingApprovals,
  listPharmacies,
  listPlatformInvoices,
  listPlatformPatients,
  listPlatformTransactions,
  listHospitalsWithStats,
  listPharmaciesWithStats,
  approveOnboardingRequest,
  rejectOnboardingRequest,
  searchPlatformPatients,
  listSyncQueue,
  rejectHospital,
  retrySyncQueue,
  setHospitalStatus,
  setPharmacyStatus,
  updateDispute,
  updateInsurer,
  updatePlatformSettings,
} from "../services/admin.service.js";
import {
  createAdminInvoice,
  exportAdminDashboardSnapshot,
  generateAdminInsurerReport,
  getAdminActivityFeed,
  getAdminPatientDetail,
  getComplianceSummary,
  getDisputeDetail,
  getEnrichedAdminPatients,
  getExtendedSystemHealth,
  getHospitalsStatsFiltered,
  getInsurerStats,
  getPharmacyDetail,
  getSystemLatencySeries,
  getTransactionsLedger,
  rejectPharmacy,
  setAdminPatientStatus,
} from "../services/portal-complete.service.js";

const router = Router();

router.use(authenticate, requireRoles("super_admin"));

router.get("/dashboard", async (_req, res, next) => {
  try {
    res.json(await getAdminDashboard());
  } catch (err) {
    next(err);
  }
});

router.get("/hospitals", async (req, res, next) => {
  try {
    res.json(
      await listHospitals({
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

router.get("/hospitals/stats/pilot-ending", async (_req, res, next) => {
  try {
    res.json(await getHospitalsStatsFiltered(true));
  } catch (err) {
    next(err);
  }
});

router.get("/hospitals/stats", async (req, res, next) => {
  try {
    res.json(
      await listHospitalsWithStats({
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

router.get("/hospitals/:id", async (req, res, next) => {
  try {
    res.json(await getHospital(param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

const statusSchema = z.object({ status: z.enum(["active", "disabled"]) });
router.put("/hospitals/:id/status", validateBody(statusSchema), async (req, res, next) => {
  try {
    res.json(await setHospitalStatus(param(req.params.id), req.body.status === "active"));
  } catch (err) {
    next(err);
  }
});

const approveHospitalSchema = z.object({
  verified_by: z.string().uuid(),
  pilot_end_date: z.string().optional(),
});
router.post("/hospitals/:id/approve", validateBody(approveHospitalSchema), async (req, res, next) => {
  try {
    res.json(
      await approveHospital(param(req.params.id), req.body.verified_by, req.body.pilot_end_date),
    );
  } catch (err) {
    next(err);
  }
});

const rejectSchema = z.object({ reason: z.string().min(1) });
router.post("/hospitals/:id/reject", validateBody(rejectSchema), async (req, res, next) => {
  try {
    res.json(await rejectHospital(param(req.params.id), req.body.reason, req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/pharmacies", async (req, res, next) => {
  try {
    res.json(
      await listPharmacies({
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

router.put("/pharmacies/:id/status", validateBody(statusSchema), async (req, res, next) => {
  try {
    res.json(await setPharmacyStatus(param(req.params.id), req.body.status === "active"));
  } catch (err) {
    next(err);
  }
});

const approvePharmacySchema = z.object({ verified_by: z.string().uuid() });
router.post("/pharmacies/:id/approve", validateBody(approvePharmacySchema), async (req, res, next) => {
  try {
    res.json(await approvePharmacy(param(req.params.id), req.body.verified_by));
  } catch (err) {
    next(err);
  }
});

router.get("/insurers", async (_req, res, next) => {
  try {
    res.json(await listInsurers());
  } catch (err) {
    next(err);
  }
});

const createInsurerSchema = z.object({
  name: z.string().min(1),
  registration_number: z.string().min(1),
  fee_percentage: z.number(),
  code: z.string().optional(),
  country: z.string().optional(),
  currency: z.string().optional(),
});
router.post("/insurers", validateBody(createInsurerSchema), async (req, res, next) => {
  try {
    res.status(201).json(await createInsurer(req.body));
  } catch (err) {
    next(err);
  }
});

router.put("/insurers/:id", async (req, res, next) => {
  try {
    res.json(await updateInsurer(param(req.params.id), req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/disputes", async (req, res, next) => {
  try {
    res.json(
      await listDisputes({
        status: req.query.status ? String(req.query.status) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const disputeUpdateSchema = z.object({
  status: z.enum(["investigating", "resolved", "rejected"]),
  resolution_notes: z.string().optional(),
});
router.put("/disputes/:id", validateBody(disputeUpdateSchema), async (req, res, next) => {
  try {
    res.json(
      await updateDispute(param(req.params.id), req.body.status, req.body.resolution_notes, req.user!.sub),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/audit-logs", async (req, res, next) => {
  try {
    res.json(
      await listAuditLogsAdmin({
        userId: req.query.user_id ? String(req.query.user_id) : undefined,
        action: req.query.action ? String(req.query.action) : undefined,
        startDate: req.query.start_date ? new Date(String(req.query.start_date)) : undefined,
        endDate: req.query.end_date ? new Date(String(req.query.end_date)) : undefined,
        limit: req.query.limit ? parseInt(String(req.query.limit), 10) : undefined,
        offset: req.query.offset ? parseInt(String(req.query.offset), 10) : undefined,
      }),
    );
  } catch (err) {
    next(err);
  }
});

const auditExportSchema = z.object({
  date_range: z.object({ start: z.string(), end: z.string() }),
  format: z.enum(["csv", "json"]),
});
router.post("/audit-logs/export", validateBody(auditExportSchema), async (req, res, next) => {
  try {
    res.json(
      await exportAuditLogs(
        req.user!.sub,
        req.body.date_range.start,
        req.body.date_range.end,
        req.body.format,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/revenue", async (req, res, next) => {
  try {
    res.json(await getRevenue(String(req.query.period ?? "month")));
  } catch (err) {
    next(err);
  }
});

const inviteSchema = z.object({
  email: z.string().email(),
  role: z.string().min(1),
  organization_id: z.string().uuid().optional(),
});
router.post("/invite", validateBody(inviteSchema), async (req, res, next) => {
  try {
    res.status(201).json(
      await createInvitation(req.body.email, req.body.role, req.body.organization_id),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/invitations", async (_req, res, next) => {
  try {
    res.json(await listInvitations());
  } catch (err) {
    next(err);
  }
});

router.delete("/invitations/:id", async (req, res, next) => {
  try {
    await deleteInvitation(param(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/system/health", async (_req, res, next) => {
  try {
    res.json(await getSystemHealth());
  } catch (err) {
    next(err);
  }
});

router.get("/system/queue", async (_req, res, next) => {
  try {
    res.json(await listSyncQueue());
  } catch (err) {
    next(err);
  }
});

const retrySchema = z.object({ queue_id: z.string().uuid() });
router.post("/system/queue/retry", validateBody(retrySchema), async (req, res, next) => {
  try {
    res.json(await retrySyncQueue(req.body.queue_id));
  } catch (err) {
    next(err);
  }
});

router.delete("/system/queue/:id", async (req, res, next) => {
  try {
    await deleteSyncQueueItem(param(req.params.id));
    res.status(204).send();
  } catch (err) {
    next(err);
  }
});

router.get("/settings", async (_req, res, next) => {
  try {
    res.json(await getPlatformSettings());
  } catch (err) {
    next(err);
  }
});

router.put("/settings", async (req, res, next) => {
  try {
    res.json(await updatePlatformSettings(req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/approvals/pending", async (_req, res, next) => {
  try {
    res.json(await listPendingApprovals());
  } catch (err) {
    next(err);
  }
});

router.get("/patients", async (req, res, next) => {
  try {
    res.json(
      await listPlatformPatients(
        req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/metrics/hourly", async (_req, res, next) => {
  try {
    res.json(await getHourlyMetrics());
  } catch (err) {
    next(err);
  }
});

router.get("/invoices", async (_req, res, next) => {
  try {
    res.json(await listPlatformInvoices());
  } catch (err) {
    next(err);
  }
});

router.get("/network", async (_req, res, next) => {
  try {
    res.json(await getNetworkMap());
  } catch (err) {
    next(err);
  }
});

router.get("/transactions", async (req, res, next) => {
  try {
    const limit = req.query.limit ? parseInt(String(req.query.limit), 10) : 100;
    res.json(await listPlatformTransactions(limit));
  } catch (err) {
    next(err);
  }
});

router.get("/patients/search", async (req, res, next) => {
  try {
    const q = String(req.query.q ?? "");
    if (!q) {
      res.json({ items: [], total: 0 });
      return;
    }
    res.json(
      await searchPlatformPatients(
        q,
        req.query.limit ? parseInt(String(req.query.limit), 10) : 50,
        req.query.offset ? parseInt(String(req.query.offset), 10) : 0,
      ),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/patients/enriched", async (req, res, next) => {
  try {
    res.json(await getEnrichedAdminPatients(req.query.limit ? parseInt(String(req.query.limit), 10) : 50));
  } catch (err) {
    next(err);
  }
});

router.post("/onboarding/:id/approve", async (req, res, next) => {
  try {
    res.json(await approveOnboardingRequest(param(req.params.id), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/onboarding/:id/reject", async (req, res, next) => {
  try {
    res.json(
      await rejectOnboardingRequest(param(req.params.id), req.user!.sub, req.body.reason ?? ""),
    );
  } catch (err) {
    next(err);
  }
});

router.get("/pharmacies/stats", async (req, res, next) => {
  try {
    res.json(
      await listPharmaciesWithStats({
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

router.get("/activity", async (_req, res, next) => {
  try {
    res.json(await getAdminActivityFeed());
  } catch (err) {
    next(err);
  }
});

router.get("/compliance/summary", async (_req, res, next) => {
  try {
    res.json(await getComplianceSummary());
  } catch (err) {
    next(err);
  }
});

router.get("/insurers/stats", async (_req, res, next) => {
  try {
    res.json(await getInsurerStats());
  } catch (err) {
    next(err);
  }
});

router.get("/pharmacies/:id", async (req, res, next) => {
  try {
    res.json(await getPharmacyDetail(param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/pharmacies/:id/reject", async (req, res, next) => {
  try {
    res.json(await rejectPharmacy(param(req.params.id), req.body.reason ?? "", req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/patients/:id", async (req, res, next) => {
  try {
    res.json(await getAdminPatientDetail(param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.put("/patients/:id/status", async (req, res, next) => {
  try {
    res.json(await setAdminPatientStatus(param(req.params.id), Boolean(req.body.flagged)));
  } catch (err) {
    next(err);
  }
});

router.get("/disputes/:id", async (req, res, next) => {
  try {
    res.json(await getDisputeDetail(param(req.params.id)));
  } catch (err) {
    next(err);
  }
});

router.post("/invoices", async (req, res, next) => {
  try {
    res.status(201).json(await createAdminInvoice(req.body));
  } catch (err) {
    next(err);
  }
});

router.get("/system/health/extended", async (_req, res, next) => {
  try {
    res.json(await getExtendedSystemHealth());
  } catch (err) {
    next(err);
  }
});

router.get("/system/latency", async (_req, res, next) => {
  try {
    res.json(await getSystemLatencySeries());
  } catch (err) {
    next(err);
  }
});

router.post("/dashboard/export", async (req, res, next) => {
  try {
    res.json(await exportAdminDashboardSnapshot(req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/reports/insurer", async (req, res, next) => {
  try {
    res.json(await generateAdminInsurerReport(req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.get("/transactions/ledger", async (req, res, next) => {
  try {
    res.json(await getTransactionsLedger(req.query.limit ? parseInt(String(req.query.limit), 10) : 100));
  } catch (err) {
    next(err);
  }
});

export default router;
