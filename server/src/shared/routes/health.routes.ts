import { Router, type Request, type Response } from "express";
import { prisma } from "../lib/prisma.js";
import { getRedis, isRedisReady } from "../lib/redis.js";
import { logger } from "../lib/logger.js";

const PROBE_TIMEOUT_MS = 2000;

type ProbeStatus = "up" | "down" | "disabled";

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`timed out after ${ms}ms`)), ms);
    promise.then(
      (value) => {
        clearTimeout(timer);
        resolve(value);
      },
      (err) => {
        clearTimeout(timer);
        reject(err);
      },
    );
  });
}

async function probeDatabase(): Promise<{ status: ProbeStatus; latency_ms?: number }> {
  const started = Date.now();
  try {
    await withTimeout(prisma.$queryRaw`SELECT 1`, PROBE_TIMEOUT_MS);
    return { status: "up", latency_ms: Date.now() - started };
  } catch (err) {
    logger.warn("health probe failed", { err: err instanceof Error ? err.message : String(err) });
    return { status: "down" };
  }
}

/** Redis is optional (rate limits and caches fall back to memory), so it never
 * fails readiness. Without an explicit REDIS_URL and no live connection it is
 * reported as disabled; a client that is not connected is never pinged, so a
 * probe cannot trigger reconnect storms. */
async function probeRedis(): Promise<{ status: ProbeStatus; latency_ms?: number }> {
  if (!isRedisReady()) {
    return process.env.REDIS_URL?.trim() ? { status: "down" } : { status: "disabled" };
  }
  const started = Date.now();
  try {
    await withTimeout(getRedis().ping(), PROBE_TIMEOUT_MS);
    return { status: "up", latency_ms: Date.now() - started };
  } catch (err) {
    logger.warn("health probe failed", { err: err instanceof Error ? err.message : String(err) });
    return { status: "down" };
  }
}

const router = Router();

/** Liveness: the process is up and serving. Touches no dependency. */
router.get("/live", (_req, res) => {
  res.json({ status: "ok" });
});

/** Readiness: 503 when the database is unreachable, so load balancers stop
 * routing to (and deploys do not promote) an instance that cannot serve. */
async function readiness(_req: Request, res: Response) {
  const [database, redis] = await Promise.all([probeDatabase(), probeRedis()]);
  const ready = database.status === "up";
  res.status(ready ? 200 : 503).json({
    status: !ready ? "down" : redis.status === "down" ? "degraded" : "ok",
    checks: { database, redis },
    uptime_seconds: Math.round(process.uptime()),
  });
}

router.get("/ready", readiness);
router.get("/", readiness);

export default router;
