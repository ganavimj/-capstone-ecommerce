# Capstone E-Commerce Store

Full-stack e-commerce app: browse products, manage a cart, place orders, and manage inventory/orders as an admin.

- **Frontend:** plain HTML + CSS + vanilla JS (static hosting)
- **Backend:** Node.js + Express
- **Database:** MongoDB + Mongoose
- **Auth:** JWT access token + bcrypt

See [`docs/MVP_PLAN.md`](docs/MVP_PLAN.md) for scope, decisions, and build phases.

## Quick start (local)

Prerequisites: Node 18+, a MongoDB instance (local or Atlas).

```bash
# 1. Backend
cd backend
cp ../.env.example .env      # then edit .env
npm install
npm run seed                 # creates admin user + sample products
npm run dev                  # http://localhost:5000

# 2. Frontend (separate terminal)
cd frontend
npx serve .                  # or open with a static server / Live Server
```

By default `frontend/js/config.js` points at `http://localhost:5000`.

### Demo credentials

- Admin: `admin@demo.com` / `Admin123!` (from your `.env`)
- Customer: register a new account in the UI

## Project structure

```
backend/   Express API (models, routes, controllers, middleware, seed)
frontend/  Static site (one HTML file per page + js/ modules)
docs/      Plan, architecture, API spec
```

## Deployment

- DB: MongoDB Atlas free tier
- API: Render (set env vars from `.env.example`)
- Site: Vercel / Netlify — set `window.API_BASE` in `frontend/js/config.js` to the Render URL

Details in `docs/MVP_PLAN.md` Phase 8.
