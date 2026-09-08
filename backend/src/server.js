require('dotenv').config();
const app = require('./app');
const { assertConnection, pool } = require('./config/db');

const PORT = process.env.PORT || 5000;

assertConnection()
  .then(() => {
    const server = app.listen(PORT, () =>
      console.log(`API listening on http://localhost:${PORT}`)
    );
    const shutdown = () => server.close(() => pool.end().then(() => process.exit(0)));
    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  })
  .catch((err) => {
    console.error('Failed to start:', err.message);
    console.error('Check your PG connection settings in .env');
    process.exit(1);
  });
