import { SyncOperation } from "@prisma/client";
import { Router } from "express";
import { z } from "zod";
import { authenticate } from "../middleware/auth.js";
import { validateBody } from "../middleware/errorHandler.js";
import {
  listUserSyncQueue,
  processSyncItem,
  pushSyncBatch,
} from "../services/sync.service.js";
import { deleteSyncQueueItem, resolveSyncConflict } from "../services/portal-complete.service.js";
import { param } from "../utils/param.js";

const router = Router();

router.use(authenticate);

const pushSchema = z.object({
  items: z
    .array(
      z.object({
        operation: z.nativeEnum(SyncOperation),
        resource_type: z.string().min(1),
        resource_data: z.record(z.unknown()),
      }),
    )
    .min(1)
    .max(50),
});

router.get("/queue", async (req, res, next) => {
  try {
    res.json({ items: await listUserSyncQueue(req.user!.sub) });
  } catch (err) {
    next(err);
  }
});

router.post("/push", validateBody(pushSchema), async (req, res, next) => {
  try {
    res.json({ results: await pushSyncBatch(req.user!.sub, req.body.items) });
  } catch (err) {
    next(err);
  }
});

router.post("/queue/:id/process", async (req, res, next) => {
  try {
    res.json(await processSyncItem(param(req.params.id), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.delete("/queue/:id", async (req, res, next) => {
  try {
    res.json(await deleteSyncQueueItem(param(req.params.id), req.user!.sub));
  } catch (err) {
    next(err);
  }
});

router.post("/queue/:id/resolve", async (req, res, next) => {
  try {
    res.json(await resolveSyncConflict(param(req.params.id), req.user!.sub, req.body.resolution ?? "client"));
  } catch (err) {
    next(err);
  }
});

export default router;
