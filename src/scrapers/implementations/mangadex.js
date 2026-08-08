import { BaseScraper } from '../base.scraper.js';
import { 
  formatSearchResultItem, 
  formatMangaDetails, 
  formatChapterPages 
} from '../../models/manga.model.js';

/**
 * Benchmark Scraper Implementation for MangaDex (https://api.mangadex.org).
 * Serves as a reference implementation for the Strategy Pattern registry.
 */
export class MangaDexScraper extends BaseScraper {
  constructor() {
    super({
      siteId: 'mangadex',
      siteName: 'MangaDex',
      baseUrl: 'https://api.mangadex.org',
      requiresHeadless: false,
      rateLimitMs: 200
    });
    this.coverBaseUrl = 'https://uploads.mangadex.org/covers';
  }

  /**
   * Search MangaDex catalog for a title query.
   * @param {string} query
   * @returns {Promise<Array<import('../../models/manga.model.js').SearchResultItem>>}
   */
  async search(query) {
    try {
      const response = await this.httpClient.get('/manga', {
        params: {
          title: query,
          limit: 20,
          includes: ['cover_art'],
          'contentRating[]': ['safe', 'suggestive'],
          'order[relevance]': 'desc'
        }
      });

      const items = response.data?.data || [];

      return items.map((item) => {
        const attributes = item.attributes || {};
        const titleObj = attributes.title || {};
        const title = titleObj.en || titleObj['ja-ro'] || Object.values(titleObj)[0] || 'Untitled Manga';

        // Extract cover image filename from relationships
        const coverRel = item.relationships?.find(r => r.type === 'cover_art');
        const fileName = coverRel?.attributes?.fileName;
        const coverUrl = fileName ? `${this.coverBaseUrl}/${item.id}/${fileName}.256.jpg` : null;

        const tags = Array.isArray(attributes.tags)
          ? attributes.tags.map(t => t.attributes?.name?.en).filter(Boolean)
          : [];

        return formatSearchResultItem({
          id: item.id,
          siteId: this.siteId,
          title,
          coverUrl,
          genres: tags,
          status: attributes.status ? attributes.status.toUpperCase() : 'UNKNOWN',
          latestChapter: attributes.lastChapter || null
        });
      });
    } catch (error) {
      throw new Error(`[MangaDex Scraper] Search failed for query "${query}": ${error.message}`);
    }
  }

  /**
   * Load deep metadata and chapter list for a given MangaDex ID.
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getDetails(mangaId) {
    try {
      // 1. Fetch Manga Metadata
      const mangaRes = await this.httpClient.get(`/manga/${mangaId}`, {
        params: { includes: ['cover_art', 'author', 'artist'] }
      });

      const mangaData = mangaRes.data?.data;
      if (!mangaData) {
        throw new Error(`Manga with ID "${mangaId}" not found on MangaDex.`);
      }

      const attributes = mangaData.attributes || {};
      const titleObj = attributes.title || {};
      const title = titleObj.en || titleObj['ja-ro'] || Object.values(titleObj)[0] || 'Untitled Manga';

      const altTitles = Array.isArray(attributes.altTitles)
        ? attributes.altTitles.map(t => Object.values(t)[0]).filter(Boolean)
        : [];

      const description = attributes.description?.en || Object.values(attributes.description || {})[0] || '';

      // Cover URL
      const coverRel = mangaData.relationships?.find(r => r.type === 'cover_art');
      const fileName = coverRel?.attributes?.fileName;
      const coverUrl = fileName ? `${this.coverBaseUrl}/${mangaId}/${fileName}` : null;

      // Author / Artist
      const authorRel = mangaData.relationships?.find(r => r.type === 'author' || r.type === 'artist');
      const author = authorRel?.attributes?.name || 'Unknown Author';

      const genres = Array.isArray(attributes.tags)
        ? attributes.tags.map(t => t.attributes?.name?.en).filter(Boolean)
        : [];

      // 2. Fetch Chapters (Feed)
      const feedRes = await this.httpClient.get(`/manga/${mangaId}/feed`, {
        params: {
          translatedLanguage: ['en'],
          limit: 100,
          'order[chapter]': 'asc',
          includes: ['scanlation_group']
        }
      });

      const feedItems = feedRes.data?.data || [];
      const chapters = feedItems.map((ch) => {
        const chAttrs = ch.attributes || {};
        const groupRel = ch.relationships?.find(r => r.type === 'scanlation_group');

        return {
          id: ch.id,
          chapterNumber: chAttrs.chapter || '0',
          title: chAttrs.title || null,
          releaseDate: chAttrs.publishAt || null,
          scanGroup: groupRel?.attributes?.name || null
        };
      });

      return formatMangaDetails({
        id: mangaId,
        siteId: this.siteId,
        title,
        altTitles,
        description,
        coverUrl,
        author,
        status: attributes.status ? attributes.status.toUpperCase() : 'UNKNOWN',
        genres,
        chapters
      });
    } catch (error) {
      throw new Error(`[MangaDex Scraper] Failed to fetch details for mangaId "${mangaId}": ${error.message}`);
    }
  }

  /**
   * Fetch image URLs for a chapter.
   * @param {string} mangaId
   * @param {string} chapterId
   * @returns {Promise<import('../../models/manga.model.js').ChapterPages>}
   */
  async getChapterPages(mangaId, chapterId) {
    try {
      const response = await this.httpClient.get(`/at-home/server/${chapterId}`);
      const data = response.data;

      const baseUrl = data?.baseUrl;
      const chapterData = data?.chapter;

      if (!baseUrl || !chapterData) {
        throw new Error(`Invalid response from MangaDex @Home server for chapter "${chapterId}".`);
      }

      const hash = chapterData.hash;
      const pageFilenames = chapterData.data || [];

      const pages = pageFilenames.map((filename, index) => ({
        page: index + 1,
        url: `${baseUrl}/data/${hash}/${filename}`,
        headers: {
          Referer: 'https://mangadex.org/'
        }
      }));

      return formatChapterPages({
        siteId: this.siteId,
        mangaId,
        chapterId,
        chapterNumber: '0',
        pages
      });
    } catch (error) {
      throw new Error(`[MangaDex Scraper] Failed to fetch pages for chapterId "${chapterId}": ${error.message}`);
    }
  }
}
