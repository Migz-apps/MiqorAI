import type { NextFunction, Request, Response } from "express";
import rateLimit from "express-rate-limit";
import { config } from "../../config.js";
import { getRedis, isRedisReady } from "../lib/redis.js";

export const apiRateLimiter = rateLimit({
  windowMs: 60_000,
  max: config.rateLimitPerMinute,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: { code: "RATE_LIMIT", message: "Too many requests" } },
});

interface RateLimiterOptions {
  /** Distinct per limiter so different routes never share counters. */
  name: string;
  windowMs: number;
  max: number;
  /** Defaults to the client IP. */
  keyFn?: (req: Request) => string;
}

const MEMORY_BUCKET_LIMIT = 10_000;
const memoryBuckets = new Map<string, { count: number; resetAt: number }>();

function incrementMemory(key: string, windowMs: number): { count: number; resetAt: number } {
  const now = Date.now();
  if (memoryBuckets.size > MEMORY_BUCKET_LIMIT) {
    for (const [k, bucket] of memoryBuckets) {
      if (bucket.resetAt <= now) memoryBuckets.delete(k);
    }
  }
  const existing = memoryBuckets.get(key);
  if (!existing || existing.resetAt <= now) {
    const fresh = { count: 1, resetAt: now + windowMs };
    memoryBuckets.set(key, fresh);
    return fresh;
  }
  existing.count += 1;
  return existing;
}

async function incrementRedis(
  key: string,
  windowMs: number,
): Promise<{ count: number; resetAt: number }> {
  const redis = getRedis();
  const count = await redis.incr(key);
  if (count === 1) {
    await redis.pexpire(key, windowMs);
    return { count, resetAt: Date.now() + windowMs };
  }
  const ttl = await redis.pttl(key);
  if (ttl < 0) {
    // Repair a counter that somehow lost its expiry.
    await redis.pexpire(key, windowMs);
    return { count, resetAt: Date.now() + windowMs };
  }
  return { count, resetAt: Date.now() + ttl };
}

/** Fixed-window limiter backed by Redis (INCR + EXPIRE) when available, with an
 * in-memory fallback so limits still apply when Redis is down. */
export function createRateLimiter({ name, windowMs, max, keyFn }: RateLimiterOptions) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const identity = keyFn ? keyFn(req) : (req.ip ?? "unknown");
    const key = `rl:${name}:${identity}`;

    let state: { count: number; resetAt: number };
    if (isRedisReady()) {
      try {
        state = await incrementRedis(key, windowMs);
      } catch {
        state = incrementMemory(key, windowMs);
      }
    } else {
      state = incrementMemory(key, windowMs);
    }

    if (state.count > max) {
      const retryAfterSeconds = Math.max(1, Math.ceil((state.resetAt - Date.now()) / 1000));
      res.setHeader("Retry-After", String(retryAfterSeconds));
      res.status(429).json({
        error: {
          code: "RATE_LIMIT",
          message: "Too many requests",
          details: { retry_after_seconds: retryAfterSeconds },
        },
      });
      return;
    }

    next();
  };
}
