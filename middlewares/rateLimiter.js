const rateLimit = require('express-rate-limit');

/* ======================================================
   GLOBAL API LIMIT
   Prevent overall flooding
====================================================== */
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 1000, // max 1000 requests per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  }
});

/* ======================================================
   LOGIN LIMIT
   Protect against brute force
====================================================== */
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // 5 login attempts
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many login attempts. Try again after 15 minutes.'
  }
});

/* ======================================================
   CAPTCHA / SCRAPER LIMIT
====================================================== */
const captchaLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  max: 20,
  message: {
    success: false,
    error: 'Too many verification attempts.'
  }
});

module.exports = {
  globalLimiter,
  loginLimiter,
  captchaLimiter
};
