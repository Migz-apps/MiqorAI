# Server tests

Vitest + supertest integration tests that exercise the Express app against a real PostgreSQL database.

## Running

```bash
cd server
npm test                  # full suite (alias: npm run test:all)
npm run test:integration  # cross-portal flow only
npm run test:watch        # watch mode
npm run test:reset-db     # drop and rebuild the test database
```

Requirements: a reachable PostgreSQL server and a `server/.env` (or exported env) with the usual app secrets (`JWT_SECRET`, `ENCRYPTION_KEY`, …).

## Test database

Tests never use the development database.

- **Which database**: `TEST_DATABASE_URL` if set; otherwise `DATABASE_URL` from `server/.env` with `_test` appended to the database name (`miqorai` -> `miqorai_test`, same server and credentials). The run aborts if the resolved URL points at the same database as `DATABASE_URL`.
- **Setup per run** (`tests/helpers/global-setup.ts`, once before any worker starts):
  1. creates the database if missing (via the server's `postgres` maintenance database, so the role needs `CREATEDB`);
  2. applies `prisma migrate deploy`;
  3. runs `prisma/seed.ts`, which truncates every table and reseeds, so each run starts from the same state.
- **Isolation model**: test files share that one seeded database and mutate it, so `fileParallelism` is `false` and files run one at a time. Within a run, later files see changes made by earlier ones; keep tests tolerant of that or restore what they change.
- **Reset**: `npm run test:reset-db` drops the database (terminating open connections) and rebuilds it from migrations + seed. Use it after editing migrations in place or when the schema has drifted.

The seed uses `SEED_PASSWORD` when set (falls back to the dev default outside production); `tests/helpers/context.ts` logs in with the same value.

### Pointing at another database

```bash
TEST_DATABASE_URL="postgresql://user:pass@host:5432/some_test_db?schema=public" npm test
```

```powershell
$env:TEST_DATABASE_URL = "postgresql://user:pass@host:5432/some_test_db?schema=public"; npm test
```

The database is created, migrated and reseeded the same way. Never point it at a database whose data matters.

## Environment overrides

All test-time env overrides live in `vitest.config.ts` under `test.env` (`NODE_ENV=test`, test `DATABASE_URL`, `SMTP_HOST=log`, `SMS_PROVIDER=log`, AI mock mode, no resend cooldown, high rate limit). Vitest applies them before any setup file or app module is imported. Do not assign `process.env` in setup files for values that `src/config.ts` reads at load time: ESM hoists imports, so such assignments run too late. `tests/test-env.test.ts` fails if the loaded config does not reflect these overrides.

Tests may still change env read at call time (e.g. `AI_SERVICE_*`, read by `getAiServiceConfig()`), restoring it afterwards.

## One-time codes

Production code always generates random OTPs. Tests that need the code mock `src/shared/utils/one-time-code.js` with `recordingOneTimeCodeModule` from `tests/helpers/one-time-codes.ts` and read it with `lastOneTimeCode()` (see `tests/core.endpoints.test.ts`). The setup file imports the app lazily so such `vi.mock` calls take effect.

## CI

Provide a PostgreSQL service and either `TEST_DATABASE_URL`, or `DATABASE_URL` (the `_test` database is derived from it), plus the app secrets, then run `npm ci && npm test` in `server/`. No separate migrate or seed step is needed.
