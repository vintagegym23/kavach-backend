const Log = require('../models/Log');
const { decrypt } = require('../services/encryption');
const logger = require('../utils/logger');

/**
 * GET CHECKPOST HISTORY
 * GET /api/logs/history?page=1&limit=10
 */
exports.getCheckpostHistory = async (req, res) => {
  try {
    const checkpostId = req.user.checkpost_id;
    const page = Number(req.query.page || 1);
    const limit = Number(req.query.limit || 10);

    // This calls the static method in Log.js
    const result = await Log.getByCheckpost(checkpostId, page, limit);

    // We map the rows from the database to a clean JSON structure for the frontend
    const safeData = result.logs.map(l => ({
      id: l.id,
      vehicle_no: l.vehicle_no,
      owner_name: l.owner_name, // Now correctly populated by the scraper
      status: l.status,

      violation_checks: {
        documents_checked: l.documents_checked,
        drunk_and_drive: l.drunk_and_drive,
        suspicious_items: l.suspicious_items
      },

      echallan_summary: {
        challan_count: l.challan_count,
        total_pending_amount: l.total_pending_amount,
      },

      timestamp: l.created_at,
      driver_name: l.driver_name_enc ? decrypt(l.driver_name_enc) : 'N/A',
      driver_phone: l.driver_phone_enc ? decrypt(l.driver_phone_enc) : 'N/A',
      photo_url: l.photo_url,
      remarks: l.remarks
    }));

    res.json({
      success: true,
      totalPages: Math.ceil(result.total / limit),
      currentPage: page,
      data: safeData
    });

  } catch (err) {
    logger.error('Checkpost history error', {
      message: err.message,
      checkpost_id: req.user?.checkpost_id
    });
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};