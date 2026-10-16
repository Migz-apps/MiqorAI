import { databaseName, prepareTestDatabase, resolveTestDatabaseUrl } from "./test-db.js";

/**
 * Runs once per `vitest run`, before any worker starts: makes sure the
 * dedicated test database exists, applies migrations and reseeds it.
 * Workers receive the same URL through `test.env.DATABASE_URL` in vitest.config.ts.
 */
export default async function globalSetup(): Promise<void> {
  const testUrl = resolveTestDatabaseUrl();
  console.log(`[tests] preparing test database "${databaseName(testUrl)}"`);
  await prepareTestDatabase(testUrl);
  process.env.DATABASE_URL = testUrl;
}
