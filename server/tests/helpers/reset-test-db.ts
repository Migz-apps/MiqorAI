import { databaseName, dropDatabase, prepareTestDatabase, resolveTestDatabaseUrl } from "./test-db.js";

/** `npm run test:reset-db`: drops the test database and rebuilds it from migrations + seed. */
const testUrl = resolveTestDatabaseUrl();
const name = databaseName(testUrl);

console.log(`[tests] dropping test database "${name}"`);
await dropDatabase(testUrl);
console.log(`[tests] recreating test database "${name}"`);
await prepareTestDatabase(testUrl);
console.log(`[tests] test database "${name}" is ready`);
