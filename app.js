const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const logger = require('./utils/logger');
const { globalLimiter } = require('./middlewares/rateLimiter');

// Routes
const authRoutes = require('./routes/authRoutes');
const scanRoutes = require('./routes/scanRoutes');
const logRoutes = require('./routes/logRoutes');
const adminRoutes = require('./routes/adminRoutes');
const echallanRoutes = require('./routes/echallanRoutes');
const logChallansRoutes = require('./routes/logChallans');
const ticketRoutes = require('./routes/ticketRoutes');

const app = express();

/* ---------------------------------------------------
   HEALTH CHECK — before CORS/auth, for UptimeRobot
--------------------------------------------------- */
app.get('/', (req, res) => {
  res.json({ status: 'ok', service: 'KAVACH API', timestamp: new Date().toISOString() });
});

/* ---------------------------------------------------
   SECURITY HEADERS & FINGERPRINT
--------------------------------------------------- */
app.disable('x-powered-by');

app.use(
  helmet({
    crossOriginEmbedderPolicy: false
  })
);

app.use(compression());

/* ---------------------------------------------------
   CORS — Multi-origin whitelist, no wildcard bypass
--------------------------------------------------- */
const allowedOrigins = process.env.FRONTEND_URL
  ? process.env.FRONTEND_URL.split(',').map(o => o.trim()).filter(Boolean)
  : [];

app.use(
  cors({
    origin: function (origin, callback) {
      // No Origin header = server-to-server (UptimeRobot, mobile apps, curl) — always allow
      if (!origin) return callback(null, true);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      logger.warn('Blocked by CORS', { origin });
      return callback(new Error('Not allowed by CORS'));
    },
    credentials: true
  })
);

/* ---------------------------------------------------
   BODY PARSING
--------------------------------------------------- */
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

/* ---------------------------------------------------
   STRUCTURED HTTP LOGGING
--------------------------------------------------- */
app.use(
  morgan('combined', {
    stream: { write: (msg) => logger.info(msg.trim()) }
  })
);

/* ---------------------------------------------------
   RATE LIMITING
--------------------------------------------------- */
app.use(globalLimiter);

/* ---------------------------------------------------
   ROUTES
--------------------------------------------------- */
app.use('/api/auth', authRoutes);
app.use('/api/scan', scanRoutes);
app.use('/api/logs', logChallansRoutes);
app.use('/api/logs', logRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/echallan', echallanRoutes);
app.use('/api/tickets', ticketRoutes);

/* ---------------------------------------------------
   404 HANDLER
--------------------------------------------------- */
app.use((req, res) => {
  logger.warn('Route not found', { path: req.path, method: req.method });
  res.status(404).json({ success: false, error: 'Route not found' });
});

/* ---------------------------------------------------
   GLOBAL ERROR HANDLER
--------------------------------------------------- */
app.use((err, req, res, next) => {
  logger.error('Unhandled error', {
    message: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal Server Error' : err.message
  });
});

module.exports = app;
