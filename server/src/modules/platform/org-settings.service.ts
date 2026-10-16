import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";

export async function getOrgSettings(scope: string, orgId: string) {
  const row = await prisma.orgSetting.findUnique({ where: { scope_orgId: { scope, orgId } } });
  return (row?.data as Record<string, unknown>) ?? {};
}

export async function setOrgSettings(scope: string, orgId: string, value: Record<string, unknown>) {
  await prisma.orgSetting.upsert({
    where: { scope_orgId: { scope, orgId } },
    create: { scope, orgId, data: value as Prisma.InputJsonValue },
    update: { data: value as Prisma.InputJsonValue },
  });
  return value;
}
