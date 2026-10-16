# Seed data

Every file in this folder is **synthetic demo data** loaded by `server/prisma/seed.ts`
(`npm run db:seed`, and the test setup against the `_test` database). No row describes a
real person, organization or credential:

- `users.csv` `password_hash` holds the `<seed-password>` placeholder; the seed hashes
  `SEED_PASSWORD` instead.
- `patients.csv` `national_id` values use the `TEST-NID-` prefix; `recovery_phrase_enc` holds
  `ENC_RECOVERY_<id>` placeholders, not encrypted secrets.
- `staff_users.csv` / `organizations.csv` license numbers (`MD-RW-…`, `HSP-RW-…`) are invented.
- Emails use `example.com` / `.demo` domains.

Real onboarding data (patients, staff, licenses, national IDs, phone numbers) must never be
committed here or anywhere else in the repository. Import production data through the
application or a one-off script that reads from outside the repository.

The seed truncates every table first: it refuses `NODE_ENV=production` unless `FORCE_SEED=1`.
