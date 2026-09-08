# API Spec

Base URL: `http://localhost:5000` (local) — replace with the Render URL in production.
All request/response bodies are JSON. Authenticated routes require
`Authorization: Bearer <token>`. Errors: `{ "error": "message" }`.

> Filled in with real examples during Phase 9. Endpoint list below is the MVP contract.

## Auth

### POST /api/auth/register
Body: `{ "name", "email", "password" }` → `201 { "token", "user": { "id","name","email","role" } }`

### POST /api/auth/login
Body: `{ "email", "password" }` → `200 { "token", "user" }`

### GET /api/auth/me  _(bearer)_
→ `200 { "user" }`

## Products

### GET /api/products?search=&category=
→ `200 [ { "_id","name","description","price","category","stock","imageUrl","createdAt" } ]`

### GET /api/products/:id
→ `200 Product` | `404`

### GET /api/products/meta/categories
→ `200 [ "Electronics", "Books", ... ]`

### POST /api/products  _(admin)_
Body: `{ "name","description","price","category","stock","imageUrl" }` → `201 Product`

### PUT /api/products/:id  _(admin)_
Body: partial Product → `200 Product`

### DELETE /api/products/:id  _(admin)_
→ `200 { "ok": true }`

## Orders

### POST /api/orders  _(bearer)_
Body: `{ "items": [ { "productId", "quantity" } ] }` → `201 Order`
Errors: `400` (empty cart / insufficient stock), `404` (unknown product).

### GET /api/orders  _(bearer)_
→ `200 [ Order ]` — current user's orders, newest first.

### GET /api/orders/:id  _(bearer, own or admin)_
→ `200 Order` | `403` | `404`

### GET /api/orders/all  _(admin)_
→ `200 [ Order ]` — all orders with populated user email.

### PUT /api/orders/:id/status  _(admin)_
Body: `{ "status": "pending" | "shipped" | "delivered" }` → `200 Order`
