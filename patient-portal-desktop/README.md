# MiqorAI Patient Portal (Desktop Web)

Patient-facing web portal for health records, QR sharing, and secure data export.

## Development

```bash
npm install
npm run dev
```

Runs at **http://localhost:5173**.

## Build

```bash
npm run build
npm run preview
```

## Docker

Images are built from the repository root with the shared portal Dockerfile
(see `deploy/k8s/README.md`):

```bash
docker build -f deploy/docker/portal.Dockerfile --build-arg PORTAL=patient-portal-desktop   --build-arg VITE_API_URL=https://api.miqorai.com -t miqorai-patient-portal .
docker run -p 8080:8080 -e API_ORIGIN=https://api.miqorai.com miqorai-patient-portal
```
