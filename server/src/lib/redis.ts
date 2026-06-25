import { Redis } from "ioredis";
import { config } from "../config.js";
import { logger } from "./logger.js";

let redis: Redis | null = null;

export function getRedis(): Redis {
  if (!redis) {
    redis = new Redis(config.redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true });
    redis.on("error", (err: Error) => logger.warn("Redis error", { message: err.message }));
  }
  return redis;
}

export async function connectRedis(): Promise<void> {
  const client = getRedis();
  if (client.status !== "ready") {
    await client.connect().catch(() => {
      logger.warn("Redis unavailable — continuing without cache");
    });
  }
}
