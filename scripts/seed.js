require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

// PostgreSQL pool connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL, // or individual host/user/db settings
});

const runSeed = async () => {
  const client = await pool.connect();
  try {
    console.log('🌱 Starting PostgreSQL seeding...');

    // -----------------------------
    // CLEAR OLD DATA AND RESET IDS
    // -----------------------------
    await client.query(`
      TRUNCATE TABLE
        public.admins,
        public.checkposts
      RESTART IDENTITY CASCADE;
    `);
    console.log('🗑️  Cleared old admins and checkposts');

    // -----------------------------
    // CREATE ADMIN
    // -----------------------------
    const adminPassword = 'SP@12345';
    const adminHash = await bcrypt.hash(adminPassword, 10);

    await client.query(
      `INSERT INTO public.admins
        (username, password_hash, role, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, NOW(), NOW())`,
      ['SP_KAMAREDDY', adminHash, 'SP', true]
    );
    console.log('✅ Admin created');
    console.log('   Username: SP_KAMAREDDY');
    console.log('   Password:', adminPassword);

    // -----------------------------
    // CREATE CHECKPOST
    // -----------------------------
    const checkpostPassword = 'CP01@123';
    const checkpostHash = await bcrypt.hash(checkpostPassword, 10);

    await client.query(
      `INSERT INTO public.checkposts
        (checkpost_id, name, location, password_hash, active, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5, NOW(), NOW())`,
      ['KMR_CP_01', 'Kamareddy NH-44 Entry', 'NH-44 North Entry', checkpostHash, true]
    );

    console.log('✅ Checkpost created');
    console.log('   Checkpost ID: KMR_CP_01');
    console.log('   Password:', checkpostPassword);

    console.log('🎉 PostgreSQL seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  } finally {
    client.release();
  }
};

runSeed();