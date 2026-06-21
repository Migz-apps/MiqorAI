# MiqorAI Hospital Portal

Web workspace for hospital staff: patient check-in, records, prescriptions, and billing.

## Development

```bash
npm install
npm run dev
```

Runs at **http://localhost:8080**.

## Build

```bash
npm run build
npm run preview
```

## Docker

```bash
docker build -t MiqorAI-hospital-portal .
docker run -p 8080:80 MiqorAI-hospital-portal
```
