const { startScrapingSession, submitCaptchaAndFetch } = require('./scraper');

async function initEchallan(vehicleNo) {
  return await startScrapingSession(vehicleNo);
}

async function fetchEchallan(sessionId, captchaAnswer) {
  return await submitCaptchaAndFetch(sessionId, captchaAnswer);
}

module.exports = {
  initEchallan,
  fetchEchallan
};
