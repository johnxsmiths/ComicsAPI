import * as cheerio from 'cheerio';
import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

/**
 * Scraper implementation for Asura Scans / Asura Comic (https://asuracomic.net).
 * Updated for Astro v5 dynamic DOM structure with /browse?search= and /comics/ links.
 */
export class AsuraScansScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'asurascans',
      siteName: 'Asura Scans',
      baseUrl: 'https://asuracomic.net',
      requiresHeadless: false,
      rateLimitMs: 200
    });
  }

  /**
   * Search Asura Scans catalog.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      const searchUrl = `/browse?search=${encodeURIComponent(query)}`;
      const html = await this.fetchUrl(searchUrl);
      const $ = cheerio.load(html);
      const results = [];

      $('a[href*="/comics/"]').each((_, el) => {
        const href = $(el).attr('href');
        let title = $(el).text().replace(/\s+/g, ' ').trim();
        const rawCoverUrl = $(el).find('img').attr('src') || $(el).find('img').attr('data-src');

        // Strip leading rating numbers like "9.1Solo Farming..."
        title = title.replace(/^[0-9.]+\s*/, '');

        if (href && title && title.length > 1 && !href.includes('/chapter/')) {
          const comicId = href.replace('/comics/', '').split('/')[0];

          if (comicId && !results.some(r => r.id === comicId)) {
            const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 80, width: 256 }) : null;
            results.push(formatSearchResultItem({
              id: comicId,
              siteId: this.siteId,
              title,
              coverUrl,
              genres: ['Action', 'Manhwa'],
              status: 'ONGOING',
              latestChapter: null
            }));
          }
        }
      });

      return results;
    } catch (error) {
      throw new Error(`[Asura Scans Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load deep metadata and chapter list for an Asura Scans comic ID.
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      const targetUrl = mangaId.startsWith('http') ? mangaId : `/comics/${mangaId}`;
      const html = await this.fetchUrl(targetUrl);
      const $ = cheerio.load(html);

      const title = $('h1, h2, div[class*="text-xl"]').first().text().trim() || mangaId;
      const description = $('p[class*="text-sm"], .desc, .entry-content').text().trim();
      const rawCoverUrl = $('img[src*="covers"]').first().attr('src');
      const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 85 }) : null;

      const genres = [];
      $('a[href*="/browse?genres="]').each((_, el) => {
        genres.push($(el).text().replace(/,/g, '').trim());
      });

      const chapters = [];
      $('a[href*="/chapter/"]').each((_, el) => {
        const $el = $(el);
        const link = $el.attr('href') || '';
        const chapterText = $el.text().replace(/\s+/g, ' ').trim();
        const releaseDate = $el.find('span').text().trim() || null;

        const chapterId = link.includes('/chapter/') 
          ? link.split('/chapter/')[1]?.split('?')[0] 
          : link.replace('/comics/', '');

        if (chapterId && !chapters.some(c => c.id === chapterId)) {
          const chNum = chapterText.match(/Chapter\s*([0-9.]+)/i)?.[1] || chapterText.replace(/[^0-9.]/g, '') || '0';
          chapters.push({
            id: `${mangaId}/chapter/${chapterId}`,
            chapterNumber: chNum,
            title: chapterText,
            releaseDate,
            scanGroup: 'Asura Scans'
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
        author: 'Asura Scans',
        status: 'ONGOING',
        genres,
        chapters: chapters.reverse()
      });
    } catch (error) {
      throw new Error(`[Asura Scans Scraper] Failed to fetch details for "${mangaId}": ${error.message}`);
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
      const targetUrl = chapterId.includes('/') ? `/comics/${chapterId}` : `/comics/${mangaId}/chapter/${chapterId}`;
      const html = await this.fetchUrl(targetUrl);
      const $ = cheerio.load(html);

      const pages = [];
      $('img[src*="asura"], img[src*="upload"], div[class*="reader"] img').each((idx, el) => {
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

      return formatChapterPages({
        siteId: this.siteId,
        mangaId,
        chapterId,
        chapterNumber: '0',
        pages
      });
    } catch (error) {
      throw new Error(`[Asura Scans Scraper] Failed to fetch chapter pages for "${chapterId}": ${error.message}`);
    }
  }
}
