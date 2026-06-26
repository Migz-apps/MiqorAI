import { RedisMemoryServer } from "redis-memory-server";

const REDIS_HOST = "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);

const server = new RedisMemoryServer({
  instance: { port: REDIS_PORT, ip: REDIS_HOST },
  autoStart: false,
});

await server.start();
console.log(`[redis-server] Embedded Redis listening on ${REDIS_HOST}:${REDIS_PORT}`);

const shutdown = async () => {
  await server.stop().catch(() => undefined);
  process.exit(0);
};

process.on("SIGINT", () => void shutdown());
process.on("SIGTERM", () => void shutdown());

setInterval(() => {}, 60_000);
