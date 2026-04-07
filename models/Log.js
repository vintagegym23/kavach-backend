const { pool } = require('../config/pgdb');
const { encrypt } = require('../services/encryption');

const toBool = (val) => val === true || val === 'true';

class Log {
  // ------------------------
  // CREATE LOG
  // ------------------------
  static async create(data) {
    const {
      checkpost_id,
      vehicle_no,
      driver_name_enc,
      owner_name,
      driver_phone_enc,
      violation_checks = {},
      echallan_summary = {},
      driver_drunk = false,
      afis_suspect = false,
      remarks = null,
      photo_url = null,
      without_number_plate = false,
      detained = false,
      property_seized = null
    } = data;

    const driverDrunkBool = toBool(driver_drunk);
    const afisSuspectBool = toBool(afis_suspect);
    const withoutNumberPlateBool = toBool(without_number_plate);
    const detainedBool = toBool(detained);

    const violationChecks = {
      documents_checked: toBool(violation_checks.documents_checked),
      drunk_and_drive: toBool(violation_checks.drunk_and_drive),
      suspicious_items: toBool(violation_checks.suspicious_items)
    };

    // Status starts as 'pending' so the e-challan scraper can update before finalization
    const finalStatus = 'pending';

    const res = await pool.query(
      `
      INSERT INTO logs (
        checkpost_id,
        vehicle_no,
        owner_name,
        driver_name_enc,
        driver_phone_enc,
        documents_checked,
        drunk_and_drive,
        driver_drunk,
        suspicious_items,
        afis_suspect,
        challan_count,
        total_pending_amount,
        status,
        remarks,
        photo_url,
        without_number_plate,
        detained,
        property_seized
      )
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
      RETURNING id
      `,
      [
        checkpost_id,
        vehicle_no.toUpperCase(),
        owner_name || null,
        driver_name_enc || null,
        driver_phone_enc || null,
        violationChecks.documents_checked,
        violationChecks.drunk_and_drive,
        driverDrunkBool,
        violationChecks.suspicious_items,
        afisSuspectBool,
        echallan_summary.challan_count || 0,
        echallan_summary.total_pending_amount || 0,
        finalStatus,
        remarks || null,
        photo_url || null,
        withoutNumberPlateBool,
        detainedBool,
        property_seized || null
      ]
    );

    return res.rows[0];
  }

  // --------------------------------------------------
  // UPDATE E-CHALLAN DATA (Intermediate Step)
  // --------------------------------------------------
  static async updateEchallan(logId, challanCount, totalAmount, ownerName) {
    const res = await pool.query(
      `UPDATE logs
       SET challan_count = $1,
           total_pending_amount = $2,
           owner_name = $3,
           updated_at = NOW()
       WHERE id = $4 AND status = 'pending'
       RETURNING id`,
      [challanCount, totalAmount, ownerName, logId]
    );

    if (res.rows.length === 0) {
      throw new Error('Log is already finalized or not found');
    }
    return res.rows[0];
  }

  // --------------------------------------------------
  // UPDATE DRIVER INFO AND CLOSE LOG (Transaction Safe)
  // --------------------------------------------------
  static async updateDriverAndCloseAdvanced(logId, data) {
    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      const existing = await client.query(
        `SELECT status, total_pending_amount FROM logs WHERE id = $1 FOR UPDATE`,
        [logId]
      );

      if (!existing.rows.length) {
        throw new Error('Log not found');
      }

      const currentStatus = existing.rows[0].status;
      if (currentStatus === 'cleared' || currentStatus === 'flagged') {
        throw new Error('Log already closed. Modification not allowed.');
      }

      const drunk_and_drive = toBool(data.drunk_and_drive);
      const driver_drunk = toBool(data.driver_drunk);
      const afis_suspect = toBool(data.afis_suspect);
      const without_number_plate = toBool(data.without_number_plate);
      const detained = toBool(data.detained);
      const suspicious_items = toBool(data.suspicious_items);

      // Status is determined solely by the officer's explicit toggle.
      // Safety conditions (challans, drunk, suspect) are stored as data fields
      // but do NOT override the officer's final decision.
      const isFlagged = data.flag_vehicle === true;
      const status = isFlagged ? 'flagged' : 'cleared';

      await client.query(
        `UPDATE logs
          SET driver_name_enc = $1,
              driver_phone_enc = $2,
              drunk_and_drive = $3,
              driver_drunk = $4,
              suspicious_items = $5,
              afis_suspect = $6,
              without_number_plate = $7,
              detained = $8,
              property_seized = $9,
              remarks = $10,
              photo_url = COALESCE($11, photo_url),
              status = $12,
              updated_at = NOW()
          WHERE id = $13`,
        [
          data.driver_name_enc || null,
          data.driver_phone_enc || null,
          drunk_and_drive,
          driver_drunk,
          suspicious_items,
          afis_suspect,
          without_number_plate,
          detained,
          data.property_seized || null,
          data.remarks || null,
          data.photo_url || null,
          status,
          logId
        ]
      );

      await client.query('COMMIT');
      return { success: true, status };

    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  static async getByCheckpost(checkpostId, page = 1, limit = 20) {
    const offset = (page - 1) * limit;
    const dataQuery = `
      SELECT id, vehicle_no, owner_name, driver_name_enc, driver_phone_enc, documents_checked, drunk_and_drive,
             driver_drunk, suspicious_items, afis_suspect, challan_count, total_pending_amount,
             without_number_plate, detained, property_seized, remarks, photo_url, status, created_at
      FROM logs WHERE checkpost_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`;

    const countQuery = `SELECT COUNT(*) FROM logs WHERE checkpost_id = $1`;

    const [dataResult, countResult] = await Promise.all([
      pool.query(dataQuery, [checkpostId, limit, offset]),
      pool.query(countQuery, [checkpostId])
    ]);

    return {
      logs: dataResult.rows,
      total: parseInt(countResult.rows[0].count, 10)
    };
  }

  // ------------------------
  // FIND BY PRIMARY KEY
  // Used by the challan details route (/api/logs/:logId/challans)
  // ------------------------
  // ------------------------
  // CANCEL (DELETE) PENDING LOG
  // Only removes logs that are still pending and owned by the same checkpost.
  // ------------------------
  static async cancelPending(logId, checkpostId) {
    const result = await pool.query(
      `DELETE FROM logs WHERE id = $1 AND status = 'pending' AND checkpost_id = $2 RETURNING id`,
      [logId, checkpostId]
    );
    return result.rows.length > 0;
  }

  static async findById(id) {
    const parsedId = parseInt(id, 10);
    if (isNaN(parsedId)) return null;

    const result = await pool.query(
      `SELECT id, vehicle_no, owner_name, driver_name_enc, challan_count, total_pending_amount, status
       FROM logs WHERE id = $1`,
      [parsedId]
    );

    if (!result.rows.length) return null;
    return result.rows[0];
  }
}

module.exports = Log;
