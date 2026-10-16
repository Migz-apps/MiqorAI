# MiqorAI Production Deployment Map

Every client talks to one backend; the backend owns the database, storage,
Redis and the AI service. Local development needs none of this (see
[Running.md](./Running.md)).

## Topology

| Surface | Code | Production host | Config |
|---------|------|-----------------|--------|
| API | `server/` | Render web service `miqorai-server` | [render.yaml](./render.yaml) |
| Background worker | `server/` (`npm run start:worker`) | Render worker `miqorai-worker` | [render.yaml](./render.yaml) |
| Database | `server/prisma` | Supabase Postgres | `DATABASE_URL` |
| File storage | - | Supabase Storage | `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_STORAGE_BUCKET` |
| Cache / sessions | - | Managed Redis (e.g. Upstash) | `REDIS_URL` |
| AI clinical safety | `miqorai-ai-service/` | Hugging Face Space (`hf-space-publish/`) | [miqorai-ai-service/.env.example](./miqorai-ai-service/.env.example) |
| Patient portal | `patient-portal-desktop/` | GitHub Pages (or Vercel) | `.github/workflows/deploy-patient-portal.yml`, `vercel.json` |
| Hospital / insurance / pharmacy / admin portals | `*-portal/` | Vercel, one project each | `<portal>/vercel.json` |
| Mobile app | `mobile_patient/` | Expo EAS | [mobile_patient/.env.production.example](./mobile_patient/.env.production.example) |

Portable alternative for any cluster: Docker images from `deploy/docker/` and
Kubernetes manifests in [deploy/k8s](./deploy/k8s/README.md).

Env templates (all tracked in git; real `.env*` files stay ignored):
`server/.env.production.example`, `server/.env.example`,
`<portal>/.env.production.example`, `miqorai-ai-service/.env.example`,
`mobile_patient/.env*.example`.

## 1. Backend: Render (API + worker)

`render.yaml` is a Blueprint with two services built from `server/`:

- **API** (`type: web`): `npm ci --include=dev && npm run build`, pre-deploy
  `npx prisma migrate deploy`, start `npm run start`, health check `/health`
  (failed checks block the swap, so deploys are zero-downtime).
- **Worker** (`type: worker`): same build, start `npm run start:worker`. It runs the
  domain-event outbox and report schedules. The API therefore sets
  `WORKER_INLINE=false`; with `true` (the code default) every API instance would run
  the same loops. Single-service fallback: remove the worker and set `WORKER_INLINE=true`.
- **Node 22** via `NODE_VERSION` (root `.nvmrc` = 22; CI also uses Node 22).
- **Plan + region**: `plan: starter`, `region: frankfurt` are marked CHANGE ME in the
  file. Choose the Render region closest to the Supabase project region; it cannot be
  changed later. Pre-deploy commands and workers need a paid plan.
- **Deploy gate**: `autoDeployTrigger: checksPass` deploys a commit only after its
  GitHub checks pass. Set it to `off` for manual deploys.
- **Secrets**: `sync: false` entries are prompted for on the first Blueprint apply;
  the worker copies them from the API with `fromService`, so each is entered once.
  Non-secret values live in the `miqorai-shared` env group.

The full variable list with comments is `server/.env.production.example`. Set
`AI_SERVICE_BASE_URL` (not the legacy `AI_SERVICE_URL`) and all five
`*_PORTAL_URL` values, otherwise invitation and reset emails link to the API host.
`SEED_PASSWORD` is for `npm run db:seed` only; never seed production.

## 2. AI service: Hugging Face Space

