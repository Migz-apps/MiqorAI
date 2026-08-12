# Running MiqorAI

## What runs together

MiqorAI currently runs as:

- one shared backend in `server/`
- multiple web portals
- one mobile patient app
- one shared PostgreSQL database
- one shared Redis instance
- one optional external clinical-safety AI service

The old `backend/` microservices stack is no longer part of the active run path for this repo.

## Start the full local web system

From the repository root:

```powershell
npm run dev:full
```

This starts:

| Service | URL |
|---------|-----|
| Shared backend API | http://localhost:3000 |
| Patient portal | http://localhost:5173 |
| Hospital portal | http://localhost:8080 |
| Insurance portal | http://localhost:8081 |
| Pharmacy portal | http://localhost:8082 |
| Admin portal | http://localhost:8083 |

Press `Ctrl+C` to stop all servers.

## Start a smaller local set

Backend only:

```powershell
npm run dev:api
```

Backend + patient + hospital:

```powershell
npm run dev:core
```

## Run a single web portal

```powershell
cd patient-portal-desktop
npm run dev
```

You can replace `patient-portal-desktop` with:

- `hospital-portal`
- `insurance-portal`
- `pharmacy-portal`
- `admin-portal`

Important: a single frontend still needs the shared backend if you want real authentication and data flows.

## Run the mobile app

```powershell
cd mobile_patient
npm start
```

For local device testing, use `mobile_patient/.env.local.example` to point the app at your local backend.

## Install dependencies

From the repository root:

```powershell
npm install
npm run install:all
npm install --prefix mobile_patient
```

## Build

Build backend and all web portals:

```powershell
npm run build:all
```

Type-check the mobile app:

```powershell
cd mobile_patient
npm run typecheck
```

## Tests

Production wiring checks:

```powershell
npm run test:production:wiring
```

Portal integration checks:

```powershell
npm run test:integration:portals
```

Full backend API suite:

```powershell
npm run test:api:all
```

## Redis for development

If your local setup needs Redis started separately:

```powershell
npm run redis:up
```

Stop it with:

```powershell
npm run redis:down
```

## Docker note

This repo still contains Docker-related assets for frontend packaging and local support, but the authoritative runtime path for the current system is the shared `server/` backend plus the client apps above.
