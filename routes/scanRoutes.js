const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const scraperService = require('../services/scraper');
const Log = require('../models/Log');
const { encrypt } = require('../services/encryption');
const { captchaLimiter } = require('../middlewares/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

// Indian vehicle number: 2-letter state code + district digits + series letters + number
// Covers formats: MH12AB1234, TS09Z1234, DL1CAF1234 (no hyphens/spaces expected after strip)
const VEHICLE_NO_RE = /^[A-Z]{2}[0-9]{1,2}[A-Z]{1,3}[0-9]{1,4}$/;

function sanitizeVehicleNo(raw) {
  return String(raw || '').trim().toUpperCase().replace(/[-\s]/g, '');
}

/**
 * INIT SCAN
 */
router.post('/init', captchaLimiter, auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    const vehicleNo = sanitizeVehicleNo(req.body.vehicleNo);
    if (!vehicleNo) return res.status(400).json({ success: false, error: 'Vehicle Number is required' });
    if (!VEHICLE_NO_RE.test(vehicleNo)) {
      return res.status(400).json({ success: false, error: 'Invalid vehicle number format' });
    }

    const result = await scraperService.startScrapingSession(vehicleNo);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    res.json(result);

  } catch (err) {
    logger.error('Scan init error', { message: err.message, vehicleNo: req.body?.vehicleNo, user: req.user?.checkpost_id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * FETCH SCAN RESULT
 */
router.post('/fetch', captchaLimiter, auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    const { sessionId, captchaAnswer, driverPhone } = req.body;
    const vehicleNo = sanitizeVehicleNo(req.body.vehicleNo);
    if (!sessionId || !captchaAnswer || !vehicleNo) return res.status(400).json({ success: false, error: 'Missing data' });
    if (!VEHICLE_NO_RE.test(vehicleNo)) {
      return res.status(400).json({ success: false, error: 'Invalid vehicle number format' });
    }

    const scanResult = await scraperService.submitCaptchaAndFetch(sessionId, captchaAnswer);
    if (!scanResult.success) return res.status(400).json({ success: false, error: scanResult.error });

    const log = await Log.create({
      checkpost_id: req.user.checkpost_id,
      vehicle_no: vehicleNo,
      driver_name_enc: encrypt(scanResult.ownerName || 'Unknown'),
      driver_phone_enc: encrypt(driverPhone || ''),
      echallan_summary: {
        challan_count: scanResult.challanCount || 0,
        total_pending_amount: scanResult.totalPendingAmount || 0
      }
    });

    res.json({
      success: true,
      data: {
        log_id: log.id,
        vehicleNo,
        ownerName: scanResult.ownerName,
        challanCount: scanResult.challanCount,
        totalPending: scanResult.totalPendingAmount
      }
    });

  } catch (err) {
    logger.error('Scan fetch error', { message: err.message, vehicleNo: req.body?.vehicleNo, sessionId: req.body?.sessionId, user: req.user?.checkpost_id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
