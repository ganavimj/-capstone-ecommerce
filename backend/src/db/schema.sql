-- Capstone e-commerce schema (PostgreSQL).
-- Running this file DROPS and recreates all tables. `npm run seed` executes it
-- and then loads sample data.

DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders      CASCADE;
DROP TABLE IF EXISTS products    CASCADE;
DROP TABLE IF EXISTS users       CASCADE;

CREATE TABLE users (
  id            SERIAL PRIMARY KEY,
  name          TEXT        NOT NULL,
  email         TEXT        NOT NULL UNIQUE,
  password_hash TEXT        NOT NULL,
  role          TEXT        NOT NULL DEFAULT 'customer'
                            CHECK (role IN ('customer', 'admin')),
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE products (
  id          SERIAL         PRIMARY KEY,
  name        TEXT           NOT NULL,
  description TEXT           NOT NULL DEFAULT '',
  price       NUMERIC(10, 2) NOT NULL CHECK (price >= 0),
  category    TEXT           NOT NULL,
  stock       INTEGER        NOT NULL DEFAULT 0 CHECK (stock >= 0),
  image_url   TEXT           NOT NULL DEFAULT '',
  created_at  TIMESTAMPTZ    NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE orders (
  id             SERIAL         PRIMARY KEY,
  user_id        INTEGER        NOT NULL REFERENCES users (id),
  total_amount   NUMERIC(10, 2) NOT NULL CHECK (total_amount >= 0),
  payment_status TEXT           NOT NULL DEFAULT 'paid',
  status         TEXT           NOT NULL DEFAULT 'pending'
                                CHECK (status IN ('pending', 'shipped', 'delivered')),
  created_at     TIMESTAMPTZ    NOT NULL DEFAULT now()
);

CREATE TABLE order_items (
  id                SERIAL         PRIMARY KEY,
  order_id          INTEGER        NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id        INTEGER        REFERENCES products (id) ON DELETE SET NULL,
  name              TEXT           NOT NULL,
  quantity          INTEGER        NOT NULL CHECK (quantity > 0),
  price_at_purchase NUMERIC(10, 2) NOT NULL CHECK (price_at_purchase >= 0)
);

CREATE INDEX idx_products_category   ON products (category);
CREATE INDEX idx_orders_user_id      ON orders (user_id);
CREATE INDEX idx_order_items_order_id ON order_items (order_id);
