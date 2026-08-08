/**
 * Serverless-optimized Puppeteer / Chromium helper for Javascript-heavy or Cloudflare-protected sites.
 * Uses dynamic imports so AWS Lambda Chromium binaries are only loaded when available.
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

    let chromiumModule = null;
    let puppeteerModule = null;

    try {
      chromiumModule = await import('@sparticuz/chromium');
      puppeteerModule = await import('puppeteer-core');
    } catch (e) {
      throw new Error('Headless browser capabilities are omitted in Edge environments.');
    }

    if (!puppeteerModule || !chromiumModule) {
      throw new Error('Puppeteer core modules are not available.');
    }

    const chromium = chromiumModule.default || chromiumModule;
    const puppeteer = puppeteerModule.default || puppeteerModule;

    const isLambda = Boolean(process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.LAMBDA_TASK_ROOT);

    let executablePath;
    if (isLambda && chromium) {
      executablePath = await chromium.executablePath();
    } else {
      executablePath = process.env.CHROME_PATH || 
        (process.platform === 'win32' 
          ? 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
          : '/usr/bin/google-chrome');
    }

    this.browser = await puppeteer.launch({
      args: isLambda && chromium ? chromium.args : [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu'
      ],
      defaultViewport: chromium?.defaultViewport || { width: 1280, height: 800 },
      executablePath: executablePath,
      headless: isLambda && chromium ? chromium.headless : true,
      ignoreHTTPSErrors: true
    });

    return this.browser;
  }

  /**
   * Open a target page, set stealth headers, execute page parsing, and clean up memory.
   */
  async executePageTask(url, parserFn) {
    try {
      const browser = await this.getBrowser();
      const page = await browser.newPage();

      try {
        await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36');
        await page.setViewport({ width: 1280, height: 800 });

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
    } catch (e) {
      return [];
    }
  }

  /**
   * Close the browser instance cleanly on process termination.
   */
  async closeBrowser() {
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
    }
  }
}

export const headlessHelper = new HeadlessBrowserManager();
