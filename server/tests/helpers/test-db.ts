import path from "node:path";
import { fileURLToPath } from "node:url";
import { execSync } from "node:child_process";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

/** server/ directory (this file lives in server/tests/helpers). */
export const SERVER_DIR = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

/**
 * Resolves the database the test suite runs against.
 *
 * TEST_DATABASE_URL wins when set. Otherwise the URL is derived from
 * DATABASE_URL (server/.env) by suffixing the database name with `_test`,
 * so the suite never shares a database with local development.
 */
export function resolveTestDatabaseUrl(): string {
  dotenv.config({ path: path.join(SERVER_DIR, ".env") });

  const explicit = process.env.TEST_DATABASE_URL?.trim();
  const devUrl = process.env.DATABASE_URL?.trim();
  if (!explicit && !devUrl) {
    throw new Error("Set TEST_DATABASE_URL (or DATABASE_URL in server/.env) to run the test suite");
  }

  const testUrl = explicit || withDatabaseName(devUrl!, `${databaseName(devUrl!)}_test`);
  if (devUrl && sameDatabase(testUrl, devUrl)) {
    throw new Error(
      "TEST_DATABASE_URL points at the same database as DATABASE_URL; refusing to run tests against it",
    );
  }
  return testUrl;
}

export function databaseName(url: string): string {
  const name = decodeURIComponent(new URL(url).pathname.replace(/^\//, ""));
  if (!name) throw new Error("Database URL has no database name");
  return name;
}

function withDatabaseName(url: string, name: string): string {
  const parsed = new URL(url);
  parsed.pathname = `/${encodeURIComponent(name)}`;
  return parsed.toString();
}

function sameDatabase(a: string, b: string): boolean {
  const ua = new URL(a);
  const ub = new URL(b);
  return ua.hostname === ub.hostname && (ua.port || "5432") === (ub.port || "5432") && databaseName(a) === databaseName(b);
}

function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`;
}

/** Runs `fn` with a client connected to the server's `postgres` maintenance database. */
async function withMaintenanceClient<T>(testUrl: string, fn: (client: PrismaClient) => Promise<T>): Promise<T> {
  const client = new PrismaClient({ datasourceUrl: withDatabaseName(testUrl, "postgres") });
  try {
    return await fn(client);
  } finally {
    await client.$disconnect();
  }
}

export async function createDatabaseIfMissing(testUrl: string): Promise<boolean> {
  const name = databaseName(testUrl);
  return withMaintenanceClient(testUrl, async (client) => {
    const rows = await client.$queryRaw<{ exists: boolean }[]>`
      SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = ${name}) AS "exists"`;
    if (rows[0]?.exists) return false;
    await client.$executeRawUnsafe(`CREATE DATABASE ${quoteIdent(name)}`);
    return true;
  });
}

export async function dropDatabase(testUrl: string): Promise<void> {
  const name = databaseName(testUrl);
  await withMaintenanceClient(testUrl, async (client) => {
    await client.$executeRaw`
      SELECT pg_terminate_backend(pid) FROM pg_stat_activity
      WHERE datname = ${name} AND pid <> pg_backend_pid()`;
    await client.$executeRawUnsafe(`DROP DATABASE IF EXISTS ${quoteIdent(name)}`);
  });
}

function run(command: string, testUrl: string): void {
  execSync(command, {
    cwd: SERVER_DIR,
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: testUrl },
  });
}

export function migrateDatabase(testUrl: string): void {
  run("npx prisma migrate deploy", testUrl);
}

/** The seed wipes every table before inserting, so this also resets state left by a previous run. */
export function seedDatabase(testUrl: string): void {
  run("npx tsx prisma/seed.ts", testUrl);
}

/** Creates (if needed), migrates and seeds the test database. */
export async function prepareTestDatabase(testUrl: string): Promise<void> {
  await createDatabaseIfMissing(testUrl);
  migrateDatabase(testUrl);
  seedDatabase(testUrl);
}
