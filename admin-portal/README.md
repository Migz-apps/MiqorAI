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

```bash
docker build -t MiqorAI-admin-portal .
docker run -p 8083:8083 -e PORT=8083 MiqorAI-admin-portal
```
