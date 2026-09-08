# Capstone E-Commerce Store

Full-stack e-commerce app: browse products, manage a cart, place orders, and manage inventory/orders as an admin.

- **Frontend:** plain HTML + CSS + vanilla JS (static hosting)
- **Backend:** Node.js + Express
- **Database:** PostgreSQL (raw SQL via `node-postgres`)
- **Auth:** JWT access token + bcrypt

See [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) for scope, decisions, and build phases.

## Quick start (local)

Prerequisites: Node 18+ and a running PostgreSQL server with a database created
(e.g. `Capstone`).

```bash
# 1. Backend
cd backend
cp ../.env.example .env       # then set PGUSER / PGPASSWORD / PGDATABASE
npm install
npm run seed                  # DROPS + recreates tables, loads admin + sample products
npm run dev                   # http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npx serve .                   # http://localhost:3000
```

`npm run seed` runs `backend/src/db/schema.sql` (which drops any existing tables)
and then inserts the seed data.

By default `frontend/js/config.js` points at `http://localhost:5000`. Change
`window.API_BASE` there for a deployed backend.

### Backend tests

```bash
cd backend
npm run smoke                 # creates a throwaway DB, runs an end-to-end API test, drops it
```

The smoke test needs permission to `CREATE DATABASE` (the default `postgres`
superuser has it).

### Demo credentials

- Admin: `admin@demo.com` / `Admin123!` (from your `.env`)
- Customer: register a new account in the UI

## Project structure

```
backend/
  src/
    config/db.js      pg Pool + query/transaction helpers
    db/schema.sql     table definitions (source of truth)
    models/           SQL query modules (User, Product, Order)
    controllers/      request handlers
    routes/           Express routers
    middleware/       auth (JWT), error mapping
    seed/             seed.js (schema + data), smoke.js (tests)
frontend/             static site, one HTML file per page + js/ modules
docs/                 plan, architecture, API spec
```

## Deployment

- DB: any managed Postgres (Render PostgreSQL, Supabase, Neon, ElephantSQL…)
- API: Render — set `DATABASE_URL`, `PGSSL=true`, `JWT_SECRET`, `ADMIN_*`, `CLIENT_ORIGIN`
- Site: Vercel / Netlify — set `window.API_BASE` in `frontend/js/config.js` to the API URL

Run `npm run seed` once against the production database after the first deploy.
Details in `docs/MVP_PLAN.md` Phase 8.
