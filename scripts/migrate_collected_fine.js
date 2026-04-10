require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { pool, connectDB } = require('../config/pgdb');

const run = async () => {
  await connectDB();

  await pool.query(`
    ALTER TABLE logs
    ADD COLUMN IF NOT EXISTS collected_fine_amount NUMERIC(12,2) NOT NULL DEFAULT 0
  `);

  console.log('✅ collected_fine_amount column added to logs table');
  process.exit(0);
};

run().catch(err => {
  console.error('❌ Migration failed:', err.message);
  process.exit(1);
});
