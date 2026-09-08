# MVP Plan — E-Commerce Store (Capstone Demo)

**Goal:** Ship a working, demoable full-stack e-commerce app in reviewable increments, then record a 5-minute demo.

## Status (2026-09-08)

> **DB change:** switched from MongoDB/Mongoose to **PostgreSQL** (raw SQL via
> `node-postgres`). Data layer, seed, and tests rewritten accordingly.

| Phase | State |
|---|---|
| 0 · Repo setup | ✅ done |
| 1 · Backend foundation (Express + PG pool) | ✅ done |
| 2 · Schema + Product CRUD | ✅ done |
| 3 · Auth + authorization | ✅ done |
| 4 · Orders API (transactional checkout) | ✅ done |
| 5 · Frontend: shell + products | ✅ done |
| 6 · Frontend: auth + cart + checkout + orders | ✅ done |
| 7 · Frontend: admin dashboard | ✅ done |
| 8 · Deploy (managed Postgres + Render + Vercel) | ⬜ pending — needs your accounts |
| 9 · Test & document + demo video | 🟡 automated tests + docs done; demo video pending |

**Verified working locally** via `backend/npm run smoke` (21 API checks against a
throwaway database) and two jsdom end-to-end suites (17 UI checks): browse,
search/filter, register, cart persistence, checkout, order history, admin product
CRUD, admin order-status updates, role gating, price-snapshot survival on product delete.

Run it now: `cd backend && npm run seed && npm run dev`, then `cd frontend && npx serve .`
→ open http://localhost:3000 · admin `admin@demo.com` / `Admin123!`

**Audience for demo:** Capstone reviewers / internship evaluators. They check: frontend UI, backend API, auth, role-based authorization, database integration, cloud deployment, and clean commit history.

---

## 1. MVP Scope (what the demo must show)

### Customer flow
1. Land on home page → see featured products.
2. Browse products page → search by name, filter by category.
3. Open a product detail page.
4. Register a new account → auto-login.
5. Add products to cart, change quantity, remove items (cart persists across reload).
6. Checkout → order created with simulated payment status `paid`, stock decremented.
7. View order history with statuses.

### Admin flow
1. Log in with seeded admin account.
2. Open admin dashboard (blocked for non-admins).
3. Create / edit / delete a product (with image URL).
4. See all orders, change an order's status: `pending → shipped → delivered`.

### Explicitly OUT of scope for MVP
- Real payment gateway (simulate only).
- Password reset / email verification.
- Product reviews, wishlist, discounts/coupons.
- Image file upload (use image URLs).
- Refresh tokens (single JWT access token, ~7-day expiry).
- Pagination (cap product list, acceptable for demo dataset).

---

## 2. Key Decisions (locked for MVP)

| Decision | Choice | Reason |
|---|---|---|
| Database | **PostgreSQL**, raw SQL via `node-postgres` (no ORM) | Transparent SQL for the capstone rubric; `src/db/schema.sql` is the source of truth. |
| Order line items | Separate `order_items` table (FK to orders + products) | Real relational modelling; `product_id` is `ON DELETE SET NULL` so order history survives. |
| Cart persistence | **Client-side only** (`localStorage`), sent to server at checkout | Simplest; no `/api/cart` endpoints needed for MVP. Server validates prices & stock at order time. |
| Auth token storage | `localStorage` under key `token` | Vanilla JS, no cookie/CSRF handling needed for demo. |
| Admin creation | Seeded via `npm run seed` (email/password from env) | No "promote to admin" UI needed. |
| Product images | External URL string | Avoids file storage/CDN setup. |
| API base URL | `frontend/js/config.js` (`window.API_BASE`) | One place to switch local ↔ deployed. |
| Order price integrity | `Order.checkout()` recomputes `price_at_purchase` and `total_amount` from DB inside a `SELECT … FOR UPDATE` transaction | Never trust client-sent prices; no stock oversell. |
| Id shape | Integer PKs; API also exposes `id` as `_id` | Frontend treats ids uniformly without a rewrite. |

The `/api/cart` endpoints from PROJECT_CONTEXT are **deferred** (not built for MVP).

---

## 3. Final Data Model (PostgreSQL — see `backend/src/db/schema.sql`)

**users:** `id PK, name, email UNIQUE (lowercased), password_hash, role ('customer' | 'admin'), created_at`

**products:** `id PK, name, description, price NUMERIC(10,2) >= 0, category, stock INT >= 0, image_url, created_at, updated_at`

