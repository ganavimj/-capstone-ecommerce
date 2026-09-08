/*
 * Zero-setup local run: starts an in-memory MongoDB, seeds it, and launches the API.
 * Data resets every restart. Use this only for local development / demos without Atlas.
 * Run: npm run dev:mem
 */
require('dotenv').config();

// Zero-config fallbacks so `npm run dev:mem` works without a .env file.
process.env.JWT_SECRET = process.env.JWT_SECRET || 'dev-only-insecure-secret';
process.env.JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
process.env.ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@demo.com';
process.env.ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'Admin123!';
process.env.CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || '*';

const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

const app = require('../app');
const User = require('../models/User');
const Product = require('../models/Product');

const SAMPLE_PRODUCTS = require('./sample-products');

const PORT = process.env.PORT || 5000;

async function main() {
  const mem = await MongoMemoryServer.create();
  await mongoose.connect(mem.getUri());
  console.log('In-memory MongoDB started');

  const admin = new User({
    name: process.env.ADMIN_NAME || 'Site Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase(),
    role: 'admin',
  });
  await admin.setPassword(process.env.ADMIN_PASSWORD || 'Admin123!');
  await admin.save();
  await Product.insertMany(SAMPLE_PRODUCTS);
  console.log(`Seeded admin (${admin.email}) + ${SAMPLE_PRODUCTS.length} products`);

  app.listen(PORT, () => console.log(`API (in-memory) on http://localhost:${PORT}`));

  const shutdown = async () => {
    await mongoose.disconnect();
    await mem.stop();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
