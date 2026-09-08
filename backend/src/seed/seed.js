require('dotenv').config();
const mongoose = require('mongoose');
const connectDB = require('../config/db');
const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const SAMPLE_PRODUCTS = require('./sample-products');

async function run() {
  await connectDB(process.env.MONGO_URI);

  await Promise.all([User.deleteMany({}), Product.deleteMany({}), Order.deleteMany({})]);
  console.log('Cleared users, products, orders');

  const admin = new User({
    name: process.env.ADMIN_NAME || 'Site Admin',
    email: (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase(),
    role: 'admin',
  });
  await admin.setPassword(process.env.ADMIN_PASSWORD || 'Admin123!');
  await admin.save();
  console.log(`Admin created: ${admin.email}`);

  await Product.insertMany(SAMPLE_PRODUCTS);
  console.log(`Inserted ${SAMPLE_PRODUCTS.length} products`);

  await mongoose.connection.close();
  console.log('Done.');
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
