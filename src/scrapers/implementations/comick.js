import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

/**
 * Scraper implementation for Comick (https://comick-source-api.notaspider.dev / https://api.comick.io).
 */
export class ComickScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'comick',
      siteName: 'Comick',
      baseUrl: 'https://comick-source-api.notaspider.dev',
      requiresHeadless: false,
      rateLimitMs: 150
    });
    this.cdnBaseUrl = 'https://meo.comick.pictures';
    this.fallbackDomains = [
      'https://comick-source-api.notaspider.dev',
      'https://api.comick.io',
      'https://api.comick.cc'
    ];
  }

  /**
   * Search Comick for manga matching a query.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      const response = await this.httpClient.get('/v1.0/search', {
        params: { q: query, limit: 20 }
      }).catch(async () => {
        // Fallback to alternative api mirror if primary domain is blocked
        return await this.fetchUrl('https://api.comick.io/v1.0/search', { params: { q: query, limit: 20 } });
      });

      const items = Array.isArray(response?.data) ? response.data : Array.isArray(response) ? response : [];

      return items.map((item) => {
        const coverFileName = item.md_covers?.[0]?.b2key;
        const rawCoverUrl = coverFileName ? `${this.cdnBaseUrl}/${coverFileName}` : null;
        const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 80, width: 256 }) : null;

        const genres = Array.isArray(item.md_genres)
          ? item.md_genres.map(g => g.name).filter(Boolean)
          : [];

        return formatSearchResultItem({
          id: item.hid || item.slug,
          siteId: this.siteId,
          title: item.title || item.name || 'Untitled Manga',
          coverUrl,
          genres,
          status: item.status === 1 ? 'ONGOING' : item.status === 2 ? 'COMPLETED' : 'UNKNOWN',
          latestChapter: item.last_chapter ? String(item.last_chapter) : null
        });
      });
    } catch (error) {
      throw new Error(`[Comick Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load deep metadata and chapter list for a Comick manga HID/slug.
   * @param {string} mangaId - Comick HID or slug
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      // 1. Fetch Main Metadata
      let comicRes = await this.httpClient.get(`/comic/${mangaId}`).catch(() => null);
      if (!comicRes?.data) {
        const altData = await this.fetchUrl(`https://api.comick.io/comic/${mangaId}`).catch(() => null);
        comicRes = { data: altData };
      }

      const comicData = comicRes.data?.comic;

      if (!comicData) {
        throw new Error(`Manga with ID "${mangaId}" not found on Comick.`);
      }

      const hid = comicData.hid;
      const title = comicData.title || comicData.name || 'Untitled Manga';
      const altTitles = Array.isArray(comicData.md_titles)
        ? comicData.md_titles.map(t => t.title).filter(Boolean)
        : [];

      const description = comicData.desc || '';
      const coverFileName = comicData.md_covers?.[0]?.b2key;
      const rawCoverUrl = coverFileName ? `${this.cdnBaseUrl}/${coverFileName}` : null;
      const coverUrl = rawCoverUrl ? ImageProxy.buildWsrvUrl(rawCoverUrl, { quality: 85 }) : null;

      const author = comicData.authors?.[0]?.name || comicData.artists?.[0]?.name || 'Unknown Author';

      const genres = Array.isArray(comicData.md_comic_md_genres)
        ? comicData.md_comic_md_genres.map(g => g.md_genres?.name).filter(Boolean)
        : [];

      // 2. Fetch Chapters
      let chaptersRes = await this.httpClient.get(`/comic/${hid}/chapters`, {
        params: { lang: 'en', limit: 100 }
      }).catch(() => null);

      if (!chaptersRes?.data) {
        const altCh = await this.fetchUrl(`https://api.comick.io/comic/${hid}/chapters?lang=en&limit=100`).catch(() => null);
        chaptersRes = { data: altCh };
      }

      const chapterItems = chaptersRes.data?.chapters || [];
      const chapters = chapterItems.map((ch) => ({
        id: ch.hid,
        chapterNumber: ch.chap || '0',
        title: ch.title || null,
        releaseDate: ch.created_at || null,
        scanGroup: ch.group_name?.[0] || null
      }));

      return formatMangaDetails({
        id: hid,
        siteId: this.siteId,
        title,
        altTitles,
        description,
        coverUrl,
        author,
        status: comicData.status === 1 ? 'ONGOING' : comicData.status === 2 ? 'COMPLETED' : 'UNKNOWN',
        genres,
        chapters
      });
    } catch (error) {
      throw new Error(`[Comick Scraper] Failed to fetch details for mangaId "${mangaId}": ${error.message}`);
    }
  }

  /**
   * Fetch chapter page image URLs.
   * @param {string} mangaId
   * @param {string} chapterId - Comick Chapter HID
   * @returns {Promise<import('../../models/manga.model.js').ChapterPages>}
   */
  async getChapterPages(mangaId, chapterId) {
    try {
      let response = await this.httpClient.get(`/chapter/${chapterId}`).catch(() => null);
      if (!response?.data) {
        const altData = await this.fetchUrl(`https://api.comick.io/chapter/${chapterId}`).catch(() => null);
        response = { data: altData };
      }

      const chapterData = response.data?.chapter;

      if (!chapterData || !Array.isArray(chapterData.images)) {
        throw new Error(`Invalid response for chapter HID "${chapterId}" on Comick.`);
      }

      const pages = chapterData.images.map((imgObj, idx) => {
        const rawUrl = `${this.cdnBaseUrl}/${imgObj.b2key}`;
        const optimizedUrl = ImageProxy.buildWsrvUrl(rawUrl, { quality: 80, output: 'webp' });

        return {
          page: idx + 1,
          url: optimizedUrl,
          headers: {
            Referer: 'https://comick.io/'
          }
        };
      });

      return formatChapterPages({
        siteId: this.siteId,
        mangaId,
        chapterId,
        chapterNumber: chapterData.chap || '0',
        pages
      });
    } catch (error) {
      throw new Error(`[Comick Scraper] Failed to fetch pages for chapterId "${chapterId}": ${error.message}`);
    }
  }
}
