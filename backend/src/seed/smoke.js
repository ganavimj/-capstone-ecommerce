/* Ad-hoc end-to-end smoke test against an in-memory MongoDB. Run: node src/seed/smoke.js */
const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');
const request = require('supertest');

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '1h';

const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');

let failed = 0;
function check(label, cond) {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${label}`);
  if (!cond) failed += 1;
}

async function main() {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());

  // seed admin + one product
  const admin = new User({ name: 'Admin', email: 'admin@demo.com', role: 'admin' });
  await admin.setPassword('Admin123!');
  await admin.save();
  const product = await Product.create({
    name: 'Test Widget',
    price: 10,
    category: 'Misc',
    stock: 5,
  });

  // login as admin
  let res = await request(app)
    .post('/api/auth/login')
    .send({ email: 'admin@demo.com', password: 'Admin123!' });
  check('admin login 200', res.status === 200 && res.body.token);
  const adminToken = res.body.token;

  // register customer
  res = await request(app)
    .post('/api/auth/register')
    .send({ name: 'Cust', email: 'cust@demo.com', password: 'secret1' });
  check('register 201', res.status === 201 && res.body.user.role === 'customer');
  const custToken = res.body.token;

  // customer cannot create product
  res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ name: 'Hack', price: 1, category: 'x' });
  check('customer blocked from product create 403', res.status === 403);

  // admin creates product
  res = await request(app)
    .post('/api/products')
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ name: 'Admin Widget', price: 20, category: 'Misc', stock: 3 });
  check('admin product create 201', res.status === 201);

  // list + filter
  res = await request(app).get('/api/products?search=test');
  check('product search returns Test Widget', res.body.length === 1);

  res = await request(app).get('/api/products/meta/categories');
  check('categories endpoint', Array.isArray(res.body) && res.body.includes('Misc'));

  // order: too much stock
  res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ items: [{ productId: product._id, quantity: 99 }] });
  check('order rejects insufficient stock 400', res.status === 400);

  // order: valid
  res = await request(app)
    .post('/api/orders')
    .set('Authorization', `Bearer ${custToken}`)
    .send({ items: [{ productId: product._id, quantity: 2 }] });
  check('order created 201', res.status === 201 && res.body.totalAmount === 20);
  const orderId = res.body._id;

  // stock decremented
  const after = await Product.findById(product._id);
  check('stock decremented to 3', after.stock === 3);

  // customer sees own order
  res = await request(app).get('/api/orders').set('Authorization', `Bearer ${custToken}`);
  check('customer order history has 1', res.body.length === 1);

  // customer cannot list all
  res = await request(app).get('/api/orders/all').set('Authorization', `Bearer ${custToken}`);
  check('customer blocked from /orders/all 403', res.status === 403);

  // admin updates status
  res = await request(app)
    .put(`/api/orders/${orderId}/status`)
    .set('Authorization', `Bearer ${adminToken}`)
    .send({ status: 'shipped' });
  check('admin sets status shipped', res.status === 200 && res.body.status === 'shipped');

  // no token -> 401
  res = await request(app).get('/api/orders');
  check('no token 401', res.status === 401);

  await mongoose.disconnect();
  await mem.stop();

  console.log(failed === 0 ? '\nALL PASSED' : `\n${failed} FAILED`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
