import { Prisma } from "@prisma/client";
import { prisma } from "../../shared/lib/prisma.js";

export async function getOrgSettings(scope: string, orgId: string) {
  const row = await prisma.platformSetting.findUnique({ where: { key: `${scope}:${orgId}` } });
  return (row?.value as Record<string, unknown>) ?? {};
}

export async function setOrgSettings(scope: string, orgId: string, value: Record<string, unknown>) {
  const key = `${scope}:${orgId}`;
  await prisma.platformSetting.upsert({
    where: { key },
    create: { key, value: value as Prisma.InputJsonValue },
    update: { value: value as Prisma.InputJsonValue },
  });
  return value;
}
