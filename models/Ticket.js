const { pool } = require('../config/pgdb');

class Ticket {
  static async create({ checkpost_id, location, issue_type, description }) {
    const res = await pool.query(
      `INSERT INTO tickets (checkpost_id, location, issue_type, description, status)
       VALUES ($1, $2, $3, $4, 'active')
       RETURNING *`,
      [checkpost_id, location || '', issue_type, description || '']
    );
    return res.rows[0];
  }

  static async findAll({ status } = {}) {
    const where = status ? `WHERE status = $1` : '';
    const values = status ? [status] : [];
    const res = await pool.query(
      `SELECT * FROM tickets ${where} ORDER BY created_at DESC`,
      values
    );
    return res.rows;
  }

  static async updateStatus(id, status) {
    const res = await pool.query(
      `UPDATE tickets SET status = $1
       WHERE id = $2 RETURNING *`,
      [status, id]
    );
    return res.rows[0];
  }

  static async countActive() {
    const res = await pool.query(
      `SELECT COUNT(*) FROM tickets WHERE status = 'active'`
    );
    return parseInt(res.rows[0].count, 10);
  }
}

module.exports = Ticket;
