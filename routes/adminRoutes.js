// const express = require('express');
// const auth = require('../middlewares/auth');
// const roleCheck = require('../middlewares/roleCheck');
// const { pool } = require('../config/pgdb');
// const { decrypt } = require('../services/encryption');

// const router = express.Router();

// /**
//  * LIVE STATS
//  * GET /api/admin/stats/live
//  */
// router.get(
//   '/stats/live',
//   auth,
//   roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
//   async (req, res) => {
//     try {
//       const result = await pool.query(`
//         SELECT
//           checkpost_id,
//           COUNT(*) AS total_vehicles,
//           SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
//           SUM(total_pending_amount) AS total_fines
//         FROM logs
//         WHERE created_at::date = CURRENT_DATE
//         GROUP BY checkpost_id
//         ORDER BY total_vehicles DESC
//       `);

//       res.json({ success: true, data: result.rows });
//     } catch (err) {
//       console.error('Admin live stats error:', err);
//       res.status(500).json({ success: false, error: 'Server error' });
//     }
//   }
// );

// /**
//  * TODAY SUMMARY
//  * GET /api/admin/stats/today
//  */
// router.get(
//   '/stats/today',
//   auth,
//   roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
//   async (req, res) => {
//     try {
//       const result = await pool.query(`
//         SELECT
//           COUNT(*) AS total_vehicles,
//           SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
//           SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) AS cleared,
//           SUM(total_pending_amount) AS total_fines
//         FROM logs
//         WHERE created_at::date = CURRENT_DATE
//       `);

//       res.json({
//         success: true,
//         data: result.rows[0] || {
//           total_vehicles: 0,
//           flagged: 0,
//           cleared: 0,
//           total_fines: 0
//         }
//       });
//     } catch (err) {
//       console.error('Admin today stats error:', err);
//       res.status(500).json({ success: false, error: 'Server error' });
//     }
//   }
// );

// /**
//  * REPORTS
//  * GET /api/admin/reports?startDate=&endDate=
//  */
// router.get(
//   '/reports',
//   auth,
//   roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
//   async (req, res) => {
//     try {
//       const { startDate, endDate } = req.query;

//       let where = '';
//       const values = [];

//       if (startDate && endDate) {
//         where = `WHERE created_at BETWEEN $1 AND $2`;
//         values.push(startDate, endDate);
//       }

//       const result = await pool.query(
//         `
//         SELECT
//           checkpost_id,
//           COUNT(*) AS total_vehicles,
//           SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
//           SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) AS cleared,
//           SUM(total_pending_amount) AS total_fines
//         FROM logs
//         ${where}
//         GROUP BY checkpost_id
//         ORDER BY total_vehicles DESC
//         `,
//         values
//       );

//       res.json({ success: true, data: result.rows });
//     } catch (err) {
//       console.error('Admin reports error:', err);
//       res.status(500).json({ success: false, error: 'Server error' });
//     }
//   }
// );

// /**
//  * SEARCH LOGS
//  * GET /api/admin/logs
//  */
// router.get(
//   '/logs',
//   auth,
//   roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
//   async (req, res) => {
//     try {
//       const { vehicleNo, checkpost, date, page = 1, export: exportFlag } = req.query;
//       const limit = 20;
//       const offset = (page - 1) * limit;

//       const conditions = [];
//       const values = [];
//       let i = 1;

//       if (vehicleNo) {
//         conditions.push(`vehicle_no LIKE $${i++}`);
//         values.push(`%${vehicleNo.toUpperCase()}%`);
//       }

//       if (checkpost) {
//         conditions.push(`checkpost_id = $${i++}`);
//         values.push(checkpost);
//       }

//       if (date) {
//         conditions.push(`created_at::date = $${i++}`);
//         values.push(date);
//       }

//       const where = conditions.length
//         ? `WHERE ${conditions.join(' AND ')}`
//         : '';

//       const exportAll = exportFlag === 'true';

//       const dataQuery = `
//         SELECT * FROM logs
//         ${where}
//         ORDER BY created_at DESC
//         ${exportAll ? '' : `LIMIT ${limit} OFFSET ${offset}`}
//       `;

//       const logs = await pool.query(dataQuery, values);
//       const total = await pool.query(
//         `SELECT COUNT(*) FROM logs ${where}`,
//         values
//       );

//       const safeLogs = logs.rows.map(l => ({
//         id: l.id,
//         checkpost_id: l.checkpost_id,
//         vehicle_no: l.vehicle_no,
//         status: l.status,

