const { Pool, types } = require('pg');

// Return NUMERIC/DECIMAL (oid 1700) as JS numbers instead of strings.
types.setTypeParser(1700, (val) => (val === null ? null : parseFloat(val)));

// Prefer a single DATABASE_URL; fall back to discrete PG* vars.
const config = process.env.DATABASE_URL
  ? {
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.PGSSL === 'true' ? { rejectUnauthorized: false } : undefined,
    }
  : {
      host: process.env.PGHOST || 'localhost',
      port: Number(process.env.PGPORT || 5432),
      user: process.env.PGUSER || 'postgres',
      password: process.env.PGPASSWORD || 'postgres',
      database: process.env.PGDATABASE || 'Capstone',
    };

const pool = new Pool(config);

pool.on('error', (err) => {
  console.error('Unexpected PG pool error:', err.message);
});

/** Run a parameterized query. */
function query(text, params) {
  return pool.query(text, params);
}

/** Run a function inside a transaction, passing it a dedicated client. */
async function withTransaction(fn) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await fn(client);
    await client.query('COMMIT');
    return result;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/** Verify connectivity at startup. */
async function assertConnection() {
  const { rows } = await pool.query('SELECT current_database() AS db');
  console.log('PostgreSQL connected:', rows[0].db);
}

module.exports = { pool, query, withTransaction, assertConnection };
