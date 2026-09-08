# MVP Plan — E-Commerce Store (Capstone Demo)

**Goal:** Ship a working, demoable full-stack e-commerce app in reviewable increments, then record a 5-minute demo.

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
| Cart persistence | **Client-side only** (`localStorage`), sent to server at checkout | Simplest; no `/api/cart` endpoints needed for MVP. Server validates prices & stock at order time. |
| Auth token storage | `localStorage` under key `token` | Vanilla JS, no cookie/CSRF handling needed for demo. |
| Admin creation | Seeded via `npm run seed` (email/password from env) | No "promote to admin" UI needed. |
| Product images | External URL string | Avoids file storage/CDN setup. |
| API base URL | `frontend/js/config.js` (`window.API_BASE`) | One place to switch local ↔ deployed. |
| Order price integrity | Server recomputes `priceAtPurchase` and `totalAmount` from DB | Never trust client-sent prices. |

The `/api/cart` endpoints from PROJECT_CONTEXT are **deferred** (not built for MVP).

---

## 3. Final Data Model

**User:** `_id, name, email (unique, lowercased), passwordHash, role ('customer' | 'admin'), createdAt`

**Product:** `_id, name, description, price (Number, >=0), category (String), stock (Number, >=0), imageUrl (String), createdAt`

**Order:**
```
_id, userId (ref User),
items: [{ productId (ref Product), name, quantity, priceAtPurchase }],
totalAmount (Number),
paymentStatus ('paid'),            // simulated
status ('pending' | 'shipped' | 'delivered'),
createdAt
```

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
│       ├── config/db.js
│       ├── models/{User,Product,Order}.js
│       ├── middleware/{auth.js,error.js}
│       ├── controllers/{authController,productController,orderController}.js
│       ├── routes/{auth,products,orders}.js
│       └── seed/seed.js
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
- `backend/package.json` (express, mongoose, jsonwebtoken, bcryptjs, cors, dotenv, morgan; dev: nodemon).
- `app.js` + `server.js`, `config/db.js`, health route `GET /api/health`.
- CORS enabled, JSON body parsing, central error middleware.
- **Commit:** `feat(backend): express server + mongodb connection`

### Phase 2 — Models + Product CRUD
- `User`, `Product`, `Order` schemas.
- Product controller/routes: list (search/filter), get, create, update, delete, categories.
- **Commit:** `feat(products): product model and CRUD API`

### Phase 3 — Auth + authorization
- `authController` register/login/me, bcrypt hashing, JWT sign.
- `middleware/auth.js`: `requireAuth`, `requireAdmin`.
- Protect product write routes with `requireAdmin`.
- `seed/seed.js`: wipe + insert admin user + ~8 sample products across 3 categories.
- **Commit:** `feat(auth): jwt register/login + role-based route protection`

### Phase 4 — Orders API
- `orderController`: create (validate stock, recompute totals, decrement stock), list own, get one, list all (admin), update status (admin).
- **Commit:** `feat(orders): checkout + order management API`

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
- MongoDB Atlas free cluster + DB user + network access.
- Backend → Render (env vars: `MONGO_URI`, `JWT_SECRET`, `ADMIN_EMAIL`, `ADMIN_PASSWORD`, `CLIENT_ORIGIN`). Run seed once.
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
MONGO_URI=mongodb://127.0.0.1:27017/capstone_ecommerce
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
# backend
cd backend && npm install
npm run seed          # creates admin + sample products
npm run dev           # http://localhost:5000

# frontend  (static — any static server)
cd frontend && npx serve .    # or open index.html via Live Server
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
| Atlas IP allowlist blocks Render | Allow `0.0.0.0/0` for demo (note as demo-only). |
| Stock race on checkout | Acceptable for single-user demo; server still validates. |