//         violation_checks: {
//           documents_checked: l.documents_checked,
//           drunk_and_drive: l.drunk_and_drive,
//           suspicious_items: l.suspicious_items
//         },

//         echallan_summary: {
//           challan_count: l.challan_count,
//           total_pending_amount: l.total_pending_amount
//         },

//         timestamp: l.created_at,
//         driver_name: decrypt(l.driver_name_enc),
//         driver_phone: decrypt(l.driver_phone_enc)
//       }));

//       res.json({
//         success: true,
//         totalPages: exportAll ? 1 : Math.ceil(total.rows[0].count / limit),
//         currentPage: exportAll ? 1 : Number(page),
//         data: safeLogs
//       });
//     } catch (err) {
//       console.error('Admin log search error:', err);
//       res.status(500).json({ success: false, error: 'Server error' });
//     }
//   }
// );

// /**
//  * CHALLAN TREND
//  * GET /api/admin/challan-trend/:days
//  * Returns last N days challan collection
//  */
// router.get(
//   '/challan-trend/:days',
//   auth,
//   roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
//   async (req, res) => {
//     const days = parseInt(req.params.days) || 7;

//     try {
//       // Step 1: aggregate fines per day
//       const result = await pool.query(`
//         SELECT
//           TO_CHAR(date_trunc('day', created_at), 'YYYY-MM-DD') AS date,
//           SUM(total_pending_amount) AS amount
//         FROM logs
//         WHERE created_at >= NOW() - INTERVAL '${days} days'
//         GROUP BY date
//         ORDER BY date ASC
//       `);

//       // Step 2: convert amount from string -> number
//       const raw = result.rows.map(r => ({
//         date: r.date,
//         amount: parseFloat(r.amount) || 0
//       }));

//       // Step 3: fill missing dates with 0
//       const trend = [];
//       for (let i = days - 1; i >= 0; i--) {
//         const d = new Date();
//         d.setDate(d.getDate() - i);
//         const dateStr = d.toISOString().split('T')[0];
//         const found = raw.find(r => r.date === dateStr);
//         trend.push({
//           date: dateStr,
//           amount: found ? found.amount : 0
//         });
//       }

//       res.json({ success: true, data: trend });
//     } catch (err) {
//       console.error('Admin challan trend error:', err);
//       res.status(500).json({ success: false, error: 'Server error' });
//     }
//   }
// );



// module.exports = router;




















const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const { pool } = require('../config/pgdb');
const { decrypt } = require('../services/encryption');
const logger = require('../utils/logger');

const router = express.Router();

/**
 * LIVE STATS
 */
