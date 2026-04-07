const logger = require('../utils/logger');

module.exports = function (allowedRoles = []) {
  return (req, res, next) => {
    if (!req.user || !req.user.role || typeof req.user.role !== 'string') {
      logger.warn('Unauthorized role access attempt', {
        role: req.user?.role,
        path: req.path
      });
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    if (!allowedRoles.includes(req.user.role)) {
      logger.warn('Insufficient permissions attempt', {
        role: req.user.role,
        path: req.path
      });
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }

    next();
  };
};
