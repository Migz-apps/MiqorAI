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

```bash
docker build -t MiqorAI-pharmacy-portal .
docker run -p 8082:80 MiqorAI-pharmacy-portal
```
