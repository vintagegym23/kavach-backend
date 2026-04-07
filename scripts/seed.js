require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const connectDB = require('../config/db');
const Admin = require('../models/Admin');
const Checkpost = require('../models/Checkpost');

const runSeed = async () => {
  try {
    await connectDB();

    console.log('🌱 Starting database seeding...');

    // -----------------------------
    // CLEAR OLD DATA (OPTIONAL)
    // -----------------------------
    await Admin.deleteMany({});
    await Checkpost.deleteMany({});

    // -----------------------------
    // CREATE ADMIN (SP)
    // -----------------------------
    const adminPassword = 'SP@12345'; // CHANGE AFTER FIRST LOGIN
    const adminHash = await bcrypt.hash(adminPassword, 10);

    const admin = new Admin({
      username: 'SP_KAMAREDDY',
      password_hash: adminHash,
      role: 'SP'
    });

    await admin.save();

    console.log('✅ Admin created');
    console.log('   Username: SP_KAMAREDDY');
    console.log('   Password:', adminPassword);

    // -----------------------------
    // CREATE CHECKPOSTS
    // -----------------------------
    const checkpostsData = [
      {
        checkpost_id: 'KMR_CP_01',
        name: 'Kamareddy NH-44 Entry',
        location: 'NH-44 North Entry',
        password: 'CP01@123'
      },
      {
        checkpost_id: 'KMR_CP_02',
        name: 'Kamareddy NH-44 Exit',
        location: 'NH-44 South Exit',
        password: 'CP02@123'
      }
    ];

    for (const cp of checkpostsData) {
      const hash = await bcrypt.hash(cp.password, 10);

      const checkpost = new Checkpost({
        checkpost_id: cp.checkpost_id,
        name: cp.name,
        location: cp.location,
        password_hash: hash
      });

      await checkpost.save();

      console.log(`✅ Checkpost created: ${cp.checkpost_id}`);
      console.log(`   Password: ${cp.password}`);
    }

    console.log('🎉 Seeding completed successfully');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding failed:', err);
    process.exit(1);
  }
};

runSeed();
