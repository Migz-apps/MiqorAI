import { Router, type Request, type Response } from "express";
import { authenticate } from "../middleware/auth.js";
import { clampLimit } from "../utils/param.js";
import {
  CATALOG_DEFAULT_LIMIT,
  CATALOG_MAX_LIMIT,
  type CatalogPage,
  type CatalogSearchOptions,
  checkDrugInteractions,
  listActivePharmacies,
  searchDrugCatalog,
  searchIcdCodes,
} from "../services/reference.service.js";

const router = Router();

router.use(authenticate);

/**
 * Catalog search contract (ICD codes and drugs):
 *   ?q=<text>            case-insensitive search (code/description, name/generic name)
 *   ?match=prefix        starts-with instead of the default contains
 *   ?limit=1..100        page size (default 50)
 *   ?offset=N            rows to skip (default 0)
 *   ?paged=true          respond { items, total, limit, offset, has_more }
 * Without paged=true the body stays a bare array (existing callers) and the
 * pagination metadata is sent as X-Total-Count / X-Limit / X-Offset headers.
 */
function catalogOptions(req: Request): CatalogSearchOptions {
  const offset = parseInt(String(req.query.offset ?? ""), 10);
  return {
    query: req.query.q ? String(req.query.q) : undefined,
    match: req.query.match === "prefix" ? "prefix" : "contains",
    limit: clampLimit(req.query.limit, CATALOG_DEFAULT_LIMIT, CATALOG_MAX_LIMIT),
    offset: Number.isNaN(offset) ? 0 : offset,
  };
}

function sendCatalogPage<T>(req: Request, res: Response, page: CatalogPage<T>) {
  if (req.query.paged === "true" || req.query.paged === "1") {
    res.json(page);
    return;
  }
  res.setHeader("X-Total-Count", String(page.total));
  res.setHeader("X-Limit", String(page.limit));
  res.setHeader("X-Offset", String(page.offset));
  res.json(page.items);
}

router.get("/icd", async (req, res, next) => {
  try {
    sendCatalogPage(req, res, await searchIcdCodes(catalogOptions(req)));
  } catch (err) {
    next(err);
  }
});

router.get("/drugs", async (req, res, next) => {
  try {
    sendCatalogPage(req, res, await searchDrugCatalog(catalogOptions(req)));
  } catch (err) {
    next(err);
  }
});

router.post("/drug-interactions", async (req, res, next) => {
  try {
    const drugs = Array.isArray(req.body.drugs) ? req.body.drugs.map(String) : [];
    res.json({ interactions: await checkDrugInteractions(drugs) });
  } catch (err) {
    next(err);
  }
});

router.get("/pharmacies", async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    res.json(await listActivePharmacies(q));
  } catch (err) {
    next(err);
  }
});

export default router;
