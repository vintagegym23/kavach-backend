const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const Log = require('../models/Log');
const { encrypt, decrypt } = require('../services/encryption');
const multer = require('multer');
const sharp = require('sharp');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');

const {
  normalizeVehicleNumber,
  validatePhone,
  sanitizeText,
  forceBoolean
} = require('../utils/validators');
const logger = require('../utils/logger');
const { uploadToS3 } = require('../services/s3');

const router = express.Router();

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false
});

// Use memory storage — files go straight to S3, never touch disk
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 3 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.mimetype)) return cb(new Error('Only JPEG, PNG or WEBP images allowed'));
    cb(null, true);
  }
});

/**
 * CREATE LOG
 */
router.post('/create', uploadLimiter, auth, roleCheck(['CHECKPOST']), upload.single('photo'), async (req, res) => {
  try {
    const {
      vehicle_no,
      driver_name,
      driver_phone,
      driver_drunk = false,
      afis_suspect = false,
      remarks = null,
      without_number_plate = false,
      detained = false,
      property_seized = null
    } = req.body;

    const normalizedVehicle = normalizeVehicleNumber(vehicle_no);
    if (!normalizedVehicle) return res.status(400).json({ success: false, error: 'Invalid vehicle number' });

    const cleanDriverName = sanitizeText(driver_name, 100);
    const cleanDriverPhone = validatePhone(driver_phone) ? driver_phone : null;
    const cleanRemarks = sanitizeText(remarks, 500);
    const cleanProperty = sanitizeText(property_seized, 300);

    const violation_checks = {
      documents_checked: forceBoolean(req.body['violation_checks[documents_checked]']),
      drunk_and_drive: forceBoolean(req.body['violation_checks[drunk_and_drive]']),
      suspicious_items: forceBoolean(req.body['violation_checks[suspicious_items]'])
    };

    const echallan_summary = {
      challan_count: Number(req.body['echallan_summary[challan_count]']) || 0,
      total_pending_amount: Number(req.body['echallan_summary[total_pending_amount]']) || 0
    };

    let photoUrl = null;
    if (req.file) {
      const timestamp = Date.now();
      const filename = `proof-${timestamp}-${crypto.randomBytes(8).toString('hex')}.jpg`;

      try {
        const buffer = await sharp(req.file.buffer)
          .rotate()
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 75 })
          .toBuffer();
        photoUrl = await uploadToS3(buffer, filename);
      } catch (err) {
        logger.error('Log create image error', { message: err.message, user: req.user?.checkpost_id });
        return res.status(400).json({ success: false, error: 'Invalid or corrupted image' });
      }
    }

    const log = await Log.create({
      checkpost_id: req.user.checkpost_id,
      vehicle_no: normalizedVehicle,
      driver_name_enc: cleanDriverName ? encrypt(cleanDriverName) : null,
      driver_phone_enc: cleanDriverPhone ? encrypt(cleanDriverPhone) : null,
      violation_checks,
      echallan_summary,
      driver_drunk: forceBoolean(driver_drunk),
      afis_suspect: forceBoolean(afis_suspect),
      remarks: cleanRemarks,
      photo_url: photoUrl,
      without_number_plate: forceBoolean(without_number_plate),
      detained: forceBoolean(detained),
      property_seized: cleanProperty
    });

    res.json({ success: true, log_id: log.id });

  } catch (err) {
    logger.error('Log create error', { message: err.message, vehicle_no: req.body?.vehicle_no, user: req.user?.checkpost_id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * HISTORY LOGS
 */
router.get('/history', auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    let page = parseInt(req.query.page) || 1;
    let limit = Math.min(parseInt(req.query.limit) || 20, 50);
    if (page < 1) page = 1;

    const data = await Log.getByCheckpost(req.user.checkpost_id, page, limit);
    const safeData = data.logs.map(l => ({
      id: l.id,
      vehicle_no: l.vehicle_no,
      owner_name: l.owner_name || null,
      status: l.status,
      // Boolean checks — flat, no nesting
      documents_checked: !!l.documents_checked,
      drunk_and_drive: !!l.drunk_and_drive,
      driver_drunk: !!l.driver_drunk,
      suspicious_items: !!l.suspicious_items,
      afis_suspect: !!l.afis_suspect,
      without_number_plate: !!l.without_number_plate,
      detained: !!l.detained,
      // Nullable text
      property_seized: l.property_seized || null,
      remarks: l.remarks || null,
      photo_url: l.photo_url || null,
      // Challan
      challan_count: Number(l.challan_count) || 0,
      total_pending_amount: Number(l.total_pending_amount) || 0,
      // Timestamps — ISO string, always UTC
      created_at: l.created_at || null,
      // Decrypted PII
      driver_name: l.driver_name_enc ? decrypt(l.driver_name_enc) : null,
      driver_phone: l.driver_phone_enc ? decrypt(l.driver_phone_enc) : null
    }));

    res.json({
      success: true,
      totalPages: Math.ceil(data.total / limit),
      currentPage: page,
      logs: safeData
    });

  } catch (err) {
    logger.error('Checkpost history error', { message: err.message, stack: err.stack, query: req.query, user: req.user });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * CANCEL PENDING LOG
 * Deletes a log only if it is still 'pending' and belongs to the requesting checkpost.
 * Called when the officer goes back from the captcha step to correct the vehicle number.
 */
router.delete('/cancel/:logId', auth, roleCheck(['CHECKPOST']), async (req, res) => {
  try {
    const logId = parseInt(req.params.logId, 10);
    if (isNaN(logId)) return res.status(400).json({ success: false, error: 'Invalid log ID' });

    const deleted = await Log.cancelPending(logId, req.user.checkpost_id);
    if (!deleted) {
      return res.status(404).json({ success: false, error: 'Log not found or already closed' });
    }

    res.json({ success: true });
  } catch (err) {
    logger.error('Cancel log error', { message: err.message, logId: req.params?.logId, user: req.user?.checkpost_id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * CLOSE LOG
 */
router.put('/close/:logId', uploadLimiter, auth, roleCheck(['CHECKPOST']), upload.single('photo'), async (req, res) => {
  try {
    const { logId } = req.params;
    const {
      driver_name,
      driver_phone,
      flagVehicle,
      drunk_and_drive = false,
      driver_drunk = false,
      afis_suspect = false,
      suspicious_items = false,
      remarks = null,
      without_number_plate = false,
      detained = false,
      property_seized = null
    } = req.body;

    const cleanDriverName = sanitizeText(driver_name, 100);
    if (!cleanDriverName || !validatePhone(driver_phone)) {
      return res.status(400).json({ success: false, error: 'Invalid driver name or phone' });
    }

    const cleanRemarks = sanitizeText(remarks, 500);
    const cleanProperty = sanitizeText(property_seized, 300);

    let photoUrl = null;
    if (req.file) {
      const timestamp = Date.now();
      const filename = `proof-${timestamp}-${crypto.randomBytes(8).toString('hex')}.jpg`;

      try {
        const buffer = await sharp(req.file.buffer)
          .rotate()
          .resize(800, 800, { fit: 'inside' })
          .jpeg({ quality: 75 })
          .toBuffer();
        photoUrl = await uploadToS3(buffer, filename);
      } catch (err) {
        logger.error('Close log image error', { message: err.message, logId, user: req.user?.checkpost_id });
        return res.status(400).json({ success: false, error: 'Invalid or corrupted image' });
      }
    }

    await Log.updateDriverAndCloseAdvanced(parseInt(logId, 10), {
      driver_name_enc: encrypt(cleanDriverName),
      driver_phone_enc: encrypt(driver_phone),
      flag_vehicle: flagVehicle !== undefined ? forceBoolean(flagVehicle) : null,
      drunk_and_drive: forceBoolean(drunk_and_drive),
      driver_drunk: forceBoolean(driver_drunk),
      afis_suspect: forceBoolean(afis_suspect),
      suspicious_items: forceBoolean(suspicious_items),
      remarks: cleanRemarks,
      photo_url: photoUrl,
      without_number_plate: forceBoolean(without_number_plate),
      detained: forceBoolean(detained),
      property_seized: cleanProperty
    });

    res.json({ success: true, message: 'Log closed successfully' });

  } catch (err) {
    logger.error('Close log error', { message: err.message, logId: req.params?.logId, user: req.user?.checkpost_id });
    res.status(400).json({ success: false, error: err.message || 'Server error' });
  }
});

module.exports = router;
