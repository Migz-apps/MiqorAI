import { Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "./logger.js";

let redis: Redis | null = null;
let lastErrorLoggedAt = 0;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, {
      maxRetriesPerRequest: 3,
      lazyConnect: true,
      retryStrategy: (times) => {
        if (times > 20) return null;
        return Math.min(times * 100, 3000);
      },
    });
    redis.on("error", (err: Error) => {
      const now = Date.now();
      if (now - lastErrorLoggedAt > 30_000) {
        lastErrorLoggedAt = now;
        logger.warn("Redis error", { message: err.message });
      }
    });
    redis.on("ready", () => {
      lastErrorLoggedAt = 0;
      logger.info("Redis connected");
    });
  }
  return redis;
}

export function isRedisReady(): boolean {
  return redis?.status === "ready";
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  const maxAttempts = 20;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      if (client.status !== "ready") {
        await client.connect();
      }
      await client.ping();
      return;
    } catch {
      if (attempt === maxAttempts) {
        logger.warn("Redis unavailable — continuing without cache");
        return;
      }
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
  }
}

export async function disconnectRedis(): Promise<void> {
  if (redis && redis.status !== "end") {
    await redis.quit().catch(() => undefined);
  }
  redis = null;
}
