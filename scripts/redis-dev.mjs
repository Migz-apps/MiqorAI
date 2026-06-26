import { spawn } from "node:child_process";
import net from "node:net";

const REDIS_HOST = "127.0.0.1";
const REDIS_PORT = Number(process.env.REDIS_PORT ?? 6379);

function log(message) {
  console.log(`[redis] ${message}`);
}

function wait(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isPortOpen(host, port) {
  return new Promise((resolve) => {
    const socket = net.createConnection({ host, port }, () => {
      socket.end();
      resolve(true);
    });
    socket.on("error", () => resolve(false));
    socket.setTimeout(1500, () => {
      socket.destroy();
      resolve(false);
    });
  });
}

async function waitForRedis(maxAttempts = 60) {
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    if (await isPortOpen(REDIS_HOST, REDIS_PORT)) return true;
    await wait(500);
  }
  return false;
}

function runCommand(command, args) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: "ignore", shell: process.platform === "win32" });
    child.on("error", () => resolve(false));
    child.on("exit", (code) => resolve(code === 0));
  });
}

async function tryDockerRedis() {
  const composeArgs = ["compose", "-f", "docker-compose.dev.yml", "up", "-d", "--wait", "redis"];
  for (const command of ["docker", "docker.exe"]) {
    const started = await runCommand(command, composeArgs);
    if (!started) continue;
    if (await waitForRedis()) {
      log(`Docker Redis ready on ${REDIS_HOST}:${REDIS_PORT}`);
      return true;
    }
  }
  return false;
}

async function startEmbeddedRedis() {
  const { RedisMemoryServer } = await import("redis-memory-server");
  const server = new RedisMemoryServer({
    instance: { port: REDIS_PORT, ip: REDIS_HOST },
    autoStart: false,
  });

  await server.start();
  log(`Embedded Redis ready on ${REDIS_HOST}:${REDIS_PORT}`);

  const shutdown = async () => {
    await server.stop().catch(() => undefined);
    process.exit(0);
  };

  process.on("SIGINT", () => void shutdown());
  process.on("SIGTERM", () => void shutdown());
}

async function main() {
  if (await isPortOpen(REDIS_HOST, REDIS_PORT)) {
    log(`Already running on ${REDIS_HOST}:${REDIS_PORT}`);
    await new Promise(() => {});
    return;
  }

  if (await tryDockerRedis()) {
    await new Promise(() => {});
    return;
  }

  await startEmbeddedRedis();
  await new Promise(() => {});
}

main().catch((err) => {
  console.error("[redis] Failed to start:", err);
  process.exit(1);
});
