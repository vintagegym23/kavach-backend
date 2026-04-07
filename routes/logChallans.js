const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const logger = require('../utils/logger');
const Log = require('../models/Log');

const router = express.Router();

/**
 * GET Challan Details for a Log
 * GET /api/logs/:logId/challans
 */
router.get('/:logId/challans', auth, roleCheck(['CHECKPOST', 'ADMIN']), async (req, res) => {
  try {
    const logId = parseInt(req.params.logId, 10);
    if (!logId || logId < 1) {
      return res.status(400).json({ success: false, error: 'Invalid log ID' });
    }

    // Fetch the log from DB (mocked if not present)
    const log = await Log.findById(logId);
    if (!log) {
      return res.status(404).json({ success: false, error: 'Log not found' });
    }

    // Normally fetch challans associated with this log
    // Placeholder for now
    const data = {
      vehicleNo: log.vehicle_no || 'UNKNOWN',
      ownerName: log.driver_name_enc ? 'REDACTED' : 'Unknown Owner',
      totalPending: log.echallan_summary?.total_pending_amount || 0,
      challanCount: log.echallan_summary?.challan_count || 0,
      challans: log.challans || [] // if you store them later
    };

    res.json({ success: true, data });

  } catch (err) {
    logger.error('Fetch challans error', {
      message: err.message,
      stack: err.stack,
      params: req.params,
      user: req.user
    });

    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
