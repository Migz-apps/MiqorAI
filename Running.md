# Running MiqorAI

## Run all web frontends

From the repository root:

```powershell
# Windows
.\scripts\run-all-frontends.ps1
```

```bash
# macOS / Linux
./scripts/run-all-frontends.sh
```

Or:

```bash
npm run dev
```

| App | URL |
|-----|-----|
| Patient portal | http://localhost:5173 |
| Hospital portal | http://localhost:8080 |
| Insurance portal | http://localhost:8081 |
| Pharmacy portal | http://localhost:8082 |
| Admin portal | http://localhost:8083 |

Press **Ctrl+C** to stop all servers.

## Run one web frontend

```bash
cd patient-portal-desktop   # or hospital-portal, insurance-portal, pharmacy-portal, admin-portal
npm run dev
```

## Run the mobile app

```bash
cd mobile_patient
npm start
```

## Docker

Build and run all web portals:

```bash
docker compose build
docker compose up
```

| Service | URL |
|---------|-----|
| Patient portal | http://localhost:5173 |
| Hospital portal | http://localhost:8080 |
| Insurance portal | http://localhost:8081 |
| Pharmacy portal | http://localhost:8082 |
| Admin portal | http://localhost:8083 |

Run one portal:

```bash
cd hospital-portal
docker build -t miqorai-hospital-portal .
docker run -p 8080:80 miqorai-hospital-portal
```

Stop Docker containers:

```bash
docker compose down
```
