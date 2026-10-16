# MiqorAI on Kubernetes

Kustomize manifests that describe how the whole system runs. They are the
portable alternative to the managed production setup (Render + Vercel/GitHub
Pages + Hugging Face Space, see [DEPLOYMENT_MAP.md](../../DEPLOYMENT_MAP.md)).

## Docker vs Kubernetes

| Concern | Owner |
|---------|-------|
| What is inside an image (dependencies, build, non-root user, nginx config, HEALTHCHECK) | `deploy/docker/*.Dockerfile`, built from the repo root |
| Which images exist | 7: `miqorai-api` (API + worker), `miqorai-ai-service`, `miqorai-{patient,hospital,insurance,pharmacy,admin}-portal` |
| Build-time settings | Docker build args only (`PORTAL`, `VITE_API_URL`, `VITE_BASE`, `GPU`, `TORCH_INDEX_URL`) |
| How things run: processes, replicas, env, secrets, probes, scaling, networking, storage | Kubernetes (`deploy/k8s`) only |

There is no Compose file. Local development uses npm (see [Running.md](../../Running.md)).
CI builds every image (`.github/workflows/build-images.yml`, build only) and
renders + schema-validates every overlay (`.github/workflows/validate-k8s.yml`).

## Architecture

```
                         Internet
                            |
              Ingress (ingress-nginx, TLS secret miqorai-tls)
                            |
     api.<domain>           |            <portal>.<domain>
     (all paths)            |     (patient, hospital, insurance, pharmacy, admin)
          |                 |        /api               /  (everything else)
          v                 |         |                  v
   +-------------+          |         |        +--------------------+
   | api :3000   |<-------------------+        | <portal>-portal x5 |  nginx-unprivileged :8080
   | HPA 2-5     |                             | static SPA         |  one shared template
   | init: prisma|                             +--------------------+
   |  migrate    |---+----------------+----------------+
   +-------------+   |                |                |
   +-------------+   v                v                v
   | worker x1   |-> postgres :5432   redis :6379      ai-service :8000
   +-------------+   (optional in-    (optional in-    (FastAPI + Qwen 0.5B LoRA,
                      cluster, or      cluster, or      CPU, 3-4 GiB)
                      Supabase)        managed Redis)

 NetworkPolicy: default deny ingress; ingress controller -> api, portals;
                api + worker (label miqorai.io/backend=true) -> postgres, redis, ai-service.
```

## Layout

```
deploy/k8s/
  base/                       environment-neutral; namespace "miqorai"
    namespace.yaml            restricted Pod Security Standard
    configmap.yaml            miqorai-config (all non-secret API/worker env), miqorai-ai-config
    secret.template.yaml      placeholders only; NOT part of any build
    api.yaml                  Deployment (+ migrate initContainer), Service, HPA 2-5, PDB
    worker.yaml               Deployment, 1 replica, Recreate
    ai-service.yaml           Deployment + Service
    portals/template/         ONE portal Deployment + Service
    portals/<name>/           namePrefix + selector label + image per portal (no copies)
    ingress.yaml              host per portal, /api -> api, api.<domain>, TLS
    networkpolicies.yaml
  components/in-cluster-data/ OPTIONAL Postgres + Redis StatefulSets with PVCs
  overlays/dev/               base + in-cluster-data, 1 replica each, tag "dev", *.miqorai.local
  overlays/prod/              base, real hosts, pinned tags, managed data stores
```

## Worker and WORKER_INLINE

`server/src/index.ts` starts the outbox/report loops inside the API process
unless `WORKER_INLINE=false`. Here the loops run only in the `worker`
Deployment (`node dist/worker.js`, same image), so `miqorai-config` sets
`WORKER_INLINE=false` for the API; otherwise every API replica would poll too.
The worker stays at one replica with the `Recreate` strategy.

## Required secrets

Create `miqorai-secrets` in namespace `miqorai` before the first apply. Keys
(see `base/secret.template.yaml`):

