const express = require('express');
const jwt = require('jsonwebtoken');
const Checkpost = require('../models/Checkpost');
const Admin = require('../models/Admin');
const { loginLimiter } = require('../middlewares/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

const JWT_OPTIONS_CHECKPOST = {
  expiresIn: '12h',
  algorithm: 'HS256',
  issuer: 'kavach-backend',
  audience: 'kavach-checkpost'
};

const JWT_OPTIONS_ADMIN = {
  expiresIn: '24h',
  algorithm: 'HS256',
  issuer: 'kavach-backend',
  audience: 'kavach-admin'
};

// CHECKPOST LOGIN
// POST /api/auth/checkpost/login
router.post('/checkpost/login', loginLimiter, async (req, res) => {
  try {
    let { checkpost_id, password } = req.body;

    if (!checkpost_id || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }

    checkpost_id = checkpost_id.trim().toUpperCase();

    const checkpost = await Checkpost.findOne({ checkpost_id });

    if (!checkpost || !checkpost.active) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await checkpost.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { type: 'CHECKPOST', role: 'CHECKPOST', checkpost_id: checkpost.checkpost_id },
      process.env.JWT_SECRET,
      JWT_OPTIONS_CHECKPOST
    );

    res.json({
      success: true,
      token,
      checkpost: {
        checkpost_id: checkpost.checkpost_id,
        name: checkpost.name,
        location: checkpost.location
      }
    });

  } catch (err) {
    logger.error('Checkpost login error', {
      message: err.message,
      checkpost_id: req.body?.checkpost_id
    });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ADMIN LOGIN
// POST /api/auth/admin/login
router.post('/admin/login', loginLimiter, async (req, res) => {
  try {
    let { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Missing credentials' });
    }

    username = username.trim();
    const admin = await Admin.findOne({ username });

    if (!admin || !admin.active) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { type: 'ADMIN', role: admin.role, username: admin.username },
      process.env.JWT_SECRET,
      JWT_OPTIONS_ADMIN
    );

    res.json({
      success: true,
      token,
      admin: { username: admin.username, role: admin.role }
    });

  } catch (err) {
    logger.error('Admin login error', {
      message: err.message,
      username: req.body?.username
    });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
