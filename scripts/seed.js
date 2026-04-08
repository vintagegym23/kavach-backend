require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const { connectDB, pool } = require('../config/pgdb');
const Admin = require('../models/Admin');
const Checkpost = require('../models/Checkpost');

const runSeed = async () => {
  try {
    await connectDB();
    console.log('🌱 Starting database seeding...');

    // -----------------------------
    // CLEAR OLD DATA
    // -----------------------------
    await pool.query('TRUNCATE admins RESTART IDENTITY CASCADE');
    await pool.query('TRUNCATE checkposts RESTART IDENTITY CASCADE');
    console.log('🗑️  Cleared existing admins and checkposts');

    // -----------------------------
    // CREATE ADMIN (SP)
    // -----------------------------
    const admin = await Admin.create({
      username: 'SP_KAMAREDDY',
      password: 'SP@12345',
      role: 'SP'
    });

    console.log('✅ Admin created');
    console.log('   Username:', admin.username);
    console.log('   Password: SP@12345');
    console.log('   Role    :', admin.role);

    // -----------------------------
    // CREATE CHECKPOST
    // -----------------------------
    const cp = await Checkpost.create({
      checkpost_id: 'KMR_CP_01',
      name: 'Kamareddy NH-44 Entry',
      location: 'NH-44 North Entry',
      password: 'CP01@123'
    });

    console.log('✅ Checkpost created');
    console.log('   Checkpost ID:', cp.checkpost_id);
    console.log('   Name        :', cp.name);
    console.log('   Location    :', cp.location);
    console.log('   Password    : CP01@123');

    console.log('\n🎉 Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err.message);
    process.exit(1);
  }
};

runSeed();
