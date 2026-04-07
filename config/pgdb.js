// require('dotenv').config();
// const { Pool } = require('pg');

// const pool = new Pool({
//   connectionString: process.env.DATABASE_URL,
//   ssl: { rejectUnauthorized: false }, // required for Render/PostgreSQL hosted
// });

// pool.on('connect', () => console.log('✅ PostgreSQL connected'));
// pool.on('error', (err) => console.error('❌ PostgreSQL pool error:', err));

// async function connectDB() {
//   try {
//     // Simple query to verify connection
//     await pool.query('SELECT NOW()');
//     console.log('✅ Database connection verified');
//   } catch (err) {
//     console.error('❌ Database connection failed', err);
//     process.exit(1);
//   }
// }

// module.exports = { pool, connectDB };




require('dotenv').config();
const pg = require('pg');
const { Pool } = pg;
const logger = require('../utils/logger');

// --------------------------------------------------
// 🕐 TIMESTAMP PARSING FIX
// pg's default parser for TIMESTAMP WITHOUT TIMEZONE (OID 1114) passes the bare
// string to new Date(), which JavaScript interprets as *local* time (IST on Render).
// Render's PostgreSQL stores these in UTC wall-clock, so we append 'Z' to force
// the JS Date constructor to treat the value as UTC. This eliminates the +5:30
// double-conversion that caused all timestamps to appear 5h30m in the past.
// TIMESTAMPTZ (OID 1184) is handled correctly by pg already and is left untouched.
// --------------------------------------------------
pg.types.setTypeParser(1114, (str) => new Date(str + 'Z'));

// --------------------------------------------------
// 🔐 FORCE SSL FOR CLOUD DATABASES (Render)
// --------------------------------------------------
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000
});

// --------------------------------------------------
// 📡 POOL EVENTS
// --------------------------------------------------
pool.on('connect', () => {
  logger.info('PostgreSQL client connected to pool');
});

// Idle client errors are logged but do NOT crash the server.
// The pool will attempt to recover. A hard crash is reserved for the
// initial connectDB() call in server.js via the thrown error.
pool.on('error', (err) => {
  logger.error('PostgreSQL pool idle client error', {
    message: err.message,
    code: err.code
  });
});

// --------------------------------------------------
// 🔎 CONNECTION VERIFICATION (called once at startup)
// --------------------------------------------------
async function connectDB() {
  try {
    const client = await pool.connect();
    await client.query('SELECT 1');

    // Auto-create tickets table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS tickets (
        id          SERIAL PRIMARY KEY,
        checkpost_id TEXT NOT NULL,
        location    TEXT DEFAULT '',
        issue_type  TEXT NOT NULL,
        description TEXT DEFAULT '',
        status      TEXT DEFAULT 'active' CHECK (status IN ('active', 'closed')),
        created_at  TIMESTAMPTZ DEFAULT NOW()
      )
    `);

    client.release();
    logger.info('Database connection verified');
  } catch (err) {
    logger.error('Database connection failed', { message: err.message });
    throw err; // Let server.js handle the process exit
  }
}

module.exports = { pool, connectDB };
