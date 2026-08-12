# MiqorAI

MiqorAI is a connected health platform made up of multiple client apps backed by one shared Node.js API, one shared PostgreSQL database, Redis, and an optional clinical-safety AI service.

## Repository structure

| Directory | Role | Stack | Dev port |
|-----------|------|-------|----------|
| `server/` | Shared backend API, auth, files, reports, integrations | Node.js, Express, Prisma | 3000 |
| `patient-portal-desktop/` | Patient web portal | Vite, React | 5173 |
| `hospital-portal/` | Hospital staff portal | Vite, React | 8080 |
| `insurance-portal/` | Insurer portal | Vite, React | 8081 |
| `pharmacy-portal/` | Pharmacy portal | Vite, React | 8082 |
| `admin-portal/` | Platform admin portal | TanStack Start, React | 8083 |
| `mobile_patient/` | Patient mobile app | Expo, React Native | Expo default |

Supporting folders:

- `scripts/` - local helper scripts
- `seed_data/` - CSV seed inputs used by the backend seed flow
- `docker-compose.dev.yml` - local Redis support for development

## Current launch story

All portals are meant to talk to the shared backend in `server/`.

The frontends are no longer meant to run as isolated mock-only products for launch. A valid backend, database, and environment configuration are part of the normal system startup story.

## Local development

Install dependencies:

```bash
npm install
npm run install:all
npm install --prefix mobile_patient
```

Start backend plus the main web portals:

```bash
npm run dev:full
```

That starts:

- API: http://localhost:3000
- Patient portal: http://localhost:5173
- Hospital portal: http://localhost:8080
- Insurance portal: http://localhost:8081
- Pharmacy portal: http://localhost:8082
- Admin portal: http://localhost:8083

If you only want backend + patient + hospital:

```bash
npm run dev:core
```

If you only want the backend:

```bash
npm run dev:api
```

## Mobile app

```bash
cd mobile_patient
npm start
```

For local phone testing, point `EXPO_PUBLIC_API_URL` at your computer's reachable IP using `mobile_patient/.env.local.example`.

## Backend setup

The backend needs:

- `DATABASE_URL`
- `REDIS_URL`
- `CORS_ORIGINS`
- `BASE_URL`
- JWT, encryption, file-signing, and QR secrets

Use:

- [server/.env.example](C:/Users/user/Downloads/github/MiqorAI-git/MiqorAI/server/.env.example:1)
- [server/SETUP.md](C:/Users/user/Downloads/github/MiqorAI-git/MiqorAI/server/SETUP.md:1)
- [server/CLINICAL_SAFETY.md](C:/Users/user/Downloads/github/MiqorAI-git/MiqorAI/server/CLINICAL_SAFETY.md:1)

## Build commands

Build backend and all web portals:

```bash
npm run build:all
```

Type-check the mobile app:

```bash
cd mobile_patient
npm run typecheck
```

## Test commands

Production wiring checks:

```bash
npm run test:production:wiring
```

Cross-portal integration checks:

```bash
npm run test:integration:portals
```

Full backend API suite:

```bash
npm run test:api:all
```

## Deployment overview

- Backend: deploy `server/` with its production environment variables
- Database: shared PostgreSQL instance, currently prepared for Supabase
- Redis: shared hosted Redis instance
- AI service: separate always-on HTTPS service used by clinical safety flows
- Web portals: deploy each frontend separately and point them to the deployed backend
- Mobile app: build separately and point it to the deployed backend

## Notes

- Do not rely on placeholder or demo credentials in production-facing portals.
- Do not deploy portals without a reachable shared backend.
- The hospital QR workflow, reports, prescriptions, lab ordering, patient access grants, and insurer workflows all depend on the shared backend.

## License

Proprietary - MiqorAI.
