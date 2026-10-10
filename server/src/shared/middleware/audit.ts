import type { NextFunction, Request, Response } from "express";
import { writeAuditLog } from "../services/audit.service.js";

const SKIP_PREFIXES = ["/health", "/api/files/"];

export function auditMiddleware(req: Request, res: Response, next: NextFunction) {
  if (req.method === "GET" || req.method === "OPTIONS") {
    next();
    return;
  }
  if (SKIP_PREFIXES.some((p) => req.path === p || req.path.startsWith(p))) {
    next();
    return;
  }

  res.on("finish", () => {
    void writeAuditLog({
      userId: req.user?.sub ?? null,
      userEmail: req.user?.email ?? null,
      action: `${req.method} ${req.originalUrl.split("?")[0]}`,
      resourceType: "api_request",
      resourceId: null,
      organizationId: req.user?.organizationId ?? null,
      ipAddress: req.ip,
      userAgent: req.get("user-agent") ?? null,
      success: res.statusCode < 400,
      failureReason: res.statusCode >= 400 ? `HTTP ${res.statusCode}` : null,
    }).catch(() => {
      /* non-blocking */
    });
  });

  next();
}
