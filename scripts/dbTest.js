require('dotenv').config();
const Admin = require('../models/Admin');
const Checkpost = require('../models/Checkpost');

(async () => {
  try {
    // ---- ADMIN SETUP ----
    const adminCount = await Admin.count();
    console.log('Admins count:', adminCount);

    if (adminCount === 0) {
      const admin = await Admin.create({
        username: 'SP_KAMAREDDY',
        password: 'SP@12345',
        role: 'SP'
      });
      console.log('Admin created:', admin.username);
    } else {
      console.log('Admin already exists');
    }

    // ---- CHECKPOST SETUP ----
    const cp = await Checkpost.findOne({ checkpost_id: 'KMR_CP_01' });

    if (!cp) {
      await Checkpost.create({
        checkpost_id: 'KMR_CP_01',
        name: 'Kamareddy NH-44 Entry',
        location: 'NH-44 North',
        password: 'CP01@123'
      });
      console.log('Checkpost created');
    } else {
      console.log('Checkpost exists:', cp.checkpost_id);
    }

    process.exit(0);
  } catch (err) {
    console.error('❌ DB init failed:', err);
    process.exit(1);
  }
})();
