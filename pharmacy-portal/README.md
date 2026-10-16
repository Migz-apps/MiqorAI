# MiqorAI Pharmacy Portal

Web workspace for pharmacies: digital prescriptions, QR patient verification, inventory, and adherence tracking.

## Development

```bash
npm install
npm run dev
```

Runs at **http://localhost:8082**.

## Build

```bash
npm run build
npm run preview
```

## Docker

Images are built from the repository root with the shared portal Dockerfile
(see `deploy/k8s/README.md`):

```bash
docker build -f deploy/docker/portal.Dockerfile --build-arg PORTAL=pharmacy-portal   --build-arg VITE_API_URL=https://api.miqorai.com -t miqorai-pharmacy-portal .
docker run -p 8080:8080 -e API_ORIGIN=https://api.miqorai.com miqorai-pharmacy-portal
```