**orders:** `id PK, user_id FK→users, total_amount NUMERIC(10,2), payment_status ('paid', simulated), status ('pending'|'shipped'|'delivered'), created_at`

**order_items:** `id PK, order_id FK→orders (ON DELETE CASCADE), product_id FK→products (ON DELETE SET NULL), name, quantity INT > 0, price_at_purchase NUMERIC(10,2)`

API responses are camelCased (`imageUrl`, `totalAmount`, `priceAtPurchase`, …) and
include both `id` and `_id`. An order's `items` are nested in the response; admin
order listings nest `userId` as `{ id, name, email }`.

---

## 4. API Surface (MVP)

```
Auth
  POST   /api/auth/register        { name, email, password } -> { token, user }
  POST   /api/auth/login           { email, password }       -> { token, user }
  GET    /api/auth/me              (bearer)                   -> { user }

Products
  GET    /api/products             ?search=&category=        -> [Product]
  GET    /api/products/:id                                   -> Product
  POST   /api/products             (admin)                   -> Product
  PUT    /api/products/:id         (admin)                   -> Product
  DELETE /api/products/:id         (admin)                   -> { ok: true }
  GET    /api/products/meta/categories                       -> [String]

Orders
  POST   /api/orders               (bearer) { items:[{productId, quantity}] } -> Order
  GET    /api/orders               (bearer)                  -> [Order]  (own)
  GET    /api/orders/:id           (bearer, own or admin)    -> Order
  GET    /api/orders/all           (admin)                   -> [Order]
  PUT    /api/orders/:id/status    (admin) { status }        -> Order
```

Standard responses: `2xx` JSON body; errors as `{ error: "message" }` with `400/401/403/404/500`.

---

## 5. Folder Structure

```
INTERNSHIP/
├── README.md
├── .env.example
├── .gitignore
├── docs/
│   ├── MVP_PLAN.md
│   ├── architecture.md
│   └── api-spec.md
├── backend/
│   ├── package.json
│   └── src/
│       ├── server.js
│       ├── app.js
│       ├── config/db.js                 (pg Pool + query/withTransaction)
│       ├── db/schema.sql                 (table definitions — source of truth)
│       ├── models/{User,Product,Order}.js  (SQL query modules)
│       ├── middleware/{auth.js,error.js}
│       ├── controllers/{authController,productController,orderController}.js
│       ├── routes/{auth,products,orders}.js
│       ├── utils/{asyncHandler,HttpError}.js
│       └── seed/{seed.js,smoke.js,sample-products.js}
└── frontend/
    ├── index.html
    ├── products.html
    ├── product-detail.html
    ├── cart.html
    ├── login.html
    ├── register.html
    ├── orders.html
    ├── admin/dashboard.html
    ├── css/styles.css
    └── js/
        ├── config.js
        ├── api.js
        ├── auth.js
        ├── cart.js
        ├── products.js
        ├── product-detail.js
        ├── orders.js
        └── admin.js
```

---

## 6. Build Phases & Commits

Each phase = one or more focused commits. Test locally before moving on.

### Phase 0 — Repo setup
- `.gitignore`, `.env.example`, `README.md`, this plan, `docs/architecture.md` stub.
- **Commit:** `chore: project scaffold and docs`

### Phase 1 — Backend foundation
- `backend/package.json` (express, pg, jsonwebtoken, bcryptjs, cors, dotenv, morgan; dev: nodemon, supertest).
- `app.js` + `server.js`, `config/db.js` (pg Pool + `withTransaction`), health route `GET /api/health`.
- CORS enabled, JSON body parsing, central error middleware (maps PG error codes).
- **Commit:** `feat(backend): express server + postgres pool`

### Phase 2 — Schema + Product CRUD
- `db/schema.sql`: `users`, `products`, `orders`, `order_items`.
- `models/{User,Product}.js` SQL modules; product controller/routes: list (search/filter), get, create, update, delete, categories.
- **Commit:** `feat(products): schema + product CRUD API`

### Phase 3 — Auth + authorization
- `authController` register/login/me, bcrypt hashing, JWT sign.
- `middleware/auth.js`: `requireAuth`, `requireAdmin`.
- Protect product write routes with `requireAdmin`.
- `seed/seed.js`: apply schema + insert admin user + ~8 sample products across 3 categories.
- **Commit:** `feat(auth): jwt register/login + role-based route protection`