router.get(
  '/stats/live',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          checkpost_id,
          COUNT(*) AS total_vehicles,
          SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
          SUM(total_pending_amount) AS total_fines
        FROM logs
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
        GROUP BY checkpost_id
        ORDER BY total_vehicles DESC
      `);

      res.json({ success: true, data: result.rows });
    } catch (err) {
      logger.error('Admin live stats error', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        user: req.user?.username || req.user?.checkpost_id || 'unknown'
      });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * TODAY SUMMARY
 */
router.get(
  '/stats/today',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      const result = await pool.query(`
        SELECT
          COUNT(*) AS total_vehicles,
          SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
          SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) AS cleared,
          SUM(total_pending_amount) AS total_fines
        FROM logs
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date
      `);

      res.json({
        success: true,
        data: result.rows[0] || {
          total_vehicles: 0,
          flagged: 0,
          cleared: 0,
          total_fines: 0
        }
      });
    } catch (err) {
      logger.error('Admin today stats error', {
        message: err.message,
        stack: err.stack,
        path: req.path,
        user: req.user?.username || 'unknown'
      });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * REPORTS
 */
router.get(
  '/reports',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;

      let where = '';
      const values = [];

      if (startDate && endDate) {
        where = `WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2`;
        values.push(startDate, endDate);
      }

      const result = await pool.query(
        `
        SELECT
          checkpost_id,
          COUNT(*) AS total_vehicles,
          SUM(CASE WHEN status = 'flagged' THEN 1 ELSE 0 END) AS flagged,
          SUM(CASE WHEN status = 'cleared' THEN 1 ELSE 0 END) AS cleared,
          SUM(total_pending_amount) AS total_fines
        FROM logs
        ${where}
        GROUP BY checkpost_id
        ORDER BY total_vehicles DESC
        `,
        values
      );

      res.json({ success: true, data: result.rows });
    } catch (err) {
      logger.error('Admin reports error', {
        message: err.message,
        stack: err.stack,
        query: req.query,
        user: req.user?.username || 'unknown'
      });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * SEARCH LOGS
 */
router.get(
  '/logs',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      const { vehicleNo, checkpost, date, startDate, endDate, today, page = 1, export: exportFlag } = req.query;
      const PAGE_SIZE = 20;
      const EXPORT_CAP = 5000; // Hard cap — prevents OOM on unbounded SELECT *
      const offset = (page - 1) * PAGE_SIZE;

      const conditions = [];
      const values = [];
      let i = 1;

      if (vehicleNo) {
        conditions.push(`vehicle_no LIKE $${i++}`);
        values.push(`%${vehicleNo.toUpperCase()}%`);
      }

      if (checkpost) {
        conditions.push(`checkpost_id = $${i++}`);
        values.push(checkpost);
      }

      // today=true → current date only (used by Dashboard) — IST-aware
      if (today === 'true') {
        conditions.push(`(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date`);
      } else if (startDate && endDate) {
        conditions.push(`(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $${i++} AND $${i++}`);
        values.push(startDate, endDate);
      } else if (startDate) {
        conditions.push(`(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date >= $${i++}`);
        values.push(startDate);
      } else if (date) {
        conditions.push(`(created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $${i++}`);
        values.push(date);
      }

      const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
      const exportAll = exportFlag === 'true';

      const dataQuery = exportAll
        ? `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ${EXPORT_CAP}`
        : `SELECT * FROM logs ${where} ORDER BY created_at DESC LIMIT ${PAGE_SIZE} OFFSET ${offset}`;

      // Run data + count queries in parallel
      const [logsResult, totalResult] = await Promise.all([
        pool.query(dataQuery, values),
        pool.query(`SELECT COUNT(*) FROM logs ${where}`, values)
      ]);

      const safeLogs = logsResult.rows.map(l => ({
        id: l.id,
        checkpost_id: l.checkpost_id,
        vehicle_no: l.vehicle_no,
        status: l.status,

        violation_checks: {
          documents_checked: l.documents_checked,
          drunk_and_drive: l.drunk_and_drive,
          suspicious_items: l.suspicious_items
        },

        echallan_summary: {
          challan_count: l.challan_count,
          total_pending_amount: l.total_pending_amount
        },

        timestamp: l.created_at,
        driver_name: l.driver_name_enc ? decrypt(l.driver_name_enc) : 'N/A',
        driver_phone: l.driver_phone_enc ? decrypt(l.driver_phone_enc) : 'N/A'
      }));

      const totalCount = Number(totalResult.rows[0].count);

      res.json({
        success: true,
        totalPages: exportAll ? 1 : Math.ceil(totalCount / PAGE_SIZE),
        currentPage: exportAll ? 1 : Number(page),
        capped: exportAll && totalCount > EXPORT_CAP,
        data: safeLogs
      });
    } catch (err) {
      logger.error('Admin log search error', {
        message: err.message,
        stack: err.stack,
        query: req.query,
        user: req.user?.username || 'unknown'
      });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * CHALLAN TREND
 */
router.get(
  '/challan-trend/:days',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    const days = parseInt(req.params.days, 10) || 7;

    try {
      const result = await pool.query(
        `SELECT
          TO_CHAR(date_trunc('day', created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata'), 'YYYY-MM-DD') AS date,
          SUM(total_pending_amount) AS amount
        FROM logs
        WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date
              >= (NOW() AT TIME ZONE 'Asia/Kolkata')::date - ($1 || ' days')::INTERVAL
        GROUP BY date
        ORDER BY date ASC`,
        [days]
      );

      const raw = result.rows.map(r => ({
        date: r.date,
        amount: parseFloat(r.amount) || 0
      }));

      // Generate IST dates on the server (Render runs UTC, so derive IST explicitly)
      const trend = [];
      const nowIST = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(nowIST);
        d.setDate(d.getDate() - i);
        const dateStr = d.getFullYear() + '-'
          + String(d.getMonth() + 1).padStart(2, '0') + '-'
          + String(d.getDate()).padStart(2, '0');
        const found = raw.find(r => r.date === dateStr);
        trend.push({
          date: dateStr,
          amount: found ? found.amount : 0
        });
      }

      res.json({ success: true, data: trend });
    } catch (err) {
      logger.error('Admin challan trend error', {
        message: err.message,
        stack: err.stack,
        params: req.params,
        user: req.user?.username || 'unknown'
      });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * CHECKPOST OVERVIEW (for System Settings)
 * GET /api/admin/checkposts
 */
router.get(
  '/checkposts',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (_req, res) => {
    try {
      const [checkpostsResult, latestLogsResult] = await Promise.all([
        pool.query(`SELECT checkpost_id, name, location, active FROM checkposts ORDER BY checkpost_id`),
        pool.query(`
          SELECT DISTINCT ON (checkpost_id)
            checkpost_id,
            created_at AS latest_log_at
          FROM logs
          ORDER BY checkpost_id, created_at DESC
        `)
      ]);

      const latestMap = {};
      for (const row of latestLogsResult.rows) {
        latestMap[row.checkpost_id] = row.latest_log_at;
      }

      const now = new Date();
      const data = checkpostsResult.rows.map(cp => {
        const latestAt = latestMap[cp.checkpost_id] || null;
        const isActive = latestAt
          ? (now - new Date(latestAt)) < 24 * 60 * 60 * 1000
          : false;
        return {
          checkpost_id: cp.checkpost_id,
          name: cp.name,
          location: cp.location,
          active: isActive,
          latest_log_at: latestAt
        };
      });

      res.json({ success: true, data });
    } catch (err) {
      logger.error('Admin checkposts error', { message: err.message });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * CHALLANS BY CHECKPOST
 * GET /api/admin/reports/challans-by-checkpost?date=YYYY-MM-DD
 * date defaults to yesterday (UTC). Used by Dashboard pie chart.
 */
router.get(
  '/reports/challans-by-checkpost',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      let { date } = req.query;

      if (!date) {
        const d = new Date();
        d.setUTCDate(d.getUTCDate() - 1);
        date = d.toISOString().split('T')[0];
      }

      if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
        return res.status(400).json({ success: false, error: 'Invalid date. Use YYYY-MM-DD' });
      }

      const result = await pool.query(
        `SELECT
           l.checkpost_id,
           COALESCE(c.name, l.checkpost_id) AS name,
           SUM(l.challan_count)::int           AS challan_count,
           SUM(l.total_pending_amount)::float  AS total_amount
         FROM logs l
         LEFT JOIN checkposts c ON c.checkpost_id = l.checkpost_id
         WHERE (l.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = $1
           AND l.challan_count > 0
         GROUP BY l.checkpost_id, c.name
         ORDER BY challan_count DESC`,
        [date]
      );

      res.json({
        success: true,
        date,
        data: result.rows.map(r => ({
          checkpost_id: r.checkpost_id,
          name: r.name || r.checkpost_id,
          challan_count: r.challan_count || 0,
          total_amount: r.total_amount || 0
        }))
      });
    } catch (err) {
      logger.error('Challans by checkpost error', { message: err.message });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * ENHANCED REPORTS EXPORT (Excel-format CSV data)
 * GET /api/admin/reports/export?startDate=&endDate=
 */
router.get(
  '/reports/export',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (req, res) => {
    try {
      const { startDate, endDate } = req.query;
      const sd = startDate || '2000-01-01';
      const ed = endDate || new Date().toISOString().split('T')[0];

      const result = await pool.query(`
        WITH range_stats AS (
          SELECT checkpost_id,
            COUNT(*) AS vehicles_checked,
            SUM(CASE WHEN suspicious_items THEN 1 ELSE 0 END) AS suspects_checked,
            SUM(CASE WHEN afis_suspect THEN 1 ELSE 0 END) AS suspects_traced,
            SUM(CASE WHEN drunk_and_drive THEN 1 ELSE 0 END) AS dd_checked,
            SUM(CASE WHEN driver_drunk THEN 1 ELSE 0 END) AS dd_cases,
            SUM(CASE WHEN without_number_plate THEN 1 ELSE 0 END) AS wrong_plate,
            SUM(challan_count) AS challans_paid,
            SUM(CASE WHEN detained THEN 1 ELSE 0 END) AS detained,
            SUM(CASE WHEN property_seized IS NOT NULL AND property_seized <> '' THEN 1 ELSE 0 END) AS property_seized
          FROM logs WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date BETWEEN $1 AND $2
          GROUP BY checkpost_id
        ),
        cumul_stats AS (
          SELECT checkpost_id,
            COUNT(*) AS vehicles_checked,
            SUM(CASE WHEN suspicious_items THEN 1 ELSE 0 END) AS suspects_checked,
            SUM(CASE WHEN afis_suspect THEN 1 ELSE 0 END) AS suspects_traced,
            SUM(CASE WHEN driver_drunk THEN 1 ELSE 0 END) AS dd_cases,
            SUM(CASE WHEN without_number_plate THEN 1 ELSE 0 END) AS wrong_plate,
            SUM(challan_count) AS challans_paid,
            SUM(CASE WHEN detained THEN 1 ELSE 0 END) AS detained,
            SUM(CASE WHEN property_seized IS NOT NULL AND property_seized <> '' THEN 1 ELSE 0 END) AS property_seized
          FROM logs WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date <= $2
          GROUP BY checkpost_id
        ),
        prev_stats AS (
          SELECT checkpost_id,
            COUNT(*) AS vehicles_checked,
            SUM(CASE WHEN suspicious_items THEN 1 ELSE 0 END) AS suspects_checked,
            SUM(CASE WHEN afis_suspect THEN 1 ELSE 0 END) AS suspects_traced,
            SUM(CASE WHEN driver_drunk THEN 1 ELSE 0 END) AS dd_cases,
            SUM(CASE WHEN without_number_plate THEN 1 ELSE 0 END) AS wrong_plate,
            SUM(challan_count) AS challans_paid,
            SUM(CASE WHEN detained THEN 1 ELSE 0 END) AS detained,
            SUM(CASE WHEN property_seized IS NOT NULL AND property_seized <> '' THEN 1 ELSE 0 END) AS property_seized
          FROM logs WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date < $1
          GROUP BY checkpost_id
        )
        SELECT
          c.checkpost_id, c.location, c.name,
          COALESCE(r.vehicles_checked,0) AS t_vehicles,
          COALESCE(r.suspects_checked,0) AS t_suspects_checked,
          COALESCE(r.suspects_traced,0) AS t_suspects_traced,
          COALESCE(r.dd_checked,0) AS t_dd_checked,
          COALESCE(r.dd_cases,0) AS t_dd_cases,
          COALESCE(r.wrong_plate,0) AS t_wrong_plate,
          COALESCE(r.challans_paid,0) AS t_challans_paid,
          COALESCE(r.detained,0) AS t_detained,
          COALESCE(r.property_seized,0) AS t_property_seized,
          COALESCE(cs.vehicles_checked,0) AS c_vehicles,
          COALESCE(cs.suspects_checked,0) AS c_suspects_checked,
          COALESCE(cs.suspects_traced,0) AS c_suspects_traced,
          COALESCE(cs.dd_cases,0) AS c_dd_cases,
          COALESCE(cs.wrong_plate,0) AS c_wrong_plate,
          COALESCE(cs.challans_paid,0) AS c_challans_paid,
          COALESCE(cs.detained,0) AS c_detained,
          COALESCE(cs.property_seized,0) AS c_property_seized,
          COALESCE(ps.vehicles_checked,0) AS p_vehicles,
          COALESCE(ps.suspects_checked,0) AS p_suspects_checked,
          COALESCE(ps.suspects_traced,0) AS p_suspects_traced,
          COALESCE(ps.dd_cases,0) AS p_dd_cases,
          COALESCE(ps.wrong_plate,0) AS p_wrong_plate,
          COALESCE(ps.challans_paid,0) AS p_challans_paid,
          COALESCE(ps.detained,0) AS p_detained,
          COALESCE(ps.property_seized,0) AS p_property_seized
        FROM checkposts c
        LEFT JOIN range_stats r ON c.checkpost_id = r.checkpost_id
        LEFT JOIN cumul_stats cs ON c.checkpost_id = cs.checkpost_id
        LEFT JOIN prev_stats ps ON c.checkpost_id = ps.checkpost_id
        ORDER BY c.checkpost_id
      `, [sd, ed]);

      res.json({ success: true, data: result.rows, startDate: sd, endDate: ed });
    } catch (err) {
      logger.error('Admin reports export error', { message: err.message });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

/**
 * GET /api/admin/tickets/count
 * Active ticket count for bell red dot
 */
const Ticket = require('../models/Ticket');

router.get(
  '/tickets/count',
  auth,
  roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']),
  async (_req, res) => {
    try {
      const count = await Ticket.countActive();
      res.json({ success: true, count });
    } catch (err) {
      logger.error('Admin ticket count error', { message: err.message });
      res.status(500).json({ success: false, error: 'Server error' });
    }
  }
);

module.exports = router;
