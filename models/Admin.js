const { pool } = require('../config/pgdb');

const bcrypt = require('bcryptjs');

class Admin {
  constructor({ id, username, password_hash, role, active = true }) {
    this.id = id;
    this.username = username;
    this.password_hash = password_hash;
    this.role = role;
    this.active = active;
  }


static async findOne({ username }) {
  if (!username) throw new Error('Username is required');
  const res = await pool.query(
    'SELECT * FROM admins WHERE username = $1 AND active = true',
    [username.toUpperCase()]
  );
  if (!res.rows.length) return null;
  return new Admin(res.rows[0]);
}

  async comparePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  static async create({ username, password, role }) {
    const hash = await bcrypt.hash(password, 10);
    const res = await pool.query(
      'INSERT INTO admins (username, password_hash, role, active) VALUES ($1, $2, $3, true) RETURNING *',
      [username.toUpperCase(), hash, role]
    );
    return new Admin(res.rows[0]);
  }

  static async count() {
    const res = await pool.query('SELECT COUNT(*) FROM admins');
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = Admin;