- Source: `miqorai-ai-service/`; image recipe: `deploy/docker/ai-service.Dockerfile`.
- `scripts/sync-hf-space.ps1` mirrors the service into `hf-space-publish/` (the
  Space's own git repo) and **generates** `hf-space-publish/Dockerfile`:
  - central Dockerfile: build context = repo root, `COPY miqorai-ai-service/app ./app`
  - generated Space Dockerfile: build context = `hf-space-publish/`, `COPY app ./app`

  Never edit `hf-space-publish/Dockerfile`; rerun the script and push the Space repo.
- Space secret `AI_SERVICE_API_KEY` must equal the API's `AI_SERVICE_API_KEY`.
- Backend: `AI_SERVICE_BASE_URL=https://mazimpakamiguel-miqorai.hf.space`.

## 3. Portals: Vercel

The repo is an npm workspace with one root `package-lock.json`, so each Vercel
project installs from the repository root. Per portal project:

| Vercel setting | Value |
|----------------|-------|
| Root Directory | the portal folder, e.g. `hospital-portal` |
| Include source files outside of the Root Directory in the Build Step | **Enabled** (needed for `packages/*` and the root lockfile) |
| Framework / Install / Build / Output | taken from `<portal>/vercel.json` - leave the dashboard overrides off |
| Node.js version | 22.x |
| Env | `VITE_API_URL=https://api.miqorai.com` (Production + Preview) |

Each `vercel.json`:

- `installCommand`: `cd .. && npm ci -w <portal> -w @miqorai/ui -w @miqorai/api-client`
- `buildCommand`: `cd .. && npm run build -w <portal>`; `outputDirectory`: `dist`
  (`dist/client` for admin)
- `rewrites`: `/((?!api/|api$|assets/).*)` -> `/index.html`. `/api` is never rewritten,
  so a misconfigured `VITE_API_URL` fails loudly instead of returning index.html; a
  missing hashed asset is a 404.
- `headers`: the same security headers as the nginx image (CSP, HSTS,
  `X-Frame-Options: DENY`, nosniff, `Referrer-Policy`, `Permissions-Policy` with camera
  for self), `Cache-Control: no-cache` for everything except `/assets/*`
  (`public, max-age=31536000, immutable`). The CSP `connect-src` lists
  `https://api.miqorai.com` and `https://miqorai.onrender.com`; edit it if the API
  origin changes.

Patient portal on GitHub Pages: built by `.github/workflows/deploy-patient-portal.yml`
with `VITE_BASE=/MiqorAI/`. GitHub Pages cannot set response headers; use the Vercel
project (same `vercel.json`) when the security headers are required.

## 4. Admin portal: one host, static SPA

Decision: the admin portal is served as a **static SPA**, exactly like the other
portals - a Vercel project with `admin-portal/vercel.json`, or the shared
`portal.Dockerfile`/nginx image. There is no Node server in production (no
`vite preview`, no Cloudflare Worker; `wrangler.jsonc` is gone).

TanStack Start (installed `@tanstack/react-start` 1.168) supports this through SPA
mode, which prerenders a shell to `dist/client/_shell.html`. Required change in
`admin-portal/vite.config.ts` (owned by the portal code):

```ts
tanstackStart({
  // ...existing options...
  spa: { enabled: true },
}),
```

The build pipeline then publishes `_shell.html` as `index.html` (Vercel
`buildCommand` and the portal Dockerfile both do this). Until the flag is set the
admin image build stops with an explicit error and the Vercel build has no
`index.html`.

## 5. Mobile app: Expo EAS

- Env template: `mobile_patient/.env.production.example`
- `EXPO_PUBLIC_API_URL=https://api.miqorai.com`

## 6. Domains

- `api.miqorai.com` -> Render API
- `patient.miqorai.com`, `hospital.miqorai.com`, `insurance.miqorai.com`,
  `pharmacy.miqorai.com`, `admin.miqorai.com` -> the portal projects

Set `CORS_ORIGINS` and the five `*_PORTAL_URL` variables to exactly those origins.

## 7. Portable alternative: Docker images + Kubernetes

- Docker builds images only, always from the repo root:
  `deploy/docker/portal.Dockerfile` (all five portals, `--build-arg PORTAL=<folder>`,
  `--build-arg VITE_API_URL=...`), `deploy/docker/server.Dockerfile` (API; worker via
  `node dist/worker.js`), `deploy/docker/ai-service.Dockerfile`. One root `.dockerignore`
  keeps `.env*`, `node_modules`, build output, mobile and training files out of every image.
- Kubernetes describes how everything runs: `deploy/k8s` (base + `dev`/`prod` overlays).
- CI: `.github/workflows/build-images.yml` builds all seven images (no push);
  `.github/workflows/validate-k8s.yml` renders and schema-validates every overlay.

## 8. Checks

```sh
npm run test:production:wiring   # static: env templates vs code, deploy layout, vercel/render config
```

Deploy order: backend (API + worker) -> AI service -> portals -> mobile release.
