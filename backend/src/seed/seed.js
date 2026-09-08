/*
 * Creates the schema (DROPS existing tables) and loads sample data.
 * Run: npm run seed
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');
const SAMPLE_PRODUCTS = require('./sample-products');

async function run() {
  const schema = fs.readFileSync(path.join(__dirname, '..', 'db', 'schema.sql'), 'utf8');

  const client = await pool.connect();
  try {
    console.log('Applying schema (dropping and recreating tables)…');
    await client.query(schema);

    await client.query('BEGIN');

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@demo.com').toLowerCase();
    const adminHash = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 10);
    await client.query(
      `INSERT INTO users (name, email, password_hash, role)
       VALUES ($1, $2, $3, 'admin')`,
      [process.env.ADMIN_NAME || 'Site Admin', adminEmail, adminHash]
    );
    console.log(`Admin user: ${adminEmail}`);

    for (const p of SAMPLE_PRODUCTS) {
      await client.query(
        `INSERT INTO products (name, description, price, category, stock, image_url)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [p.name, p.description, p.price, p.category, p.stock, p.imageUrl]
      );
    }
    console.log(`Inserted ${SAMPLE_PRODUCTS.length} products`);

    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK').catch(() => {});
    throw err;
  } finally {
    client.release();
  }

  await pool.end();
  console.log('Seed complete.');
}

run().catch((err) => {
  console.error('Seed failed:', err.message);
  process.exit(1);
});
