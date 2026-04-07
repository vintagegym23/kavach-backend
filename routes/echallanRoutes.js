const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const Log = require('../models/Log');
const echallanService = require('../services/echallanService');
const { captchaLimiter } = require('../middlewares/rateLimiter');
const logger = require('../utils/logger');

const router = express.Router();

router.post('/init', captchaLimiter, auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    const { vehicle_no } = req.body;
    if (!vehicle_no) return res.status(400).json({ success: false, error: 'Vehicle number required' });

    const result = await echallanService.initEchallan(vehicle_no);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });

    res.json(result);
  } catch (err) {
    logger.error('E-Challan Init Error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

router.post('/fetch', captchaLimiter, auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    const { sessionId, captchaAnswer, log_id } = req.body;
    if (!sessionId || !captchaAnswer || !log_id) {
      return res.status(400).json({ success: false, error: 'Missing required data' });
    }

    const result = await echallanService.fetchEchallan(sessionId, captchaAnswer);

    if (!result.success) return res.status(400).json({ success: false, error: result.error });

    await Log.updateEchallan(
      log_id,
      result.challanCount || 0,
      result.totalPendingAmount || 0,
      result.ownerName || 'Unknown'
    );

    res.json({
      success: true,
      type: result.type || 'CHALLANS_FOUND',
      ownerName: result.ownerName || null,
      challanCount: result.challanCount || 0,
      totalPendingAmount: result.totalPendingAmount || 0
    });

  } catch (err) {
    logger.error('E-Challan Fetch Error', { message: err.message });
    res.status(500).json({ success: false, error: err.message.includes('finalized') ? err.message : 'Server error' });
  }
});

module.exports = router;
