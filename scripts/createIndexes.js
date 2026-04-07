require('dotenv').config();
const { pool } = require('../config/pgdb');

(async () => {
  try {
    console.log('🚀 Creating indexes...');

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_checkpost_created
      ON logs (checkpost_id, created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_created_at
      ON logs (created_at DESC);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_vehicle_no
      ON logs (vehicle_no);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_status
      ON logs (status);
    `);

    await pool.query(`
      CREATE INDEX IF NOT EXISTS idx_logs_date
      ON logs ((created_at::date));
    `);

    console.log('✅ Indexes created successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Failed to create indexes:', err);
    process.exit(1);
  }
})();
