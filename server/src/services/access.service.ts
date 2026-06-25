import type { GranteeType } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { forbidden } from "../utils/errors.js";
import type { TokenPayload } from "../utils/crypto.js";

export async function assertAccessGrant(
  patientId: string,
  granteeType: GranteeType,
  granteeId: string,
): Promise<void> {
  const grant = await prisma.accessGrant.findFirst({
    where: {
      patientId,
      granteeType,
      granteeId,
      isActive: true,
      expiresAt: { gt: new Date() },
    },
  });
  if (!grant) throw forbidden("No active access grant for this patient");
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
