const express = require('express');
const { pool } = require('../config/pgdb');
const bcrypt = require('bcryptjs');
const logger = require('../utils/logger');

const router = express.Router();

const manageAuth = (req, res, next) => {
  const key = req.headers['x-manage-key'];
  if (!key || key !== process.env.MANAGE_SECRET) {
    return res.status(401).json({ success: false, error: 'Unauthorized' });
  }
  next();
};

// GET /api/manage/stats
router.get('/stats', manageAuth, async (req, res) => {
  try {
    const [admins, checkposts] = await Promise.all([
      pool.query('SELECT COUNT(*) FROM admins'),
      pool.query('SELECT COUNT(*) FROM checkposts')
    ]);
    res.json({
      success: true,
      adminCount: parseInt(admins.rows[0].count, 10),
      checkpostCount: parseInt(checkposts.rows[0].count, 10)
    });
  } catch (err) {
    logger.error('Manage stats error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── ADMINS ────────────────────────────────────────────────────────────────

router.get('/admins', manageAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, username, role, active, created_at, updated_at FROM admins ORDER BY id'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Manage list admins error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/admins', manageAuth, async (req, res) => {
  try {
    const { username, password, role } = req.body;
    if (!username || !password || !role)
      return res.status(400).json({ success: false, error: 'username, password and role are required' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO admins (username, password_hash, role, active) VALUES ($1, $2, $3, true) RETURNING id, username, role, active, created_at, updated_at',
      [username.toUpperCase(), hash, role]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, error: 'Username already exists' });
    logger.error('Manage create admin error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/admins/:id', manageAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID' });

    const { username, role, active, password } = req.body;
    if (!username || !role)
      return res.status(400).json({ success: false, error: 'username and role are required' });

    let result;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE admins SET username=$1, role=$2, active=$3, password_hash=$4, updated_at=NOW() WHERE id=$5 RETURNING id, username, role, active, created_at, updated_at',
        [username.toUpperCase(), role, active ?? true, hash, id]
      );
    } else {
      result = await pool.query(
        'UPDATE admins SET username=$1, role=$2, active=$3, updated_at=NOW() WHERE id=$4 RETURNING id, username, role, active, created_at, updated_at',
        [username.toUpperCase(), role, active ?? true, id]
      );
    }

    if (!result.rows.length)
      return res.status(404).json({ success: false, error: 'Admin not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, error: 'Username already exists' });
    logger.error('Manage update admin error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/admins/:id', manageAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const result = await pool.query('DELETE FROM admins WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length)
      return res.status(404).json({ success: false, error: 'Admin not found' });
    res.json({ success: true });
  } catch (err) {
    logger.error('Manage delete admin error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

// ─── CHECKPOSTS ────────────────────────────────────────────────────────────

router.get('/checkposts', manageAuth, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, checkpost_id, name, location, active, created_at, updated_at FROM checkposts ORDER BY id'
    );
    res.json({ success: true, data: result.rows });
  } catch (err) {
    logger.error('Manage list checkposts error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/checkposts', manageAuth, async (req, res) => {
  try {
    const { checkpost_id, name, location, password } = req.body;
    if (!checkpost_id || !name || !location || !password)
      return res.status(400).json({ success: false, error: 'All fields are required' });

    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO checkposts (checkpost_id, name, location, password_hash, active) VALUES ($1, $2, $3, $4, true) RETURNING id, checkpost_id, name, location, active, created_at, updated_at',
      [checkpost_id.toUpperCase(), name, location, hash]
    );
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, error: 'Checkpost ID already exists' });
    logger.error('Manage create checkpost error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.put('/checkposts/:id', manageAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID' });

    const { checkpost_id, name, location, active, password } = req.body;
    if (!checkpost_id || !name || !location)
      return res.status(400).json({ success: false, error: 'checkpost_id, name and location are required' });

    let result;
    if (password) {
      const hash = await bcrypt.hash(password, 10);
      result = await pool.query(
        'UPDATE checkposts SET checkpost_id=$1, name=$2, location=$3, active=$4, password_hash=$5, updated_at=NOW() WHERE id=$6 RETURNING id, checkpost_id, name, location, active, created_at, updated_at',
        [checkpost_id.toUpperCase(), name, location, active ?? true, hash, id]
      );
    } else {
      result = await pool.query(
        'UPDATE checkposts SET checkpost_id=$1, name=$2, location=$3, active=$4, updated_at=NOW() WHERE id=$5 RETURNING id, checkpost_id, name, location, active, created_at, updated_at',
        [checkpost_id.toUpperCase(), name, location, active ?? true, id]
      );
    }

    if (!result.rows.length)
      return res.status(404).json({ success: false, error: 'Checkpost not found' });
    res.json({ success: true, data: result.rows[0] });
  } catch (err) {
    if (err.code === '23505')
      return res.status(400).json({ success: false, error: 'Checkpost ID already exists' });
    logger.error('Manage update checkpost error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.delete('/checkposts/:id', manageAuth, async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (!id) return res.status(400).json({ success: false, error: 'Invalid ID' });
    const result = await pool.query('DELETE FROM checkposts WHERE id=$1 RETURNING id', [id]);
    if (!result.rows.length)
      return res.status(404).json({ success: false, error: 'Checkpost not found' });
    res.json({ success: true });
  } catch (err) {
    logger.error('Manage delete checkpost error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
