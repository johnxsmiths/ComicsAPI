import axios from 'axios';
import { wrapper } from 'axios-cookiejar-support';
import { CookieJar } from 'tough-cookie';

/**
 * Base abstract scraper class with CookieJar persistence & Cloudflare headers support.
 */
export class BaseScraper {
  /**
   * @param {Object} options
   * @param {string} options.siteId - Unique identifier key for site registry
   * @param {string} options.siteName - Display name of comic source
   * @param {string} options.baseUrl - Base domain URL
   * @param {boolean} [options.requiresHeadless=false]
   * @param {number} [options.rateLimitMs=200]
   */
  constructor({ siteId, siteName, baseUrl, requiresHeadless = false, rateLimitMs = 200 }) {
    if (new.target === BaseScraper) {
      throw new TypeError('Cannot construct BaseScraper instances directly. Extend it instead.');
    }

    this.siteId = siteId;
    this.siteName = siteName;
    this.baseUrl = baseUrl;
    this.requiresHeadless = requiresHeadless;
    this.rateLimitMs = rateLimitMs;
    this.jar = new CookieJar();

    // Axios client wrapped with CookieJar support for persistent Cloudflare sessions
    this.httpClient = wrapper(axios.create({
      baseURL: this.baseUrl,
      jar: this.jar,
      withCredentials: true,
      timeout: parseInt(process.env.HTTP_TIMEOUT_MS || '15000', 10),
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
        'Cache-Control': 'no-cache',
        'Sec-Ch-Ua': '"Google Chrome";v="123", "Not:A-Brand";v="8"',
        'Sec-Ch-Ua-Mobile': '?0',
        'Sec-Ch-Ua-Platform': '"Windows"'
      }
    }));
  }

  /**
   * Standard headers builder for static or CDN requests.
   */
  getStandardHeaders(customHeaders = {}) {
    return {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
      'Referer': this.baseUrl,
      ...customHeaders
    };
  }

  /**
   * Search for manga matching query.
   * @param {string} query
   * @returns {Promise<Array<import('../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    throw new Error(`[${this.siteId}] search() method not implemented.`);
  }

  /**
   * Fetch deep metadata and chapter list for a manga ID.
   * @param {string} mangaId
   * @returns {Promise<import('../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    throw new Error(`[${this.siteId}] getDetails() method not implemented.`);
  }

  /**
   * Fetch page image URLs or PDF/EPUB document for a chapter.
   * @param {string} mangaId
   * @param {string} chapterId
   * @returns {Promise<import('../models/manga.model.js').ChapterPages>}
   */
  async getChapterPages(mangaId, chapterId) {
    throw new Error(`[${this.siteId}] getChapterPages() method not implemented.`);
  }

  /**
   * Execute GET request with cookie persistence & backoff retries.
   */
  async fetchUrl(url, config = {}) {
    let retries = 2;
    while (retries >= 0) {
      try {
        const response = await this.httpClient.get(url, config);
        return response.data;
      } catch (err) {
        if (retries === 0) throw err;
        retries--;
        await new Promise(res => setTimeout(res, 400));
      }
    }
  }
}