### Phase 4 — Orders API
- `models/Order.js` `checkout()`: transactional — `SELECT … FOR UPDATE`, validate stock, snapshot price, insert order + items, decrement stock.
- `orderController`: create, list own, get one, list all (admin), update status (admin).
- **Commit:** `feat(orders): transactional checkout + order management API`

### Phase 5 — Frontend: shell + products
- Shared `styles.css`, nav header partial pattern, `config.js`, `api.js` (fetch wrapper, injects bearer token, handles 401).
- `index.html` (featured), `products.html` (grid + search + category filter), `product-detail.html`.
- **Commit:** `feat(frontend): product browsing pages`

### Phase 6 — Frontend: auth + cart + checkout + orders
- `login.html`, `register.html`, `auth.js` (token storage, nav state, logout).
- `cart.js` — localStorage cart, add/update/remove, badge count, `cart.html` render.
- Checkout button → `POST /api/orders` → clear cart → redirect to `orders.html`.
- `orders.html` — order history list.
- **Commit:** `feat(frontend): auth, cart, checkout, order history`

### Phase 7 — Frontend: admin dashboard
- `admin/dashboard.html` + `admin.js`: guard (redirect if not admin), product table with create/edit/delete forms, orders table with status dropdown.
- **Commit:** `feat(admin): product and order management dashboard`

### Phase 8 — Deploy
- Managed Postgres (Render PostgreSQL / Supabase / Neon). Grab its connection string.
- Backend → Render (env: `DATABASE_URL`, `PGSSL=true`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_ORIGIN`). Run `npm run seed` once against the prod DB.
- Frontend → Vercel/Netlify static. Set `window.API_BASE` to Render URL.
- Tighten CORS to the deployed frontend origin.
- **Commit:** `chore(deploy): production config for render + vercel`

### Phase 9 — Test & document
- Manual end-to-end pass of both flows against deployed app.
- Fill `docs/api-spec.md` (request/response examples) and `docs/architecture.md` (diagram + data flow).
- README: setup, env, run, seed, deploy, demo credentials.
- Record 5-minute demo video.
- **Commit:** `docs: api spec, architecture, readme + test notes`

---

## 7. Environment Variables (`.env.example`)

```
# backend/.env
PORT=5000

# Local: discrete vars.  Hosted: set DATABASE_URL + PGSSL=true instead.
PGHOST=localhost
PGPORT=5432
PGUSER=postgres
PGPASSWORD=admin
PGDATABASE=Capstone

JWT_SECRET=change_me_to_a_long_random_string
JWT_EXPIRES_IN=7d
ADMIN_NAME=Site Admin
ADMIN_EMAIL=admin@demo.com
ADMIN_PASSWORD=Admin123!
CLIENT_ORIGIN=*
```

---

## 8. Local Run

```
# backend  (needs a running PostgreSQL + a created database)
cd backend && npm install
cp ../.env.example .env       # set PGUSER / PGPASSWORD / PGDATABASE
npm run seed          # applies schema.sql (drops tables), inserts admin + sample products
npm run dev           # http://localhost:5000

# frontend  (static — any static server)
cd frontend && npx serve .    # http://localhost:3000  (serve.json disables clean URLs)
```

Demo credentials: `admin@demo.com` / `Admin123!` (admin); register any account for customer.

---

## 9. Demo Script (5 min)

1. (0:00) Home page, show product grid. Search + category filter.
2. (1:00) Register new customer → logged in.
3. (1:30) Add 2–3 items to cart, adjust qty, reload to show persistence.
4. (2:30) Checkout → order confirmation → order history.
5. (3:00) Log out, log in as admin → dashboard.
6. (3:30) Create a product → appears on storefront.
7. (4:00) Open orders table → move the new order `pending → shipped`.
8. (4:30) Show it's deployed (live URLs), quick peek at repo commit history.

---

## 10. Risks / Mitigations

| Risk | Mitigation |
|---|---|
| Render free tier cold start (~50s) | Warm it before demo; mention in script. |
| CORS misconfig on deploy | Test with deployed frontend early; keep `CLIENT_ORIGIN` env-driven. |
| Hosted Postgres requires SSL | Set `PGSSL=true` (config/db.js passes `ssl` when using `DATABASE_URL`). |
| `npm run seed` drops tables | Expected — it's a reset. Don't run it against a DB with real data. |
| Stock race on checkout | Acceptable for single-user demo; server still validates. |
