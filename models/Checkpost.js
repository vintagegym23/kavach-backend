const { pool } = require('../config/pgdb');

const bcrypt = require('bcryptjs');

class Checkpost {
  constructor(row) {
    this.id = row.id;
    this.checkpost_id = row.checkpost_id;
    this.name = row.name;
    this.location = row.location;
    this.password_hash = row.password_hash;
    this.active = row.active;
  }

  static async findOne({ checkpost_id }) {
    const res = await pool.query(
      `SELECT * FROM checkposts
       WHERE checkpost_id = $1 AND active = true`,
      [checkpost_id.toUpperCase()]
    );

    if (!res.rows.length) return null;
    return new Checkpost(res.rows[0]);
  }

  async comparePassword(password) {
    return bcrypt.compare(password, this.password_hash);
  }

  static async create({ checkpost_id, name, location, password }) {
    const hash = await bcrypt.hash(password, 10);

    const res = await pool.query(
      `INSERT INTO checkposts
       (checkpost_id, name, location, password_hash)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [checkpost_id.toUpperCase(), name, location, hash]
    );

    return new Checkpost(res.rows[0]);
  }
}

module.exports = Checkpost;
