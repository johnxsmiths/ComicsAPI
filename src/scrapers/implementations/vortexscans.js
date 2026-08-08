import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

export class VortexScansScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'vortexscans', siteName: 'VortexScans', baseUrl: 'https://api.vortexscans.org', requiresHeadless: false });
  }

  async search(query) {
    try {
      const res = await this.httpClient.get('/api/series/search', { params: { query } }).then(r => r.data).catch(() => []);
      const items = Array.isArray(res) ? res : res.data || [];
      return items.map(item => formatSearchResultItem({
        id: String(item.slug || item.id),
        siteId: this.siteId,
        title: item.title || item.name || 'Untitled',
        coverUrl: item.cover ? ImageProxy.buildWsrvUrl(item.cover, { width: 256 }) : null,
        genres: item.genres || ['Manhwa'],
        status: 'ONGOING'
      }));
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const res = await this.httpClient.get(`/api/series/${mangaId}`).then(r => r.data);
    const item = res.data || res;
    const chapters = (item.chapters || []).map(c => ({ id: String(c.id || c.slug), chapterNumber: String(c.number || '0'), title: c.title || `Chapter ${c.number}` }));
    return formatMangaDetails({
      id: mangaId,
      siteId: this.siteId,
      title: item.title || mangaId,
      description: item.description || '',
      coverUrl: item.cover ? ImageProxy.buildWsrvUrl(item.cover, { quality: 85 }) : null,
      author: item.author || 'VortexScans',
      status: 'ONGOING',
      genres: item.genres || ['Manhwa'],
      chapters
    });
  }

  async getChapterPages(mangaId, chapterId) {
    const res = await this.httpClient.get(`/api/chapters/${chapterId}`).then(r => r.data);
    const images = res.data?.images || res.images || [];
    const pages = images.map((url, idx) => ({ page: idx + 1, url: ImageProxy.buildWsrvUrl(url, { quality: 80, output: 'webp' }) }));
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
