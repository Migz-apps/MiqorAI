# MiqorAI Production Deployment Map

This file defines the production launch topology for the full MiqorAI system so every client app talks to the same backend and the backend uses the same database, storage, Redis, and AI service.

## 1. Deploy the shared backend first

- Service: `server/`
- Host: Render web service
- Public URL target: `https://api.miqorai.com`
- Runtime source of truth: [render.yaml](./render.yaml)
- Required env template: [server/.env.production.example](./server/.env.production.example)

The backend is the integration hub for:
- patient web portal
- hospital portal
- insurance portal
- pharmacy portal
- admin portal
- mobile patient app
- Supabase Postgres
- Supabase Storage
- Redis
- AI clinical safety service

## 2. Use one production database and one production storage layer

- Primary database: Supabase Postgres via `DATABASE_URL`
- File storage: Supabase Storage via `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET`
- Session / cache / revocation store: Redis via `REDIS_URL`

All portals must go through the backend. No portal should connect directly to the database.

## 3. Deploy the AI service separately and connect it only through the backend

- Service: `hf-space-publish/` or `miqorai-ai-service/`
- Host: Hugging Face Space
- Public URL target: `https://mazimpakamiguel-miqorai.hf.space`

Backend envs:
- `AI_SERVICE_BASE_URL=https://mazimpakamiguel-miqorai.hf.space`
- `AI_SERVICE_URL=https://mazimpakamiguel-miqorai.hf.space`
- `MIQORAI_AI_MOCK=false`

## 4. Deploy the web SPAs to Vercel

These portals are Vite SPAs and should be deployed as separate Vercel projects with their own root directories:

1. `patient-portal-desktop/`
2. `hospital-portal/`
3. `insurance-portal/`
4. `pharmacy-portal/`

Each of those directories now includes:
- `.env.production.example`
- `vercel.json`

Required env for each Vercel project:

```env
VITE_API_URL=https://api.miqorai.com
```

The `vercel.json` rewrite keeps client-side routing working on deep links.

## 5. Deploy the admin portal as its own production app

- Service: `admin-portal/`
- Recommended host: Cloudflare Workers / Pages because the repo already includes `wrangler.jsonc` and a TanStack Start server entry.

Required env:

```env
VITE_API_URL=https://api.miqorai.com
```

If you choose a different host, keep the same env and make sure the host supports the TanStack Start server entry defined in:
- [admin-portal/src/server.ts](./admin-portal/src/server.ts)
- [admin-portal/wrangler.jsonc](./admin-portal/wrangler.jsonc)

## 6. Deploy the mobile patient app through Expo / EAS

- Service: `mobile_patient/`
- Release system: Expo EAS
- Env template: [mobile_patient/.env.production.example](./mobile_patient/.env.production.example)

Required env:

```env
EXPO_PUBLIC_API_URL=https://api.miqorai.com
```

The mobile app now has a production-safe fallback and should never ship pointing to localhost.

## 7. Production domain map

Use one domain per surface:

- `api.miqorai.com` -> Render backend
- `patient.miqorai.com` -> patient web portal
- `hospital.miqorai.com` -> hospital portal
- `insurance.miqorai.com` -> insurance portal
- `pharmacy.miqorai.com` -> pharmacy portal
- `admin.miqorai.com` -> admin portal

Then set backend `CORS_ORIGINS` to exactly those public domains.

## 8. Current code changes that now link the portals through the backend

These clients now use production-safe backend resolution instead of raw localhost fallbacks:

- [patient-portal-desktop/src/lib/api/client.ts](./patient-portal-desktop/src/lib/api/client.ts)
- [hospital-portal/src/lib/api/client.ts](./hospital-portal/src/lib/api/client.ts)
- [insurance-portal/src/lib/api/client.ts](./insurance-portal/src/lib/api/client.ts)
- [pharmacy-portal/src/lib/api/client.ts](./pharmacy-portal/src/lib/api/client.ts)
- [admin-portal/src/lib/api/client.ts](./admin-portal/src/lib/api/client.ts)
- [mobile_patient/src/lib/api.ts](./mobile_patient/src/lib/api.ts)

For local development, the following Vite apps are now also explicitly proxied to the backend API:

- [hospital-portal/vite.config.ts](./hospital-portal/vite.config.ts)
- [insurance-portal/vite.config.ts](./insurance-portal/vite.config.ts)
- [pharmacy-portal/vite.config.ts](./pharmacy-portal/vite.config.ts)
- [admin-portal/vite.config.ts](./admin-portal/vite.config.ts)
- [patient-portal-desktop/vite.config.ts](./patient-portal-desktop/vite.config.ts)

## 9. Commands for you to run manually after this task

I did not run install, test, or push commands. Run these yourself after you fill the production envs:

```powershell
npm run build --prefix patient-portal-desktop
npm run build --prefix hospital-portal
npm run build --prefix insurance-portal
npm run build --prefix pharmacy-portal
npm run build --prefix admin-portal
npm run build --prefix server
npm run typecheck --prefix mobile_patient
```

Then deploy in this order:

1. Backend
2. AI service
3. Patient web
4. Hospital web
5. Insurance web
6. Pharmacy web
7. Admin portal
8. Mobile app release
