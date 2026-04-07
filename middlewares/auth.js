const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

// Valid audiences that this middleware accepts.
// Checkpost and admin tokens each carry a different audience claim.
const VALID_AUDIENCES = ['kavach-checkpost', 'kavach-admin'];

module.exports = function (req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    logger.warn('Authorization header missing', { ip: req.ip, path: req.path });
    return res.status(401).json({
      success: false,
      error: 'Authorization token missing'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET, {
      algorithms: ['HS256'],
      issuer: 'kavach-backend',
      audience: VALID_AUDIENCES
    });

    if (!decoded || !decoded.role || !decoded.type) {
      logger.warn('Malformed token payload', { ip: req.ip, path: req.path });
      return res.status(401).json({
        success: false,
        error: 'Invalid token structure'
      });
    }

    req.user = decoded;
    next();

  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      logger.warn('Expired token attempt', { ip: req.ip, path: req.path });
      return res.status(401).json({ success: false, error: 'Token expired' });
    }

    if (err.name === 'JsonWebTokenError') {
      logger.warn('Invalid token attempt', { ip: req.ip, path: req.path, reason: err.message });
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    logger.warn('Token verification error', { ip: req.ip, path: req.path, reason: err.message });
    return res.status(401).json({ success: false, error: 'Invalid token' });
  }
};
