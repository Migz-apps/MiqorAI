import type { AccessScope, GranteeType } from "@prisma/client";
import { logger } from "../../shared/lib/logger.js";
import { prisma } from "../../shared/lib/prisma.js";
import { forbidden } from "../../shared/utils/errors.js";
import type { TokenPayload } from "../../shared/utils/crypto.js";

export type GrantResource = "summary" | "medications" | "lab_results" | "emergency";

/** Which resources each grant scope unlocks. */
const SCOPE_RESOURCES: Record<AccessScope, readonly GrantResource[]> = {
  full: ["summary", "medications", "lab_results", "emergency"],
  medications: ["medications"],
  lab_results: ["lab_results"],
  emergency_only: ["emergency"],
};

export async function assertAccessGrant(
  patientId: string,
  granteeType: GranteeType,
  granteeId: string,
  resource: GrantResource,
): Promise<void> {
  const grants = await prisma.accessGrant.findMany({
    where: {
      patientId,
      granteeType,
      granteeId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });
  if (grants.length === 0) throw forbidden("No active access grant for this patient");

  const grant = grants.find((g) => SCOPE_RESOURCES[g.scope]?.includes(resource));
  if (!grant) {
    throw forbidden(`Access grant does not cover '${resource}' for this patient`);
  }

  // Record the access without blocking the request path.
  prisma.accessGrant
    .update({ where: { id: grant.id }, data: { lastAccessedAt: new Date() } })
    .catch((err: unknown) => {
      logger.warn("Failed to record access grant usage", {
        grantId: grant.id,
        message: err instanceof Error ? err.message : String(err),
      });
    });
}

export async function logPatientAccess(opts: {
  patientId: string;
  accessorId: string;
  action: "view_records" | "add_record" | "view_visit" | "view_lab" | "view_prescription" | "dispense" | "scan_qr";
  grantId?: string;
  ipAddress?: string | null;
  userAgent?: string | null;
}) {
  await prisma.accessLog.create({ data: opts });
}

export function isSuperAdmin(user: TokenPayload): boolean {
  return user.role === "super_admin";
}

export function sameOrg(user: TokenPayload, orgId: string): boolean {
  return user.organizationId === orgId;
}
