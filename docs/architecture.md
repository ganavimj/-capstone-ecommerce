# Architecture

## Overview

```
┌──────────────┐        HTTPS/JSON        ┌──────────────┐      ┌──────────────┐
│  Frontend    │  ─────────────────────>  │  Express API │ ───> │  MongoDB     │
│  static site │  <─────────────────────  │  (Render)    │ <─── │  (Atlas)     │
│ (Vercel)     │     Bearer JWT header    └──────────────┘      └──────────────┘
└──────────────┘
   localStorage: token, cart
```

## Components

- **Frontend** — one HTML file per page, vanilla JS modules. `js/api.js` is the single
  fetch wrapper: it prefixes `window.API_BASE`, attaches `Authorization: Bearer <token>`,
  and redirects to `login.html` on `401`. Cart lives entirely in `localStorage` and is
  only sent to the server at checkout.

- **Backend** — Express app split into `routes → controllers → models`.
  `middleware/auth.js` verifies the JWT and exposes `req.user`; `requireAdmin` gates
  admin-only routes. All errors funnel through `middleware/error.js`.

- **Database** — MongoDB via Mongoose. Three collections: `users`, `products`, `orders`.

## Request flow: checkout

1. Client `POST /api/orders` with `{ items: [{ productId, quantity }] }` + bearer token.
2. `requireAuth` validates token → `req.user`.
3. Controller loads each product, checks `stock >= quantity`, computes
   `priceAtPurchase` and `totalAmount` from DB values (client prices ignored).
4. Decrements stock, creates `Order` with `paymentStatus: 'paid'` (simulated),
   `status: 'pending'`.
5. Returns the created order; client clears `localStorage` cart.

## Auth model

- Register/login return a signed JWT (`JWT_EXPIRES_IN`, default 7d).
- Token stored in `localStorage`; no refresh token for MVP.
- Roles: `customer` (default) and `admin` (seeded only).

## Data model

See `docs/MVP_PLAN.md` §3.
