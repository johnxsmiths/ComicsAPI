import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

export class MangaDotScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangadot', siteName: 'MangaDot', baseUrl: 'https://mangadot.net', requiresHeadless: false });
  }

  async search(query) {
    try {
      const res = await this.httpClient.get('/api/search', { params: { q: query } }).then(r => r.data).catch(() => []);
      const items = Array.isArray(res) ? res : res.data || [];
      return items.map(item => formatSearchResultItem({
        id: String(item.id || item.slug),
        siteId: this.siteId,
        title: item.title || item.name || 'Untitled',
        coverUrl: item.cover ? ImageProxy.buildWsrvUrl(item.cover, { width: 256 }) : null,
        genres: item.genres || ['Manga'],
        status: 'ONGOING'
      }));
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const res = await this.httpClient.get(`/api/manga/${mangaId}`).then(r => r.data);
    const item = res.data || res;
    const chapters = (item.chapters || []).map(c => ({ id: String(c.id || c.slug), chapterNumber: String(c.number || '0'), title: c.title || `Chapter ${c.number}` }));
    return formatMangaDetails({
      id: mangaId,
      siteId: this.siteId,
      title: item.title || mangaId,
      description: item.description || '',
      coverUrl: item.cover ? ImageProxy.buildWsrvUrl(item.cover, { quality: 85 }) : null,
      author: item.author || 'MangaDot',
      status: 'ONGOING',
      genres: item.genres || ['Manga'],
      chapters
    });
  }

  async getChapterPages(mangaId, chapterId) {
    const res = await this.httpClient.get(`/api/chapter/${chapterId}`).then(r => r.data);
    const pagesList = res.pages || res.data?.pages || [];
    const pages = pagesList.map((url, idx) => ({ page: idx + 1, url: ImageProxy.buildWsrvUrl(typeof url === 'string' ? url : url.url, { quality: 80, output: 'webp' }) }));
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
