/*
 * End-to-end API smoke test. Creates a throwaway database, runs the schema,
 * exercises the API with supertest, then drops the database.
 * Run: npm run smoke
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client } = require('pg');
const request = require('supertest');

const TEST_DB = 'capstone_smoke_test';

// Point the app's pool at the test DB before it is required.
delete process.env.DATABASE_URL;
process.env.PGDATABASE = TEST_DB;
process.env.JWT_SECRET = process.env.JWT_SECRET || 'smoke-test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const adminConn = {
  host: process.env.PGHOST || 'localhost',
  port: Number(process.env.PGPORT || 5432),
  user: process.env.PGUSER || 'postgres',
  password: process.env.PGPASSWORD || 'postgres',
  database: 'postgres',
};

let failed = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failed += 1;
}

async function resetTestDb() {
  const admin = new Client(adminConn);
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB]
  );
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  const db = new Client({ ...adminConn, database: TEST_DB });
  await db.connect();
  await db.query(fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8'));
  await db.end();
}

async function dropTestDb() {
  const admin = new Client(adminConn);
  await admin.connect();
  await admin.query(
    `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
     WHERE datname = $1 AND pid <> pg_backend_pid()`,
    [TEST_DB]
  );
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB}`);
  await admin.end();
}

async function main() {
  await resetTestDb();

  const app = require('../app');
  const { pool } = require('../config/db');
  const bcrypt = require('bcryptjs');

  // seed admin + one product directly
  const adminHash = await bcrypt.hash('Admin123!', 10);
  await pool.query(
    `INSERT INTO users (name, email, password_hash, role)
     VALUES ('Admin', 'admin@demo.com', $1, 'admin')`,
    [adminHash]
  );
  const { rows: prodRows } = await pool.query(
    `INSERT INTO products (name, price, category, stock)
     VALUES ('Test Widget', 10, 'Misc', 5) RETURNING id`
  );
  const productId = prodRows[0].id;

  let res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@demo.com', password: 'Admin123!' });
  check('admin login 200', res.status === 200 && !!res.body.token);
  const adminToken = res.body.token;

  res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Cust', email: 'cust@demo.com', password: 'secret1' });
  check('register 201', res.status === 201 && res.body.user.role === 'customer');
  const custToken = res.body.token;

  res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Dup', email: 'cust@demo.com', password: 'secret1' });
  check('duplicate email rejected 409', res.status === 409);

  res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ name: 'Hack', price: 1, category: 'x' });
  check('customer blocked from product create 403', res.status === 403);

  res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Admin Widget', price: 20, category: 'Misc', stock: 3 });
  check('admin product create 201', res.status === 201 && res.body._id != null);

  res = await request(app).get('/api/products?search=test');
  check('product search returns Test Widget', res.body.length === 1);

  res = await request(app).get('/api/products?category=Misc');
  check('category filter returns both Misc products', res.body.length === 2);

  res = await request(app).get('/api/products/meta/categories');
  check('categories endpoint', Array.isArray(res.body) && res.body.includes('Misc'));

  res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ items: [{ productId, quantity: 99 }] });
  check('order rejects insufficient stock 400', res.status === 400);

  res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ items: [{ productId, quantity: 2 }] });
  check('order created 201', res.status === 201 && res.body.totalAmount === 20);
  check('order has line items', res.body.items.length === 1 && res.body.items[0].quantity === 2);
  const orderId = res.body._id;

  const { rows: stockRows } = await pool.query('SELECT stock FROM products WHERE id = $1', [
    productId,
  ]);
  check('stock decremented to 3', stockRows[0].stock === 3);

  res = await request(app).get('/api/orders').set('Authorization', `Bearer ${custToken}`);
  check('customer order history has 1', res.body.length === 1);

  res = await request(app).get('/api/orders/all').set('Authorization', `Bearer ${custToken}`);
  check('customer blocked from /orders/all 403', res.status === 403);

  res = await request(app).get('/api/orders/all').set('Authorization', `Bearer ${adminToken}`);
  check('admin /orders/all includes customer email', res.body[0].userId.email === 'cust@demo.com');

  res = await request(app)
    .put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'shipped' });
  check('admin sets status shipped', res.status === 200 && res.body.status === 'shipped');

  res = await request(app)
    .put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'nonsense' });
  check('invalid status rejected 400', res.status === 400);

  res = await request(app).get('/api/orders');
  check('no token 401', res.status === 401);

  res = await request(app)
    .delete(`/api/products/${productId}`)
    .set('Authorization', `Bearer ${adminToken}`);
  check('admin deletes product 200', res.status === 200);

  res = await request(app).get('/api/orders/all').set('Authorization', `Bearer ${adminToken}`);
  check('order item survives product delete (name snapshot)', res.body[0].items[0].name === 'Test Widget');

  await pool.end();
  await dropTestDb();

  console.log(failed === 0 ? '\nALL PASSED' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await dropTestDb().catch(() => {});
  process.exit(1);
});
