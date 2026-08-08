import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

export class MangaBallScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangaball', siteName: 'MangaBall', baseUrl: 'https://mangaball.com', requiresHeadless: false });
  }

  async search(query) {
    try {
      const res = await this.httpClient.post('/api/search', { query }).then(r => r.data).catch(() => []);
      const items = Array.isArray(res) ? res : res.data || [];
      return items.map(item => formatSearchResultItem({
        id: String(item.id || item.slug),
        siteId: this.siteId,
        title: item.title || 'Untitled',
        coverUrl: item.coverUrl ? ImageProxy.buildWsrvUrl(item.coverUrl, { width: 256 }) : null,
        genres: item.genres || ['Manga'],
        status: 'ONGOING'
      }));
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const res = await this.httpClient.get(`/api/manga/${mangaId}`).then(r => r.data);
    const item = res.data || res;
    const chapters = (item.chapters || []).map(c => ({ id: String(c.id), chapterNumber: String(c.number || '0'), title: c.title || `Chapter ${c.number}` }));
    return formatMangaDetails({ id: mangaId, siteId: this.siteId, title: item.title || mangaId, coverUrl: item.coverUrl ? ImageProxy.buildWsrvUrl(item.coverUrl, { quality: 85 }) : null, author: 'MangaBall', status: 'ONGOING', genres: item.genres || ['Manga'], chapters });
  }

  async getChapterPages(mangaId, chapterId) {
    const res = await this.httpClient.get(`/api/chapter/${chapterId}`).then(r => r.data);
    const pagesList = res.pages || res.data?.pages || [];
    const pages = pagesList.map((url, idx) => ({ page: idx + 1, url: ImageProxy.buildWsrvUrl(typeof url === 'string' ? url : url.url, { quality: 80, output: 'webp' }) }));
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
