# MiqorAI Insurance Portal

Web workspace for insurers: savings analytics, fraud detection, member management, and reporting.

## Development

```bash
npm install
npm run dev
```

Runs at **http://localhost:8081**.

## Build

```bash
npm run build
npm run preview
```

## Docker

Images are built from the repository root with the shared portal Dockerfile
(see `deploy/k8s/README.md`):

```bash
docker build -f deploy/docker/portal.Dockerfile --build-arg PORTAL=insurance-portal   --build-arg VITE_API_URL=https://api.miqorai.com -t miqorai-insurance-portal .
docker run -p 8080:8080 -e API_ORIGIN=https://api.miqorai.com miqorai-insurance-portal
```
