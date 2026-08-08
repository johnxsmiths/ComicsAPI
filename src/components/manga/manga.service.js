import { scraperRegistry } from '../../scrapers/scraper.registry.js';
import { BatchDownloader } from '../../utils/batchDownloader.js';

export class MangaService {
  /**
   * Get list of registered scraper providers.
   */
  getProviders() {
    return scraperRegistry.getProvidersList();
  }

  /**
   * Perform parallel search across multiple site scrapers.
   * 
   * @param {string} query - Search term
   * @param {string[]} siteIds - Array of registered site IDs to search
   * @returns {Promise<{ results: Array<import('../../models/manga.model.js').SearchResultItem>, summary: Object }>}
   */
  async searchManga(query, siteIds = ['mangadex']) {
    const validSiteIds = siteIds.filter(id => scraperRegistry.has(id));

    if (validSiteIds.length === 0) {
      throw new Error(`None of the requested site IDs (${siteIds.join(', ')}) are registered in the scraper registry.`);
    }

    const searchPromises = validSiteIds.map(siteId => {
      const scraper = scraperRegistry.get(siteId);
      return scraper.search(query).then(items => ({
        siteId,
        success: true,
        items
      })).catch(err => ({
        siteId,
        success: false,
        error: err.message,
        items: []
      }));
    });

    const settledResults = await Promise.allSettled(searchPromises);

    const aggregated = [];
    const siteSummary = {};

    settledResults.forEach((res, index) => {
      const targetSiteId = validSiteIds[index];
      if (res.status === 'fulfilled') {
        const payload = res.value;
        siteSummary[targetSiteId] = {
          success: payload.success,
          count: payload.items.length,
          ...(payload.error ? { error: payload.error } : {})
        };
        aggregated.push(...payload.items);
      } else {
        siteSummary[targetSiteId] = {
          success: false,
          count: 0,
          error: res.reason?.message || 'Unknown strategy search error'
        };
      }
    });

    return {
      results: aggregated,
      summary: {
        totalResults: aggregated.length,
        sitesQueried: validSiteIds.length,
        siteDetails: siteSummary
      }
    };
  }

  /**
   * Load deep metadata and full chapter list for a manga on a specific site.
   * 
   * @param {string} siteId
   * @param {string} mangaId
   * @returns {Promise<import('../../models/manga.model.js').MangaDetails>}
   */
  async getMangaDetails(siteId, mangaId) {
    const scraper = scraperRegistry.get(siteId);
    return await scraper.getDetails(mangaId);
  }

  /**
   * Retrieve image page URLs or document for a single chapter.
   * 
   * @param {string} siteId
   * @param {string} mangaId
   * @param {string} chapterId
   * @returns {Promise<import('../../models/manga.model.js').ChapterPages>}
   */
  async getChapterPages(siteId, mangaId, chapterId) {
    const scraper = scraperRegistry.get(siteId);
    return await scraper.getChapterPages(mangaId, chapterId);
  }

  /**
   * Execute batch download stream for array of image URL definitions.
   * 
   * @param {Object} payload - Validated batch download payload
   * @returns {Promise<Object>}
   */
  async batchDownload(payload) {
    const { images, options } = payload;
    return await BatchDownloader.processBatch(images, options);
  }
}

export const mangaService = new MangaService();
