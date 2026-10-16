/**
 * Partner API (/api/partner/v1): read-only, insurer-scoped access authenticated
 * with the API keys issued in the insurer portal (InsurerApiKey). Documented in
 * docs/PARTNER_API.md.
 */
import { Router, type NextFunction, type Request, type Response } from "express";
import { ClaimStatus } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";
import { hashToken } from "../../shared/utils/crypto.js";
import { AppError, badRequest, unauthorized } from "../../shared/utils/errors.js";
import { createRateLimiter } from "../../shared/middleware/rateLimit.js";

const router = Router();

function readApiKey(req: Request): string | null {
  const headerKey = req.headers["x-api-key"];
  if (typeof headerKey === "string" && headerKey.trim()) return headerKey.trim();
  const auth = req.headers.authorization;
  if (auth?.startsWith("ApiKey ")) return auth.slice(7).trim() || null;
  return null;
}

async function apiKeyAuth(req: Request, _res: Response, next: NextFunction) {
  try {
    const raw = readApiKey(req);
    if (!raw) throw unauthorized("API key required", "API_KEY_REQUIRED");
    const key = await prisma.insurerApiKey.findFirst({
      where: { keyHash: hashToken(raw), revokedAt: null },
      include: { insurer: { select: { isActive: true } } },
    });
    if (!key || !key.insurer.isActive) throw unauthorized("Invalid API key", "API_KEY_INVALID");
    req.partner = { keyId: key.id, insurerId: key.insurerId };
    await prisma.insurerApiKey.update({ where: { id: key.id }, data: { lastUsedAt: new Date() } });
    next();
  } catch (err) {
    next(err instanceof AppError ? err : unauthorized("Invalid API key", "API_KEY_INVALID"));
  }
}

const partnerRateLimiter = createRateLimiter({
  name: "partner-api",
  windowMs: 60_000,
  max: 60,
  keyFn: (req) => req.partner?.keyId ?? req.ip ?? "unknown",
});

router.use(apiKeyAuth, partnerRateLimiter);

function parsePagination(req: Request): { limit: number; offset: number } {
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? "50"), 10) || 50, 1), 200);
  const offset = Math.max(parseInt(String(req.query.offset ?? "0"), 10) || 0, 0);
  return { limit, offset };
}

function parseDateFilter(value: unknown, field: string): Date | undefined {
  if (value === undefined) return undefined;
  const date = new Date(String(value));
  if (Number.isNaN(date.getTime())) throw badRequest(`Invalid ${field} date`);
  return date;
}

router.get("/claims", async (req, res, next) => {
  try {
    const insurerId = req.partner!.insurerId;
    const { limit, offset } = parsePagination(req);

    const status = req.query.status ? String(req.query.status) : undefined;
    if (status && !(Object.values(ClaimStatus) as string[]).includes(status)) {
      throw badRequest(`Invalid status: ${status}`);
    }
    const startDate = parseDateFilter(req.query.start_date, "start_date");
    const endDate = parseDateFilter(req.query.end_date, "end_date");

    const where = {
      insurerId,
      ...(status ? { status: status as ClaimStatus } : {}),
      ...(startDate || endDate
        ? { createdAt: { ...(startDate ? { gte: startDate } : {}), ...(endDate ? { lte: endDate } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      prisma.claim.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
      prisma.claim.count({ where }),
    ]);

    res.json({
      items: items.map((c) => ({
        id: c.id,
        patient_id: c.patientId,
        provider_name: c.providerName,
        amount: Number(c.amount),
        status: c.status,
        fraud_score: c.fraudScore,
        pattern: c.pattern,
        created_at: c.createdAt,
        updated_at: c.updatedAt,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

router.get("/members", async (req, res, next) => {
  try {
    const insurerId = req.partner!.insurerId;
    const { limit, offset } = parsePagination(req);

    const where = { insurerId };
    const [items, total] = await Promise.all([
      prisma.insurerMember.findMany({
        where,
        include: { patient: { select: { id: true, firstName: true, lastName: true } } },
        orderBy: { enrolledAt: "desc" },
        take: limit,
        skip: offset,
      }),
      prisma.insurerMember.count({ where }),
    ]);

    res.json({
      items: items.map((m) => ({
        id: m.id,
        member_number: m.memberNumber,
        patient_id: m.patient.id,
        name: `${m.patient.firstName} ${m.patient.lastName}`,
        enrolled_at: m.enrolledAt,
        active: m.isActive,
      })),
      total,
      limit,
      offset,
    });
  } catch (err) {
    next(err);
  }
});

export default router;
