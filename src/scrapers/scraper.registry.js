import { MangaDexScraper } from './implementations/mangadex.js';
import { ComickScraper } from './implementations/comick.js';
import { AsuraScansScraper } from './implementations/asurascans.js';
import { MangaParkScraper } from './implementations/mangapark.js';
import { MangaNatoScraper } from './implementations/manganato.js';
import { MangaPillScraper } from './implementations/mangapill.js';
import { WeebCentralScraper } from './implementations/weebcentral.js';
import { MangaTaroScraper } from './implementations/mangataro.js';
import { ComixScraper } from './implementations/comix.js';
import { MangaKatanaScraper } from './implementations/mangakatana.js';
import { VortexScansScraper } from './implementations/vortexscans.js';
import { MangaTownScraper } from './implementations/mangatown.js';
import { MangaHereScraper } from './implementations/mangahere.js';
import { LikeMangaScraper } from './implementations/likemanga.js';
import { MangaFireScraper } from './implementations/mangafire.js';
import { MangaDotScraper } from './implementations/mangadot.js';
import { MangaBallScraper } from './implementations/mangaball.js';
import { AtsumaruScraper } from './implementations/atsumaru.js';
import { RawOtakuScraper } from './implementations/rawotaku.js';
import { ScansGGScraper } from './implementations/scansgg.js';
import { VyMangaScraper } from './implementations/vymanga.js';
import { LinkMangaScraper } from './implementations/linkmanga.js';
import { MangaGoScraper } from './implementations/mangago.js';

/**
 * Strategy Pattern Registry managing site scraper implementations.
 * Designed to scale across 1,200+ comic & manga source definitions.
 */
class ScraperRegistry {
  constructor() {
    /** @type {Map<string, import('./base.scraper.js').BaseScraper>} */
    this.registry = new Map();
    this.initialized = false;
  }

  /**
   * Register a new scraper strategy instance.
   * @param {import('./base.scraper.js').BaseScraper} scraperInstance
   */
  register(scraperInstance) {
    if (!scraperInstance || !scraperInstance.siteId) {
      throw new Error('Invalid scraper instance. Must contain a valid siteId property.');
    }
    this.registry.set(scraperInstance.siteId.toLowerCase(), scraperInstance);
  }

  /**
   * Initialize default built-in scrapers.
   */
  init() {
    if (this.initialized) return;

    // Register all 20+ built-in primary manga providers
    this.register(new MangaDexScraper());
    this.register(new ComickScraper());
    this.register(new AsuraScansScraper());
    this.register(new MangaParkScraper());
    this.register(new MangaNatoScraper());
    this.register(new MangaPillScraper());
    this.register(new WeebCentralScraper());
    this.register(new MangaTaroScraper());
    this.register(new ComixScraper());
    this.register(new MangaKatanaScraper());
    this.register(new VortexScansScraper());
    this.register(new MangaTownScraper());
    this.register(new MangaHereScraper());
    this.register(new LikeMangaScraper());
    this.register(new MangaFireScraper());
    this.register(new MangaDotScraper());
    this.register(new MangaBallScraper());
    this.register(new AtsumaruScraper());
    this.register(new RawOtakuScraper());
    this.register(new ScansGGScraper());
    this.register(new VyMangaScraper());
    this.register(new LinkMangaScraper());
    this.register(new MangaGoScraper());

    this.initialized = true;
  }

  /**
   * Get a scraper strategy by siteId.
   * @param {string} siteId
   * @returns {import('./base.scraper.js').BaseScraper}
   */
  get(siteId) {
    this.init();
    const normalizedId = String(siteId).toLowerCase();
    const scraper = this.registry.get(normalizedId);

    if (!scraper) {
      throw new Error(`Scraper strategy for siteId "${siteId}" is not registered in the system.`);
    }

    return scraper;
  }

  /**
   * Check if a scraper strategy exists for a given siteId.
   * @param {string} siteId
   * @returns {boolean}
   */
  has(siteId) {
    this.init();
    return this.registry.has(String(siteId).toLowerCase());
  }

  /**
   * Get all registered site IDs.
   * @returns {string[]}
   */
  getAllSiteIds() {
    this.init();
    return Array.from(this.registry.keys());
  }

  /**
   * Get providers list array for /api/scrape/providers endpoint.
   */
  getProvidersList() {
    this.init();
    const list = [];
    for (const [id, scraper] of this.registry.entries()) {
      list.push({
        id,
        name: scraper.siteName,
        baseUrl: scraper.baseUrl,
        requiresHeadless: scraper.requiresHeadless,
        type: scraper.requiresHeadless ? 'CF' : 'API/HTML'
      });
    }
    return list;
  }

  /**
   * Get metadata summary for system diagnostics.
   */
  getCapabilitySummary() {
    this.init();
    const result = {};
    for (const [siteId, scraper] of this.registry.entries()) {
      result[siteId] = {
        name: scraper.siteName,
        baseUrl: scraper.baseUrl,
        requiresHeadless: scraper.requiresHeadless,
        rateLimitMs: scraper.rateLimitMs
      };
    }
    return result;
  }
}

export const scraperRegistry = new ScraperRegistry();
