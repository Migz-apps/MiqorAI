import { Router } from "express";
import multer from "multer";
import { authenticate, optionalAuth } from "../middleware/auth.js";
import { notFound } from "../utils/errors.js";
import { param } from "../utils/param.js";
import { assertFileAccess, readFileAssetContent, saveUploadedFile } from "../services/file.service.js";

const router = Router();
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.post("/upload", authenticate, upload.single("file"), async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400).json({ error: { code: "BAD_REQUEST", message: "file is required" } });
      return;
    }
    const resourceType = String(req.body.resource_type ?? "attachment");
    const resourceId = req.body.resource_id ? String(req.body.resource_id) : undefined;
    const result = await saveUploadedFile(
      req.user!.sub,
      req.file.originalname,
      req.file.buffer,
      req.file.mimetype,
      resourceType,
      resourceId,
    );
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
});

router.get("/:id", optionalAuth, async (req, res, next) => {
  try {
    const signedToken = typeof req.query.token === "string" ? req.query.token : undefined;
    const asset = await assertFileAccess(param(req.params.id), req.user?.sub, signedToken);
    if (!asset) throw notFound("File not found");
    const content = await readFileAssetContent(asset.storagePath);
    res.setHeader("Content-Type", asset.mimeType);
    res.setHeader("Content-Disposition", `attachment; filename="${asset.filename}"`);
    res.send(content);
  } catch (err) {
    next(err);
  }
});

export default router;
