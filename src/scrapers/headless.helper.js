import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

/**
 * Serverless-optimized Puppeteer / Chromium helper for Javascript-heavy or Cloudflare-protected sites.
 */
class HeadlessBrowserManager {
  constructor() {
    this.browser = null;
  }

  /**
   * Launch or reuse a serverless-optimized Chromium browser instance.
   */
  async getBrowser() {
    if (this.browser && this.browser.isConnected()) {
      return this.browser;
    }

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

    let executablePath;
    if (isLambda) {
      executablePath = await chromium.executablePath();
    } else {
      // Local fallback paths for testing
      executablePath = process.env.CHROME_PATH || 
        (process.platform === 'win32' 
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome');
    }

    this.browser = await puppeteer.launch({
      args: isLambda ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      defaultViewport: chromium.defaultViewport,
      executablePath: executablePath,
      headless: isLambda ? chromium.headless : true,
      ignoreHTTPSErrors: true
    });

    return this.browser;
  }

  /**
   * Open a target page, set stealth headers, execute page parsing, and clean up memory.
   * Disables image, font, and stylesheet loading to speed up scraping and keep Lambda memory usage low.
   * 
   * @param {string} url - Target URL to load
   * @param {Function} parserFn - Async callback receives Puppeteer page object
   * @returns {Promise<any>}
   */
  async executePageTask(url, parserFn) {
    const browser = await this.getBrowser();
    const page = await browser.newPage();

    try {
      // Set realistic user agent & viewport
      await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
      await page.setViewport({ width: 1280, height: 800 });

      // Enable request interception to skip heavy media assets
      await page.setRequestInterception(true);
      page.on('request', (req) => {
        const resourceType = req.resourceType();
        if (['image', 'stylesheet', 'font', 'media'].includes(resourceType)) {
          req.abort();
        } else {
          req.continue();
        }
      });

      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
      const result = await parserFn(page);
      return result;
    } finally {
      if (page && !page.isClosed()) {
        await page.close();
      }
    }
  }

  /**
   * Close the browser instance cleanly on process termination.
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close();
      this.browser = null;
    }
  }
}

export const headlessHelper = new HeadlessBrowserManager();
