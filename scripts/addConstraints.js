require('dotenv').config();
const { pool } = require('../config/pgdb');

(async () => {
  try {
    console.log('🚀 Adding DB constraints...');

    await pool.query(`
      ALTER TABLE logs
      ALTER COLUMN vehicle_no SET NOT NULL,
      ALTER COLUMN checkpost_id SET NOT NULL;
    `);

    await pool.query(`
      ALTER TABLE logs
      ADD CONSTRAINT chk_vehicle_length
      CHECK (char_length(vehicle_no) BETWEEN 6 AND 12);
    `);

    await pool.query(`
      ALTER TABLE logs
      ADD CONSTRAINT chk_status_valid
      CHECK (status IN ('cleared', 'flagged'));
    `);

    await pool.query(`
      ALTER TABLE logs
      ADD CONSTRAINT chk_total_pending_non_negative
      CHECK (total_pending_amount >= 0);
    `);

    await pool.query(`
      ALTER TABLE logs
      ALTER COLUMN documents_checked SET DEFAULT false,
      ALTER COLUMN drunk_and_drive SET DEFAULT false,
      ALTER COLUMN driver_drunk SET DEFAULT false,
      ALTER COLUMN suspicious_items SET DEFAULT false,
      ALTER COLUMN afis_suspect SET DEFAULT false,
      ALTER COLUMN without_number_plate SET DEFAULT false,
      ALTER COLUMN detained SET DEFAULT false;
    `);

    await pool.query(`
      ALTER TABLE logs
      ALTER COLUMN created_at SET DEFAULT NOW();
    `);

    console.log('✅ Constraints added successfully');
    process.exit(0);

  } catch (err) {
    console.error('❌ Constraint migration failed:', err);
    process.exit(1);
  }
})();
