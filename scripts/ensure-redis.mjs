import { spawn } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import net from "node:net";

const __dirname = dirname(fileURLToPath(import.meta.url));
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

function spawnBackgroundRedisServer() {
  const script = join(__dirname, "redis-server.mjs");
  const child = spawn(process.execPath, [script], {
    detached: true,
    stdio: "ignore",
    windowsHide: true,
    env: { ...process.env, REDIS_PORT: String(REDIS_PORT) },
  });
  child.unref();
}

async function main() {
  if (await isPortOpen(REDIS_HOST, REDIS_PORT)) {
    log(`Already running on ${REDIS_HOST}:${REDIS_PORT}`);
    return;
  }

  if (await tryDockerRedis()) {
    return;
  }

  log("Starting embedded Redis in background...");
  spawnBackgroundRedisServer();

  if (!(await waitForRedis())) {
    throw new Error(`Redis did not become ready on ${REDIS_HOST}:${REDIS_PORT}`);
  }

  log(`Embedded Redis ready on ${REDIS_HOST}:${REDIS_PORT}`);
}

main().catch((err) => {
  console.error("[redis] Failed to start:", err);
  process.exit(1);
});
