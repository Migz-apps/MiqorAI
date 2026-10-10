import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import {
  checkDrugInteractions,
  listActivePharmacies,
  searchDrugCatalog,
  searchIcdCodes,
} from "../services/reference.service.js";

const router = Router();

router.use(authenticate);

router.get("/icd", async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    res.json(await searchIcdCodes(q));
  } catch (err) {
    next(err);
  }
});

router.get("/drugs", async (req, res, next) => {
  try {
    const q = req.query.q ? String(req.query.q) : undefined;
    res.json(await searchDrugCatalog(q));
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
