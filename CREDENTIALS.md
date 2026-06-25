# MiqorAI — Portal Login Credentials

All seeded accounts use the same password unless noted. The API runs at `http://localhost:3000` by default.

**Shared password:** `MiqorAI123!`

---

## Super Admin Portal (`admin-portal` — port 8083)

| Email | Password | Org code |
|-------|----------|----------|
| `admin@miqorai.com` | `MiqorAI123!` | *(none)* |

---

## Hospital Portal (`hospital-portal` — port 8080)

**Organization code:** `MP-LAGOS-001`  
**Hospital:** St. Catherine General Hospital

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | Tunde Adeyemi | `tunde@stcatherine.med` | `MiqorAI123!` |
| Doctor | Dr. Amara Eze | `amara@stcatherine.med` | `MiqorAI123!` |
| Receptionist | Adaeze Okafor | `adaeze@stcatherine.med` | `MiqorAI123!` |
| Nurse | Joseph Mensah | `joseph@stcatherine.med` | `MiqorAI123!` |
| Doctor (Cardiology) | Dr. Ibrahim Musa | `ibrahim@stcatherine.med` | `MiqorAI123!` |
| Dept Head (Cardiology) | Dr. Chika Nwosu | `chika@stcatherine.med` | `MiqorAI123!` |

---

## Pharmacy Portal (`pharmacy-portal` — port 8082)

**Organization code:** `MPC-GOODLIFE-001`  
**Pharmacy:** GoodLife Pharmacy — Westlands

| Role | Name | Email | Password |
|------|------|-------|----------|
| Manager | Wanjiku Mwangi | `wanjiku@goodlife.co.ke` | `MiqorAI123!` |
| Pharmacist | Brian Otieno | `brian@goodlife.co.ke` | `MiqorAI123!` |
| Pharmacist | Aisha Hassan | `aisha@goodlife.co.ke` | `MiqorAI123!` |
| Technician | David Kamau | `david@goodlife.co.ke` | `MiqorAI123!` |
| Cashier | Grace Njeri | `grace@goodlife.co.ke` | `MiqorAI123!` |

---

## Insurance Portal (`insurance-portal` — port 8081)

**Organization code:** `JUBILEE_001`  
**Insurer:** Jubilee Insurance

| Role | Name | Email | Password |
|------|------|-------|----------|
| Admin | Fatima Hassan | `fatima@jubilee.co.ke` | `MiqorAI123!` |
| Analyst | Wanjiku Mwangi | `wanjiku@jubilee.co.ke` | `MiqorAI123!` |
| Fraud | Brian Otieno | `brian@jubilee.co.ke` | `MiqorAI123!` |
| Contracts | Grace Kamau | `grace@jubilee.co.ke` | `MiqorAI123!` |
| Executive | Daniel Njoroge | `daniel@jubilee.co.ke` | `MiqorAI123!` |

---

## Patient Portal (`patient-portal-desktop` — port 5173)

| Name | Email | Phone | Password | Org code |
|------|-------|-------|----------|----------|
| Grace Muthoni | `grace.muthoni@example.com` | `+254712345678` | `MiqorAI123!` | *(none)* |

---

## Database

| Setting | Value |
|---------|-------|
| Engine | PostgreSQL |
| Database | `miqorai` |
| User | `postgres` |
| Password | *(see `server/.env` — not committed)* |
| Connection | `postgresql://postgres:***@localhost:5432/miqorai` |

---

## Reseed & run

```powershell
# One-time: install everything
cd C:\Users\user\Downloads\github\MiqorAI-git\MiqorAI
npm run install:all

# Full automated check (seed + 14 API tests + build all 6 packages)
npm run verify

# Start API + all 5 portals in one terminal
npm run dev:full
```

Or manually:

```powershell
cd server
npm run db:seed
npm run dev
```

Then start each portal (`npm run dev` in its folder) or from repo root: `npm run dev`.

Each portal has `.env` with `VITE_API_URL=http://localhost:3000`.
