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

## Run the microservices backend

From the repository root:

```powershell
# Windows — starts Postgres, Redis, RabbitMQ, Mailhog, then all 6 services
.\backend\scripts\start-backend.ps1
```

```bash
# macOS / Linux
./backend/scripts/start-backend.sh
```

| Service | URL |
|---------|-----|
| API Gateway (use this from frontends) | http://localhost:8080 |
| Auth service | http://localhost:8081 |
| Patient service | http://localhost:8082 |
| Medical service | http://localhost:8083 |
| Audit service | http://localhost:8084 |
| Notification service | http://localhost:8085 |
| MailHog (dev email) | http://localhost:8025 |
| RabbitMQ management | http://localhost:15672 |

Stop backend services:

```powershell
.\backend\scripts\stop-backend.ps1
```

```bash
./backend/scripts/stop-backend.sh
```

Run backend tests:

```bash
cd backend
mvn test
```

Note: the API gateway uses port **8080**. If you also run the hospital portal locally, change one of them to avoid a port conflict.
