# MiqorAI API Server — Database Setup

## 1. PostgreSQL

Copy environment variables (secrets stay local — `.env` is gitignored):

```powershell
cd server
copy .env.example .env
# Edit .env — set DATABASE_URL with your postgres password
```

Example `DATABASE_URL`:

```
postgresql://postgres:YOUR_PASSWORD@localhost:5432/miqorai?schema=public
```

Create the database (run once as superuser):

```powershell
$env:PGPASSWORD = 'YOUR_PASSWORD'
& "C:\Program Files\PostgreSQL\17\bin\psql.exe" -U postgres -h localhost -c "CREATE DATABASE miqorai;"
```

Or use pgAdmin: connect as `postgres`, run `CREATE DATABASE miqorai;`

## 2. Redis (optional)

Redis improves session revocation caching. The API runs without it.

```powershell
# If Docker is available:
docker run -d --name miqorai-redis -p 6379:6379 redis:7-alpine
```

## 3. Install, schema, seed, test

```powershell
cd server
npm install
npx prisma db push
npm run db:seed
npm test
npm run dev
```

API: **http://localhost:3000**

## Credentials (after seed)

| Portal   | Email                     | Org code           | Password      |
|----------|---------------------------|--------------------|---------------|
| Admin    | admin@miqorai.com         | —                  | MiqorAI123!   |
| Hospital | amara@stcatherine.med     | MP-LAGOS-001       | MiqorAI123!   |
| Pharmacy | brian@goodlife.co.ke      | MPC-GOODLIFE-001   | MiqorAI123!   |
| Insurer  | wanjiku@jubilee.co.ke     | JUBILEE_001        | MiqorAI123!   |
| Patient  | grace.muthoni@example.com | —                  | MiqorAI123!   |

## Secrets

All secrets live in `.env` only. Never commit `.env`. Use `.env.example` as a template with placeholders.
