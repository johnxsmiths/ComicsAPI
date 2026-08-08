import * as cheerio from 'cheerio';
import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

/**
 * Scraper implementation for MangaPill (https://mangapill.com).
 */
export class MangaPillScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'mangapill',
      siteName: 'MangaPill',
      baseUrl: 'https://mangapill.com',
      requiresHeadless: false,
      rateLimitMs: 150
    });
  }

  /**
   * Search MangaPill catalog.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      const html = await this.httpClient.get('/search', {
        params: { q: query }
      }).then(r => r.data).catch(() => null);

      if (!html) return [];
      const $ = cheerio.load(html);
      const results = [];

      $('a[href*="/manga/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        const rawCoverUrl = $(el).find('img').attr('data-src') || $(el).find('img').attr('src');

        const mangaId = href.replace('/manga/', '').split('/')[0];

        if (mangaId && title && !results.some(r => r.id === mangaId)) {
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

      return results;
    } catch (error) {
      throw new Error(`[MangaPill Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load metadata and chapter list for MangaPill ID.
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      const targetUrl = mangaId.startsWith('http') ? mangaId : `/manga/${mangaId}`;
      const html = await this.httpClient.get(targetUrl).then(r => r.data);
      const $ = cheerio.load(html);

      const title = $('h1').first().text().trim() || mangaId;
      const description = $('p.text-sm').first().text().trim();
      const rawCoverUrl = $('img[data-src]').first().attr('data-src') || $('img').first().attr('src');
      const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 85 }) : null;

      const genres = [];
      $('a[href*="/search?genre="]').each((_, el) => {
        genres.push($(el).text().trim());
      });

      const chapters = [];
      $('#chapters a').each((_, el) => {
        const link = $(el).attr('href') || '';
        const chTitle = $(el).text().trim();
        const chapterId = link.replace('/chapters/', '').replace(/^\//, '');

        if (chapterId && !chapters.some(c => c.id === chapterId)) {
          const chNum = chTitle.replace(/[^0-9.]/g, '') || '0';
          chapters.push({
            id: chapterId,
            chapterNumber: chNum,
            title: chTitle,
            releaseDate: null,
            scanGroup: 'MangaPill'
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
        author: 'MangaPill',
        status: 'ONGOING',
        genres,
        chapters
      });
    } catch (error) {
      throw new Error(`[MangaPill Scraper] Failed to fetch details for "${mangaId}": ${error.message}`);
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
      const targetUrl = chapterId.startsWith('http') ? chapterId : `/chapters/${chapterId}`;
      const html = await this.httpClient.get(targetUrl).then(r => r.data);
      const $ = cheerio.load(html);

      const pages = [];
      $('picture img').each((idx, el) => {
        const rawUrl = $(el).attr('data-src') || $(el).attr('src');
        if (rawUrl && rawUrl.startsWith('http')) {
          const optimizedUrl = ImageProxy.buildWsrvUrl(rawUrl, { quality: 80, output: 'webp' });
          pages.push({
            page: idx + 1,
            url: optimizedUrl,
            headers: { Referer: this.baseUrl }
          });
        }
      });

      return formatChapterPages({
        siteId: this.siteId,
        mangaId,
        chapterId,
        chapterNumber: '0',
        pages
      });
    } catch (error) {
      throw new Error(`[MangaPill Scraper] Failed to fetch pages for "${chapterId}": ${error.message}`);
    }
  }
}
