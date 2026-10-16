import type { DrugCatalog, IcdCode } from "@prisma/client";
import { prisma } from "../lib/prisma.js";

export const CATALOG_DEFAULT_LIMIT = 50;
export const CATALOG_MAX_LIMIT = 100;

export interface CatalogSearchOptions {
  /** Case-insensitive search text (trimmed, max 100 chars). */
  query?: string;
  /** "contains" (default) or "prefix" (starts-with). */
  match?: "contains" | "prefix";
  limit?: number;
  offset?: number;
}

export interface CatalogPage<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  has_more: boolean;
}

function normalizeCatalogOptions(options: CatalogSearchOptions) {
  const query = options.query?.trim().slice(0, 100) || undefined;
  const limit = Math.min(Math.max(Math.floor(options.limit ?? CATALOG_DEFAULT_LIMIT), 1), CATALOG_MAX_LIMIT);
  const offset = Math.max(Math.floor(options.offset ?? 0), 0);
  const op = options.match === "prefix" ? "startsWith" : "contains";
  const filter = (value: string) => ({ [op]: value, mode: "insensitive" as const });
  return { query, limit, offset, filter };
}

export async function searchIcdCodes(options: CatalogSearchOptions = {}): Promise<CatalogPage<IcdCode>> {
  const { query, limit, offset, filter } = normalizeCatalogOptions(options);
  const where = query ? { OR: [{ code: filter(query) }, { description: filter(query) }] } : {};
  const [items, total] = await Promise.all([
    prisma.icdCode.findMany({ where, skip: offset, take: limit, orderBy: { code: "asc" } }),
    prisma.icdCode.count({ where }),
  ]);
  return { items, total, limit, offset, has_more: offset + items.length < total };
}

export async function searchDrugCatalog(options: CatalogSearchOptions = {}): Promise<CatalogPage<DrugCatalog>> {
  const { query, limit, offset, filter } = normalizeCatalogOptions(options);
  const where = query ? { OR: [{ name: filter(query) }, { genericName: filter(query) }] } : {};
  const [items, total] = await Promise.all([
    prisma.drugCatalog.findMany({ where, skip: offset, take: limit, orderBy: [{ name: "asc" }, { id: "asc" }] }),
    prisma.drugCatalog.count({ where }),
  ]);
  return { items, total, limit, offset, has_more: offset + items.length < total };
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
