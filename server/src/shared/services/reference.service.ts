import { prisma } from "../lib/prisma.js";

export async function searchIcdCodes(query?: string, limit = 50) {
  const where = query
    ? {
        OR: [
          { code: { contains: query, mode: "insensitive" as const } },
          { description: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  return prisma.icdCode.findMany({ where, take: limit, orderBy: { code: "asc" } });
}

export async function searchDrugCatalog(query?: string, limit = 50) {
  const where = query
    ? {
        OR: [
          { name: { contains: query, mode: "insensitive" as const } },
          { genericName: { contains: query, mode: "insensitive" as const } },
        ],
      }
    : {};
  return prisma.drugCatalog.findMany({ where, take: limit, orderBy: { name: "asc" } });
}

export async function checkDrugInteractions(drugNames: string[]) {
  const normalized = drugNames.map((d) => d.toLowerCase());
  const interactions = await prisma.drugInteraction.findMany();
  const hits = interactions.filter((i) => {
    const a = i.drugA.toLowerCase();
    const b = i.drugB.toLowerCase();
    return normalized.some((d) => d.includes(a) || a.includes(d)) &&
      normalized.some((d) => d.includes(b) || b.includes(d));
  });
  return hits.map((h) => ({
    drug_a: h.drugA,
    drug_b: h.drugB,
    severity: h.severity,
    note: h.note,
  }));
}

export async function listActivePharmacies(search?: string) {
  return prisma.pharmacy.findMany({
    where: {
      isActive: true,
      verified: true,
      ...(search
        ? { OR: [{ name: { contains: search, mode: "insensitive" } }, { code: { contains: search, mode: "insensitive" } }] }
        : {}),
    },
    select: { id: true, code: true, name: true, city: true, country: true },
    orderBy: { name: "asc" },
    take: 100,
  });
}

export async function seedReferenceDataIfEmpty() {
  const icdCount = await prisma.icdCode.count();
  if (icdCount === 0) {
    await prisma.icdCode.createMany({
      data: [
        { code: "BA00", description: "Essential hypertension" },
        { code: "5A11", description: "Type 2 diabetes mellitus" },
        { code: "CA23", description: "Asthma" },
        { code: "BA41", description: "Hypertensive heart disease" },
        { code: "MD11", description: "Acute appendicitis" },
      ],
    });
  }
  const drugCount = await prisma.drugCatalog.count();
  if (drugCount === 0) {
    await prisma.drugCatalog.createMany({
      data: [
        { name: "Lisinopril", genericName: "Lisinopril", strength: "10mg", dosageForm: "tablet", category: "ACE inhibitor" },
        { name: "Metformin", genericName: "Metformin", strength: "500mg", dosageForm: "tablet", category: "Antidiabetic" },
        { name: "Amlodipine", genericName: "Amlodipine", strength: "5mg", dosageForm: "tablet", category: "Calcium channel blocker" },
        { name: "Salbutamol", genericName: "Albuterol", strength: "100mcg", dosageForm: "inhaler", category: "Bronchodilator" },
      ],
    });
  }
}
