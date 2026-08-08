import * as cheerio from 'cheerio';
import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

/**
 * Scraper implementation for MangaNato / MangaKakalot (https://manganato.com / https://chapmanganato.to).
 */
export class MangaNatoScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'manganato',
      siteName: 'MangaNato',
      baseUrl: 'https://manganato.com',
      requiresHeadless: false,
      rateLimitMs: 200
    });
    this.searchUrl = 'https://manganato.com/search/story';
  }

  /**
   * Search MangaNato for title query.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      const formattedKey = query.toLowerCase().replace(/[^a-z0-9]/g, '_');
      const html = await this.httpClient.get(`${this.searchUrl}/${formattedKey}`).then(r => r.data).catch(() => null);

      if (!html) return [];
      const $ = cheerio.load(html);
      const results = [];

      $('.panel-search-story .search-story-item').each((_, el) => {
        const $el = $(el);
        const link = $el.find('a.item-img').attr('href') || '';
        const title = $el.find('a.item-title').text().trim();
        const rawCoverUrl = $el.find('img').attr('src');
        const latestCh = $el.find('a.item-right-item').first().text().trim();

        const mangaId = link.split('/').pop() || link;

        if (mangaId && title) {
          const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 80, width: 256 }) : null;
          results.push(formatSearchResultItem({
            id: mangaId,
            siteId: this.siteId,
            title,
            coverUrl,
            genres: ['Manga'],
            status: 'ONGOING',
            latestChapter: latestCh || null
          }));
        }
      });

      return results;
    } catch (error) {
      throw new Error(`[MangaNato Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load metadata and chapter list for a MangaNato ID.
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      const targetUrl = mangaId.startsWith('http') ? mangaId : `https://manganato.com/${mangaId}`;
      const html = await this.httpClient.get(targetUrl).then(r => r.data);
      const $ = cheerio.load(html);

      const title = $('.story-info-right h1').text().trim() || mangaId;
      const description = $('#panel-story-info-description, .panel-story-info-description').text().replace(/Description :/i, '').trim();
      const rawCoverUrl = $('.story-info-left .info-image img').attr('src');
      const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 85 }) : null;

      const author = $('.table-label:contains("Author")').next().text().trim() || 'Unknown';
      const status = $('.table-label:contains("Status")').next().text().trim() || 'Ongoing';

      const genres = [];
      $('.table-label:contains("Genres")').next().find('a').each((_, el) => {
        genres.push($(el).text().trim());
      });

      const chapters = [];
      $('.row-content-chapter li').each((_, el) => {
        const $a = $(el).find('a.chapter-name');
        const link = $a.attr('href') || '';
        const chTitle = $a.text().trim();
        const releaseDate = $(el).find('.chapter-time').text().trim() || null;

        const chapterId = link.split('/').pop() || link;

        if (chapterId) {
          const chNum = chTitle.match(/Chapter\s*([0-9.]+)/i)?.[1] || '0';
          chapters.push({
            id: chapterId,
            chapterNumber: chNum,
            title: chTitle,
            releaseDate,
            scanGroup: 'MangaNato'
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
        author,
        status: status.toUpperCase(),
        genres,
        chapters
      });
    } catch (error) {
      throw new Error(`[MangaNato Scraper] Failed to fetch details for "${mangaId}": ${error.message}`);
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
      const targetUrl = chapterId.startsWith('http') ? chapterId : `https://chapmanganato.to/${chapterId}`;
      const html = await this.httpClient.get(targetUrl, {
        headers: { Referer: 'https://chapmanganato.to/' }
      }).then(r => r.data);

      const $ = cheerio.load(html);
      const pages = [];

      $('.container-chapter-reader img').each((idx, el) => {
        const rawUrl = $(el).attr('src') || $(el).attr('data-src');
        if (rawUrl && rawUrl.startsWith('http')) {
          const optimizedUrl = ImageProxy.buildWsrvUrl(rawUrl, { quality: 80, output: 'webp' });
          pages.push({
            page: idx + 1,
            url: optimizedUrl,
            headers: { Referer: 'https://chapmanganato.to/' }
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
      throw new Error(`[MangaNato Scraper] Failed to fetch chapter pages for "${chapterId}": ${error.message}`);
    }
  }
}
