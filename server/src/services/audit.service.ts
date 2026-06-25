import type { Request } from "express";
import { prisma } from "../lib/prisma.js";

export async function writeAuditLog(opts: {
  userId?: string | null;
  userEmail?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  organizationId?: string | null;
  ipAddress?: string | null;
  userAgent?: string | null;
  success?: boolean;
  failureReason?: string | null;
}) {
  await prisma.auditLog.create({
    data: {
      userId: opts.userId ?? null,
      userEmail: opts.userEmail ?? null,
      action: opts.action,
      resourceType: opts.resourceType,
      resourceId: opts.resourceId ?? null,
      organizationId: opts.organizationId ?? null,
      ipAddress: opts.ipAddress ?? null,
      userAgent: opts.userAgent ?? null,
      success: opts.success ?? true,
      failureReason: opts.failureReason ?? null,
    },
  });
}

export function auditFromRequest(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.get("user-agent") ?? null,
    userId: req.user?.sub ?? null,
    userEmail: req.user?.email ?? null,
    organizationId: req.user?.organizationId ?? null,
  };
}

export async function listAuditLogs(filters: {
  organizationId?: string;
  userId?: string;
  action?: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
  offset?: number;
}) {
  const where: Record<string, unknown> = {};
  if (filters.organizationId) where.organizationId = filters.organizationId;
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
      take: filters.limit ?? 50,
      skip: filters.offset ?? 0,
    }),
    prisma.auditLog.count({ where }),
  ]);

  return { items, total };
}
