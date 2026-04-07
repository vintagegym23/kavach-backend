const express = require('express');
const auth = require('../middlewares/auth');
const roleCheck = require('../middlewares/roleCheck');
const Ticket = require('../models/Ticket');
const logger = require('../utils/logger');

const router = express.Router();

const VALID_ISSUE_TYPES = [
  'Breath Analyzer not working',
  'Popilon connector issue',
  'DD Machine unavailable',
  'Network issue',
  'Device malfunction',
  'Other'
];

/**
 * PWA: Raise a ticket
 * POST /api/tickets
 */
router.post('/', auth, async (req, res) => {
  try {
    const { issue_type, description } = req.body;
    const checkpost_id = req.user.checkpost_id;

    if (!checkpost_id) {
      return res.status(403).json({ success: false, error: 'Only checkpost users can raise tickets' });
    }

    if (!issue_type || !VALID_ISSUE_TYPES.includes(issue_type)) {
      return res.status(400).json({ success: false, error: 'Invalid issue type' });
    }

    const ticket = await Ticket.create({
      checkpost_id,
      location: req.body.location || '',
      issue_type,
      description: description || ''
    });

    res.status(201).json({ success: true, ticket });
  } catch (err) {
    logger.error('Create ticket error', { message: err.message, user: req.user?.checkpost_id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Admin: List tickets
 * GET /api/tickets?status=active|closed
 */
router.get('/', auth, roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']), async (req, res) => {
  try {
    const { status } = req.query;
    const validStatus = ['active', 'closed'].includes(status) ? status : null;
    const tickets = await Ticket.findAll(validStatus ? { status: validStatus } : {});
    res.json({ success: true, data: tickets });
  } catch (err) {
    logger.error('List tickets error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Admin: Active ticket count (for bell red dot)
 * GET /api/tickets/count
 */
router.get('/count', auth, roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']), async (req, res) => {
  try {
    const count = await Ticket.countActive();
    res.json({ success: true, count });
  } catch (err) {
    logger.error('Ticket count error', { message: err.message });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

/**
 * Admin: Update ticket status
 * PATCH /api/tickets/:id/status
 */
router.patch('/:id/status', auth, roleCheck(['SP', 'DSP', 'ASP', 'ADMIN']), async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!['active', 'closed'].includes(status)) {
      return res.status(400).json({ success: false, error: 'Status must be active or closed' });
    }

    const ticket = await Ticket.updateStatus(parseInt(id, 10), status);
    if (!ticket) {
      return res.status(404).json({ success: false, error: 'Ticket not found' });
    }

    res.json({ success: true, ticket });
  } catch (err) {
    logger.error('Update ticket status error', { message: err.message, id: req.params.id });
    res.status(500).json({ success: false, error: 'Server error' });
  }
});

module.exports = router;
