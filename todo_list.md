# Full-System Launch To-Do List

1. Finalize the production deployment map for every component.
   - `render.yaml` only defines the Node API.
   - The repo does not yet contain one production deployment definition for the patient web, hospital, insurance, pharmacy, admin, mobile release pipeline, and AI service.

2. Finish production environment wiring for every client and service.
   - `admin-portal/src/lib/api/client.ts`, `insurance-portal/src/lib/api/client.ts`, and `pharmacy-portal/src/lib/api/client.ts` still fall back to `http://localhost:3000`.
   - `mobile_patient/src/lib/api.ts` still falls back to `http://localhost:3000` or `http://10.0.2.2:3000`.
   - `server/.env.example` and `server/CLINICAL_SAFETY.md` are still written around local Redis, localhost SMTP, and ngrok-style AI URLs.

3. Remove remaining demo credentials and prototype login hints from production UIs.
   - `admin-portal/src/routes/login.tsx` pre-fills the admin email and password.
   - `insurance-portal/src/pages/Login.tsx` pre-fills code, email, and password and exposes demo users.
   - `pharmacy-portal/src/pages/Login.tsx` pre-fills code, email, and password and exposes demo access text.

4. Clean the remaining deployment blockers in package manifests and docs.
   - `admin-portal/package.json`, `insurance-portal/package.json`, and `pharmacy-portal/package.json` still contain `MiqorAI: "file:.."`.
   - `Running.md` still points to the deleted `backend/` microservices stack.
   - `README.md` still says the frontends can run without a shared backend, which is no longer the launch story.

5. Replace prototype notification delivery with real production messaging.
   - `server/src/services/notification.service.ts` logs email failures instead of failing hard.
   - `server/src/services/sms.service.ts` defaults to dev/log mode unless Twilio is configured.
   - Before launch, invitation emails, OTPs, and password resets must be verified with real SMTP and SMS providers.

6. Promote the AI service from demo-safe mode to a stable production dependency.
   - `server/CLINICAL_SAFETY.md` and `miqorai-ai-service/README.md` still describe ngrok, Colab, and mock-oriented operation.
   - Launch requires a stable AI host, real `AI_SERVICE_*` values, `MIQORAI_AI_MOCK=false`, and a verified health check from the live backend.

7. Lock production file storage, exports, and backup behavior.
   - `server/src/services/file.service.ts` uses Supabase Storage only when the Supabase vars are actually present; otherwise it writes to local disk.
   - Launch requires confirming that uploads, reports, exports, and signed download URLs all use durable production storage and are covered by backups.

8. Finish the release path for every user-facing surface.
   - Web: patient desktop, hospital, insurance, pharmacy, and admin portals.
   - Mobile: a signed Android release and, if you want a full public launch rather than a demo-only Android release, an iOS release path too.
   - Backend: Node API, Redis, database, and AI service all need final live configuration and ownership.

9. Run a full deployed end-to-end smoke test across every role.
   - Patient login, records, grants, export, and QR.
   - Reception check-in, nurse workflow, doctor workflow, unfinished visit resume, prescription and lab ordering, allergy blocking, and QR scan.
   - Pharmacy dispensing and report download.
   - Insurer login, members, claims, and reports.
   - Platform admin login, approvals, disputes, and system health.

10. Close the release-quality test gap outside the API.
   - The API has strong automated coverage in `server/tests/`.
   - `admin-portal` has no test script in `package.json`.
   - `patient-portal-desktop` has no automated test script in `package.json`.
   - `hospital-portal`, `insurance-portal`, and `pharmacy-portal` only show lightweight frontend test scaffolding.
   - `mobile_patient` currently gives you type-checking, not full release QA.

11. Put production operations in place before go-live.
   - Set up uptime checks, error tracking, log review, and alerting for the API, AI service, Redis, and database.
   - Define backup and restore checks, secret rotation, incident contacts, and rollback steps.
   - Do one restore drill and one rollback rehearsal before launch day.

12. Freeze the launch runbook and demo data policy.
   - Decide whether launch uses seeded and demo data or real onboarding data.
   - Move any internal-only credentials out of user-facing screens and into a private operator runbook.
   - Update the docs so the team has one accurate source of truth for startup, deployment, testing, and recovery.

## Commands For You To Run After The Code And Config Work

```powershell
npm install
npm install --prefix server
npm install --prefix patient-portal-desktop
npm install --prefix hospital-portal
npm install --prefix insurance-portal
npm install --prefix pharmacy-portal
npm install --prefix admin-portal
npm install --prefix mobile_patient

npm test --prefix server
npm run build --prefix server
npm run build --prefix patient-portal-desktop
npm run build --prefix hospital-portal
npm run build --prefix insurance-portal
npm run build --prefix pharmacy-portal
npm run build --prefix admin-portal
npm run typecheck --prefix mobile_patient
npx expo-doctor@latest
```

Optional, if you want demo data in the target environment:

```powershell
npm run db:seed --prefix server
```

Optional, if you need to re-migrate local data into Supabase:

```powershell
node server/scripts/migrate-to-supabase.mjs
```


