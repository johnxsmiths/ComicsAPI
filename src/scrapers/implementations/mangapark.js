import * as cheerio from 'cheerio';
import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';
import { headlessHelper } from '../headless.helper.js';
import { ImageProxy } from '../../utils/imageProxy.js';

/**
 * Scraper implementation for MangaPark (https://mangapark.net / https://mangapark.org).
 * Updated for search parameter `word` and GraphQL/Puppeteer fallback.
 */
export class MangaParkScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'mangapark',
      siteName: 'MangaPark',
      baseUrl: 'https://mangapark.net',
      requiresHeadless: false,
      rateLimitMs: 250
    });
    this.fallbackDomains = ['https://mangapark.net', 'https://mangapark.org', 'https://mangapark.com'];
  }

  /**
   * Search MangaPark catalog.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      // 1. Static HTML parsing with ?word= query parameter
      for (const domain of this.fallbackDomains) {
        try {
          const html = await this.httpClient.get(`${domain}/search`, {
            params: { word: query },
            headers: {
              'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Safari/537.36',
              'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
              'Referer': domain
            }
          }).then(res => res.data).catch(() => null);

          if (html && typeof html === 'string' && !html.includes('Redirecting...')) {
            const $ = cheerio.load(html);
            const results = [];

            $('a[href*="/title/"], a[href*="/comic/"]').each((_, el) => {
              const href = $(el).attr('href');
              const title = $(el).text().replace(/\s+/g, ' ').trim();
              const rawCoverUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

              const mangaId = href ? href.replace(/^\//, '').split('/')[1] || href.replace(/^\//, '') : null;

              if (mangaId && title && title.length > 1 && !results.some(r => r.id === mangaId)) {
                const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 80, width: 256 }) : null;
                results.push(formatSearchResultItem({
                  id: mangaId,
                  siteId: this.siteId,
                  title,
                  coverUrl,
                  genres: ['Manga'],
                  status: 'ONGOING',
                  latestChapter: null
                }));
              }
            });

            if (results.length > 0) return results;
          }
        } catch (e) {
          // try next domain
        }
      }

      // 2. Headless Puppeteer fallback for Cloudflare bypass
      const searchUrl = `${this.baseUrl}/search?word=${encodeURIComponent(query)}`;
      const results = await headlessHelper.executePageTask(searchUrl, async (page) => {
        await page.waitForSelector('a[href*="/title/"], a[href*="/comic/"]', { timeout: 12000 }).catch(() => null);
        
        return page.evaluate((sId) => {
          const items = [];
          document.querySelectorAll('a[href*="/title/"], a[href*="/comic/"]').forEach((el) => {
            const href = el.getAttribute('href');
            const title = el.textContent.trim();
            const img = el.querySelector('img');
            const coverUrl = img ? (img.getAttribute('src') || img.getAttribute('data-src')) : null;

            const mangaId = href ? href.replace(/^\//, '').split('/')[1] || href.replace(/^\//, '') : null;

            if (mangaId && title && title.length > 2 && !items.some(i => i.id === mangaId)) {
              items.push({
                id: mangaId,
                siteId: sId,
                title,
                coverUrl,
                genres: ['Manga'],
                status: 'ONGOING',
                latestChapter: null
              });
            }
          });
          return items;
        }, this.siteId);
      });

      return results.map(item => {
        if (item.coverUrl) item.coverUrl = ImageProxy.buildWsrvUrl(item.coverUrl, { quality: 80, width: 256 });
        return formatSearchResultItem(item);
      });
    } catch (error) {
      throw new Error(`[MangaPark Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load deep metadata and chapter list for a MangaPark title ID.
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      const targetUrl = `${this.baseUrl}/title/${mangaId}`;
      const html = await this.fetchUrl(targetUrl).catch(() => null);

      if (html) {
        const $ = cheerio.load(html);
        const title = $('h1, h2, .text-xl').first().text().trim() || mangaId;
        const description = $('.limit-html, .desc').text().trim();
        const rawCoverUrl = $('img[src*="cover"], img[src*="mangapark"]').first().attr('src');
        const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 85 }) : null;

        const chapters = [];
        $('a[href*="/chapter/"]').each((_, el) => {
          const href = $(el).attr('href') || '';
          const chNum = $(el).text().trim();
          const chId = href ? href.split('/chapter/')[1] || href : null;

          if (chId && !chapters.some(c => c.id === chId)) {
            chapters.push({
              id: chId,
              chapterNumber: chNum.replace(/[^0-9.]/g, '') || '0',
              title: chNum,
              releaseDate: null,
              scanGroup: 'MangaPark'
            });
          }
        });

        return formatMangaDetails({
          id: mangaId,
          siteId: this.siteId,
          title,
          altTitles: [],
          description,
          coverUrl,
          author: 'Unknown Author',
          status: 'ONGOING',
          genres: ['Manga'],
          chapters
        });
      }

      // Headless fallback
      const data = await headlessHelper.executePageTask(targetUrl, async (page) => {
        await page.waitForSelector('h1, h2', { timeout: 12000 }).catch(() => null);

        return page.evaluate((mId, sId) => {
          const title = document.querySelector('h1, h2, .text-xl')?.textContent?.trim() || mId;
          const description = document.querySelector('.limit-html, .desc')?.textContent?.trim() || '';
          const coverImg = document.querySelector('img[src*="cover"], img[src*="mangapark"]');
          const coverUrl = coverImg ? (coverImg.getAttribute('src') || coverImg.getAttribute('data-src')) : null;

          const chapters = [];
          document.querySelectorAll('a[href*="/chapter/"]').forEach((el) => {
            const href = el.getAttribute('href');
            const chNum = el.textContent.trim();
            const chId = href ? href.split('/chapter/')[1] || href : null;

            if (chId && !chapters.some(c => c.id === chId)) {
              chapters.push({
                id: chId,
                chapterNumber: chNum.replace(/[^0-9.]/g, '') || '0',
                title: chNum,
                releaseDate: null,
                scanGroup: 'MangaPark'
              });
            }
          });

          return {
            id: mId,
            siteId: sId,
            title,
            description,
            coverUrl,
            chapters
          };
        }, mangaId, this.siteId);
      });

      if (data.coverUrl) {
        data.coverUrl = ImageProxy.buildWsrvUrl(data.coverUrl, { quality: 85 });
      }

      return formatMangaDetails({
        ...data,
        altTitles: [],
        author: 'Unknown Author',
        status: 'ONGOING',
        genres: ['Manga']
      });
    } catch (error) {
      throw new Error(`[MangaPark Scraper] Failed to fetch details for "${mangaId}": ${error.message}`);
    }
  }

  /**
   * Fetch chapter page image URLs.
   * @param {string} mangaId
   * @param {string} chapterId
   * @returns {Promise<import('../../models/manga.model.js').ChapterPages>}
   */
  async getChapterPages(mangaId, chapterId) {
    try {
      const targetUrl = `${this.baseUrl}/title/${mangaId}/chapter/${chapterId}`;
      const html = await this.fetchUrl(targetUrl).catch(() => null);

      if (html) {
        const $ = cheerio.load(html);
        const pages = [];
        $('img[src*="mangapark"], img[src*="cdn"], .reader-img img').each((idx, el) => {
          const rawUrl = $(el).attr('src') || $(el).attr('data-src');
          if (rawUrl && rawUrl.startsWith('http')) {
            const optimizedUrl = ImageProxy.buildWsrvUrl(rawUrl, { quality: 80, output: 'webp' });
            pages.push({
              page: idx + 1,
              url: optimizedUrl,
              headers: { Referer: this.baseUrl }
            });
          }
        });

        if (pages.length > 0) {
          return formatChapterPages({
            siteId: this.siteId,
            mangaId,
            chapterId,
            chapterNumber: '0',
            pages
          });
        }
      }

      // Headless fallback
      const pages = await headlessHelper.executePageTask(targetUrl, async (page) => {
        await page.waitForSelector('img[src*="mangapark"], img[src*="cdn"]', { timeout: 15000 }).catch(() => null);

        return page.evaluate(() => {
          const list = [];
          document.querySelectorAll('img[src*="mangapark"], img[src*="cdn"], .reader-img img').forEach((img, idx) => {
            const url = img.getAttribute('src') || img.getAttribute('data-src');
            if (url && url.startsWith('http')) {
              list.push({ page: idx + 1, url });
            }
          });
          return list;
        });
      });

      const formattedPages = pages.map((p, idx) => ({
        page: idx + 1,
        url: ImageProxy.buildWsrvUrl(p.url, { quality: 80, output: 'webp' }),
        headers: { Referer: this.baseUrl }
      }));

      return formatChapterPages({
        siteId: this.siteId,
        mangaId,
        chapterId,
        chapterNumber: '0',
        pages: formattedPages
      });
    } catch (error) {
      throw new Error(`[MangaPark Scraper] Failed to fetch pages for chapterId "${chapterId}": ${error.message}`);
    }
  }
}
