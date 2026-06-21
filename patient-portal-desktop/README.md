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

```bash
docker build -t MiqorAI-patient-portal .
docker run -p 5173:80 MiqorAI-patient-portal
```