| Key | Used by |
|-----|---------|
| `DATABASE_URL`, `REDIS_URL` | api, worker, migrate |
| `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_KEY`, `FILE_SIGNING_SECRET`, `QR_SECRET` | api, worker |
| `SUPABASE_SERVICE_ROLE_KEY`, `SMTP_USER`, `SMTP_PASS`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN` | api, worker |
| `AI_SERVICE_API_KEY` | api, worker, ai-service (same value) |
| `POSTGRES_PASSWORD`, `REDIS_PASSWORD` | only with `components/in-cluster-data` |

```sh
kubectl create namespace miqorai
kubectl -n miqorai create secret generic miqorai-secrets --from-env-file=miqorai-secrets.env
kubectl -n miqorai create secret tls miqorai-tls --cert=tls.crt --key=tls.key   # or let cert-manager issue it
```

Keep `miqorai-secrets.env` outside the repository (`*.env` is gitignored).

## Images

Portal images are environment-specific because Vite compiles `VITE_API_URL`
into the bundle. Build from the repo root:

```sh
docker build -f deploy/docker/portal.Dockerfile --build-arg PORTAL=hospital-portal \
  --build-arg VITE_API_URL=https://api.miqorai.com -t ghcr.io/<owner>/miqorai-hospital-portal:<tag> .
docker build -f deploy/docker/server.Dockerfile -t ghcr.io/<owner>/miqorai-api:<tag> .
docker build -f deploy/docker/ai-service.Dockerfile \
  --build-arg TORCH_INDEX_URL=https://download.pytorch.org/whl/cpu -t ghcr.io/<owner>/miqorai-ai-service:<tag> .
```

`PORTAL` is the workspace folder: `patient-portal-desktop`, `hospital-portal`,
`insurance-portal`, `pharmacy-portal`, `admin-portal`. Set `PORTAL_API_ORIGIN`
in the ConfigMap to the same origin as `VITE_API_URL` (CSP `connect-src`).
Overlays map the base image names to `ghcr.io/your-github-owner/miqorai-*`;
replace `your-github-owner` with the lowercase GitHub owner.

## Apply order

1. Cluster add-ons: ingress-nginx (its namespace must carry
   `kubernetes.io/metadata.name: ingress-nginx`, otherwise edit `networkpolicies.yaml`),
   metrics-server (for the HPA), optionally cert-manager.
2. Namespace + secrets (above).
3. `kubectl apply -k deploy/k8s/overlays/prod` (or `dev`). The API pods run
   `prisma migrate deploy` in their initContainer before serving traffic
   (Prisma takes an advisory lock, so parallel pod starts are safe).
4. Check: `kubectl -n miqorai get pods`, then `curl https://api.<domain>/health`.

Render without applying: `kubectl kustomize deploy/k8s/overlays/dev`.

## Trying it locally (kind / minikube) - documentation only

```sh
kind create cluster --name miqorai
kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
# build the 7 images (portals with VITE_API_URL=https://api.miqorai.local), then:
kind load docker-image miqorai-api:dev miqorai-ai-service:dev miqorai-hospital-portal:dev --name miqorai
kubectl create namespace miqorai
kubectl -n miqorai create secret generic miqorai-secrets --from-env-file=miqorai-secrets.env
#   DATABASE_URL=postgresql://miqorai:<POSTGRES_PASSWORD>@postgres:5432/miqorai
#   REDIS_URL=redis://:<REDIS_PASSWORD>@redis:6379
kubectl apply -k deploy/k8s/overlays/dev
```

For kind, point the dev overlay `images:` at the local names (`newName: miqorai-api`,
`newTag: dev`, ...). Map the `*.miqorai.local` hosts to the ingress in your hosts
file and create a self-signed `miqorai-tls` secret. minikube works the same with
`minikube addons enable ingress` and `minikube image load`.

## Production notes

- Data: managed Supabase Postgres (session pooler, port 5432, works with
  `prisma migrate deploy`) and managed Redis (`rediss://`). The in-cluster
  component has no replication or backups.
- Files: the API `uploads` volume is an emptyDir; configure Supabase Storage
  (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`).
- AI: the base model downloads from huggingface.co at start-up; swap the
  `hf-cache` emptyDir for a PVC to avoid re-downloading on restarts. To use the
  Hugging Face Space instead, drop `ai-service.yaml` from the base and point
  `AI_SERVICE_BASE_URL` at the Space.
- Body size: the Ingress allows 11m (10 MB uploads plus multipart overhead);
  the API itself caps JSON bodies at 2 MB.
- Client IPs: the API sees the ingress controller as the peer; per-IP rate
  limiting needs Express `trust proxy` configured for the ingress hop.
