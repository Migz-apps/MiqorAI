# MiqorAI Admin Portal

Platform management cockpit for the MiqorAI network: approvals, disputes, billing, compliance, and system health.

## Development

```bash
npm install
npm run dev
```

Runs at **http://localhost:8083**.

## Build

```bash
npm run build
npm run preview
```

## Docker

Images are built from the repository root with the shared portal Dockerfile
(see `deploy/k8s/README.md`):

```bash
docker build -f deploy/docker/portal.Dockerfile --build-arg PORTAL=admin-portal   --build-arg VITE_API_URL=https://api.miqorai.com -t miqorai-admin-portal .
docker run -p 8080:8080 -e API_ORIGIN=https://api.miqorai.com miqorai-admin-portal
```
