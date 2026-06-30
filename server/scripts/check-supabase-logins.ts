import { PrismaClient } from "@prisma/client";
import { verifyPassword } from "../src/utils/crypto.js";

const prisma = new PrismaClient();
const password = process.env.CHECK_PASSWORD ?? "MiqorAI123!";

const emails = [
  "admin@miqorai.com",
  "dr.amara@example.com",
  "dr.kimani@example.com",
  "grace.muthoni@example.com",
  "pharm.kevin@example.com",
  "claims.reviewer@nhidemo.demo",
];

async function main() {
  const results = [];

  for (const email of emails) {
    const user = await prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        role: true,
        organizationId: true,
        organizationType: true,
        isActive: true,
        passwordHash: true,
      },
    });

    if (!user) {
      results.push({ email, found: false });
      continue;
    }

    let organizationCode: string | null = null;
    if (user.organizationType === "hospital" && user.organizationId) {
      const hospital = await prisma.hospital.findUnique({
        where: { id: user.organizationId },
        select: { code: true, isActive: true, name: true },
      });
      organizationCode = hospital?.code ?? null;
      results.push({
        email,
        found: true,
        role: user.role,
        organizationType: user.organizationType,
        organizationCode,
        organizationActive: hospital?.isActive ?? null,
        userActive: user.isActive,
        passwordMatches: verifyPassword(password, user.passwordHash),
      });
      continue;
    }

    if (user.organizationType === "pharmacy" && user.organizationId) {
      const pharmacy = await prisma.pharmacy.findUnique({
        where: { id: user.organizationId },
        select: { code: true, isActive: true, name: true },
      });
      organizationCode = pharmacy?.code ?? null;
      results.push({
        email,
        found: true,
        role: user.role,
        organizationType: user.organizationType,
        organizationCode,
        organizationActive: pharmacy?.isActive ?? null,
        userActive: user.isActive,
        passwordMatches: verifyPassword(password, user.passwordHash),
      });
      continue;
    }

    if (user.organizationType === "insurer" && user.organizationId) {
      const insurer = await prisma.insurer.findUnique({
        where: { id: user.organizationId },
        select: { code: true, isActive: true, name: true },
      });
      organizationCode = insurer?.code ?? null;
      results.push({
        email,
        found: true,
        role: user.role,
        organizationType: user.organizationType,
        organizationCode,
        organizationActive: insurer?.isActive ?? null,
        userActive: user.isActive,
        passwordMatches: verifyPassword(password, user.passwordHash),
      });
      continue;
    }

    results.push({
      email,
      found: true,
      role: user.role,
      organizationType: user.organizationType,
      organizationCode,
      userActive: user.isActive,
      passwordMatches: verifyPassword(password, user.passwordHash),
    });
  }

  console.log(JSON.stringify(results, null, 2));
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
