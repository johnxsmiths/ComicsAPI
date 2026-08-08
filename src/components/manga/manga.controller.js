import { mangaService } from './manga.service.js';
import { HttpResponse } from '../../utils/httpResponse.js';
import { 
  SearchQuerySchema, 
  ScrapeSearchSchema,
  ScrapeInfoSchema,
  ScrapeChaptersSchema,
  ScrapePagesSchema,
  MangaParamsSchema, 
  ChapterParamsSchema, 
  BatchDownloadSchema 
} from '../../models/manga.model.js';

export class MangaController {
  /**
   * Handle GET /api/scrape/providers
   */
  handleGetProviders() {
    const providers = mangaService.getProviders();
    return HttpResponse.success(200, providers, { totalProviders: providers.length });
  }

  /**
   * Handle GET /api/scrape/search?query={q}&provider={provider}
   */
  async handleScrapeSearch(queryParams) {
    try {
      const { error, value } = ScrapeSearchSchema.validate(queryParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { query, provider } = value;
      const data = await mangaService.searchManga(query, [provider]);

      return HttpResponse.success(200, data.results, data.summary);
    } catch (err) {
      return HttpResponse.error(502, 'Scraper search failed', err.message);
    }
  }

  /**
   * Handle GET /api/scrape/info?id={id}&provider={provider}
   */
  async handleScrapeInfo(queryParams) {
    try {
      const { error, value } = ScrapeInfoSchema.validate(queryParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { id, provider } = value;
      const details = await mangaService.getMangaDetails(provider, id);

      return HttpResponse.success(200, details);
    } catch (err) {
      if (err.message.includes('not found')) {
        return HttpResponse.error(404, err.message);
      }
      return HttpResponse.error(502, 'Scraper info failed', err.message);
    }
  }

  /**
   * Handle GET /api/scrape/chapters?id={id}&provider={provider}
   */
  async handleScrapeChapters(queryParams) {
    try {
      const { error, value } = ScrapeChaptersSchema.validate(queryParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { id, provider } = value;
      const details = await mangaService.getMangaDetails(provider, id);

      return HttpResponse.success(200, details.chapters, {
        mangaId: details.id,
        title: details.title,
        totalChapters: details.totalChapters
      });
    } catch (err) {
      return HttpResponse.error(502, 'Scraper chapters failed', err.message);
    }
  }

  /**
   * Handle GET /api/scrape/pages?id={id}&chapterNumber={num}&provider={provider}
   */
  async handleScrapePages(queryParams) {
    try {
      const { error, value } = ScrapePagesSchema.validate(queryParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { id, chapterNumber, chapterId, provider } = value;
      const targetChapterId = chapterId || chapterNumber || '1';

      const pages = await mangaService.getChapterPages(provider, id, targetChapterId);

      return HttpResponse.success(200, pages);
    } catch (err) {
      return HttpResponse.error(502, 'Scraper pages failed', err.message);
    }
  }

  /**
   * Handle GET /search?q={query}&sites={siteIds}
   */
  async handleSearch(queryParams) {
    try {
      const { error, value } = SearchQuerySchema.validate(queryParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const q = value.q || value.query;
      const sites = value.sites || (value.provider ? [value.provider] : ['mangadex']);
      const siteList = Array.isArray(sites) ? sites : String(sites).split(',');

      const data = await mangaService.searchManga(q, siteList);

      return HttpResponse.success(200, data.results, data.summary);
    } catch (err) {
      if (err.message.includes('not registered')) {
        return HttpResponse.error(400, err.message);
      }
      return HttpResponse.error(502, 'Scraper upstream search failed', err.message);
    }
  }

  /**
   * Handle GET /manga/{siteId}/{mangaId}
   */
  async handleGetDetails(pathParams) {
    try {
      const { error, value } = MangaParamsSchema.validate(pathParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { siteId, mangaId } = value;
      const details = await mangaService.getMangaDetails(siteId, mangaId);

      return HttpResponse.success(200, details);
    } catch (err) {
      if (err.message.includes('not registered')) {
        return HttpResponse.error(400, err.message);
      }
      if (err.message.includes('not found')) {
        return HttpResponse.error(404, err.message);
      }
      return HttpResponse.error(502, 'Upstream site error loading metadata', err.message);
    }
  }

  /**
   * Handle GET /manga/{siteId}/{mangaId}/chapter/{chapterId}
   */
  async handleGetChapterPages(pathParams) {
    try {
      const { error, value } = ChapterParamsSchema.validate(pathParams, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const { siteId, mangaId, chapterId } = value;
      const pages = await mangaService.getChapterPages(siteId, mangaId, chapterId);

      return HttpResponse.success(200, pages);
    } catch (err) {
      if (err.message.includes('not registered')) {
        return HttpResponse.error(400, err.message);
      }
      if (err.message.includes('not found') || err.message.includes('Invalid response')) {
        return HttpResponse.error(404, err.message);
      }
      return HttpResponse.error(502, 'Upstream site error loading chapter pages', err.message);
    }
  }

  /**
   * Handle POST /download/batch
   */
  async handleBatchDownload(bodyPayload) {
    try {
      const { error, value } = BatchDownloadSchema.validate(bodyPayload, { abortEarly: false });
      if (error) {
        return HttpResponse.error(400, 'Validation Error', error.details.map(d => d.message));
      }

      const downloadResult = await mangaService.batchDownload(value);

      return HttpResponse.success(200, downloadResult.images, downloadResult.summary);
    } catch (err) {
      return HttpResponse.error(500, 'Batch download execution failed', err.message);
    }
  }
}

export const mangaController = new MangaController();
