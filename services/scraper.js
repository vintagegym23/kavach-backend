const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const logger = require('../utils/logger');

puppeteer.use(StealthPlugin());

let browser = null;
const sessions = new Map();
const SESSION_TIMEOUT_MS = 2 * 60 * 1000;
const MAX_CONCURRENT_SESSIONS = 5; // Each session holds a live browser page (~50-100 MB)

async function getBrowser() {
  if (browser && browser.isConnected()) return browser;

  browser = await puppeteer.launch({
    headless: "new",
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--window-size=1280,800'
    ]
  });

  // When Chromium crashes, clear all stale sessions so they don't block new ones
  browser.on('disconnected', () => {
    logger.warn('Puppeteer browser disconnected — clearing stale sessions', {
      stale_sessions: sessions.size
    });
    for (const [id, s] of sessions) {
      clearTimeout(s.timer);
      sessions.delete(id);
    }
    browser = null;
  });

  return browser;
}

async function startScrapingSession(vehicleNumber) {
  if (sessions.size >= MAX_CONCURRENT_SESSIONS) {
    logger.warn('Scraper session cap reached', { active: sessions.size, cap: MAX_CONCURRENT_SESSIONS });
    return { success: false, error: 'Server busy. Try again in a moment.' };
  }

  const sessionId = Date.now() + '_' + Math.random().toString(36).slice(2);
  let page = null;

  try {
    const browserInstance = await getBrowser();
    page = await browserInstance.newPage();

    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    await page.goto('https://echallan.tspolice.gov.in/publicview/', {
      waitUntil: 'networkidle2',
      timeout: 60000
    });

    await page.waitForSelector('#REG_NO', { timeout: 20000 });
    await page.type('#REG_NO', vehicleNumber, { delay: 60 });

    await page.waitForSelector('#captchaDivtab1', { timeout: 10000 });

    // Wait for captcha image to fully render before screenshotting
    await new Promise(r => setTimeout(r, 2000));

    const captchaContainer = await page.$('#captchaDivtab1');
    if (!captchaContainer) throw new Error('Captcha container not found');

    const captchaImage = await captchaContainer.screenshot({ encoding: 'base64' });

    const timer = setTimeout(async () => {
      try {
        if (sessions.has(sessionId)) {
          const s = sessions.get(sessionId);
          if (!s.page.isClosed()) await s.page.close();
          sessions.delete(sessionId);
        }
      } catch (e) {}
    }, SESSION_TIMEOUT_MS);

    sessions.set(sessionId, { page, timer });

    return {
      success: true,
      sessionId,
      captchaImage: `data:image/png;base64,${captchaImage}`
    };

  } catch (err) {
    if (page) await page.close().catch(() => {});
    logger.error('Session Start Failed', { message: err.message });
    return { success: false, error: err.message };
  }
}

async function submitCaptchaAndFetch(sessionId, captchaAnswer) {
  const session = sessions.get(sessionId);
  if (!session) return { success: false, error: 'Session expired' };

  const { page, timer } = session;
  clearTimeout(timer);

  try {
    await page.waitForSelector('#captchatab1');
    await page.type('#captchatab1', captchaAnswer, { delay: 50 });

    await Promise.all([
      page.click('#tab1btn'),
      page.waitForFunction(() =>
        document.querySelector('#rtable') ||
        document.body.innerText.includes('Invalid Captcha') ||
        document.body.innerText.toLowerCase().includes('no pending challan') ||
        document.body.innerText.toLowerCase().includes('no challan found'),
        { timeout: 20000 }
      )
    ]);

    const invalidCaptcha = await page.evaluate(() =>
      document.body.innerText.includes('Invalid Captcha')
    );
    if (invalidCaptcha) throw new Error('Invalid Captcha');

    // Zero-challan detection — vehicle exists but has no pending challans
    const hasNoChallans = await page.evaluate(() => {
      const text = document.body.innerText.toLowerCase();
      return text.includes('no pending challan') || text.includes('no challan found');
    });

    if (hasNoChallans) {
      await page.close().catch(() => {});
      sessions.delete(sessionId);
      return {
        success: true,
        type: 'ZERO_CHALLANS',
        ownerName: null,
        challanCount: 0,
        totalPendingAmount: 0
      };
    }

    const result = await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('#rtable tr'));
      let ownerName = 'Unknown';
      for (const row of rows) {
        if (row.innerText.includes('Owner Name')) {
          const cells = row.querySelectorAll('td, th');
          ownerName = cells[cells.length - 1]?.innerText?.trim() || ownerName;
        }
      }
      const challanRows = rows.filter(r => {
        const tds = r.querySelectorAll('td');
        return tds.length > 10 && /^[A-Z0-9]{6,}/.test(tds[3]?.innerText || '');
      });
      const lastRow = rows[rows.length - 1];
      const nums = Array.from(lastRow.querySelectorAll('td'))
        .map(td => td.innerText.replace(/[^0-9]/g, ''))
        .filter(Boolean)
        .map(Number);
      const totalPendingAmount = nums.length ? nums[nums.length - 1] : 0;
      return { ownerName, challanCount: challanRows.length, totalPendingAmount };
    });

    await page.close().catch(() => {});
    sessions.delete(sessionId);

    return { success: true, type: 'CHALLANS_FOUND', ...result };

  } catch (err) {
    if (page) await page.close().catch(() => {});
    sessions.delete(sessionId);
    logger.error('Fetch Failed', { message: err.message });
    return { success: false, error: err.message };
  }
}

process.on('SIGINT', async () => {
  if (browser) await browser.close();
  process.exit(0);
});

module.exports = { startScrapingSession, submitCaptchaAndFetch };
