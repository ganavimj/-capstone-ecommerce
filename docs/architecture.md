# Architecture

## Overview

```
┌──────────────┐        HTTPS/JSON        ┌──────────────┐      ┌──────────────┐
│  Frontend    │  ─────────────────────>  │  Express API │ ───> │  PostgreSQL  │
│  static site │  <─────────────────────  │  (Render)    │ <─── │              │
│ (Vercel)     │     Bearer JWT header    └──────────────┘      └──────────────┘
└──────────────┘
   localStorage: token, cart
```

## Components

- **Frontend** — one HTML file per page, vanilla JS modules. `js/api.js` is the single
  fetch wrapper: it prefixes `window.API_BASE`, attaches `Authorization: Bearer <token>`,
  and redirects to `login.html` on `401`. Cart lives entirely in `localStorage` and is
  only sent to the server at checkout.

- **Backend** — Express app split into `routes → controllers → models`. Models are plain
  modules that own their SQL (`node-postgres`, parameterized queries). A `Pool` is shared
  process-wide; `withTransaction()` wraps multi-statement work. `middleware/auth.js`
  verifies the JWT and loads `req.user`; `requireAdmin` gates admin-only routes.
  `middleware/error.js` maps PG error codes (unique violation, FK violation, …) to HTTP
  statuses.

- **Database** — PostgreSQL. `src/db/schema.sql` is the source of truth for the four
  tables; `npm run seed` applies it.

## Data model

```
users
  id PK · name · email UNIQUE · password_hash · role(customer|admin) · created_at

products
  id PK · name · description · price NUMERIC(10,2) · category · stock · image_url
  · created_at · updated_at

orders
  id PK · user_id FK→users · total_amount NUMERIC(10,2)
  · payment_status('paid', simulated) · status(pending|shipped|delivered) · created_at

order_items
  id PK · order_id FK→orders (ON DELETE CASCADE)
  · product_id FK→products (ON DELETE SET NULL)   -- keep history if a product is removed
  · name · quantity · price_at_purchase NUMERIC(10,2)   -- price snapshot at checkout
```

The API responds in camelCase and also exposes each row's `id` as `_id` so the
vanilla-JS frontend can treat ids uniformly.

## Request flow: checkout

1. Client `POST /api/orders` with `{ items: [{ productId, quantity }] }` + bearer token.
2. `requireAuth` validates the token → `req.user`.
3. `Order.checkout()` opens a transaction:
   - `SELECT … FOR UPDATE` locks the referenced product rows,
   - verifies `stock >= quantity` for each,
   - computes `price_at_purchase` and `total_amount` from DB values (client prices ignored),
   - inserts the `orders` row and one `order_items` row per line,
   - decrements `products.stock`.
4. Commit → return the created order; client clears its `localStorage` cart.

## Auth model

- Register/login return a signed JWT (`JWT_EXPIRES_IN`, default 7d).
- Token stored in `localStorage`; no refresh token for MVP.
- Roles: `customer` (default) and `admin` (seeded only).
