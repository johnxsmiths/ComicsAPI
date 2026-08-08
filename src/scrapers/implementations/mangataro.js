import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';

export class MangaTaroScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangataro', siteName: 'MangaTaro', baseUrl: 'https://mangataro.yachts', requiresHeadless: false });
  }

  async search(query) {
    try {
      const data = await this.fetchUrl('/wp-json/wp/v2/posts', { params: { search: query, per_page: 20 } }).catch(() => []);
      const items = Array.isArray(data) ? data : [];
      return items.map(item => formatSearchResultItem({
        id: String(item.id),
        siteId: this.siteId,
        title: item.title?.rendered || 'Untitled',
        coverUrl: item.jetpack_featured_media_url ? ImageProxy.buildWsrvUrl(item.jetpack_featured_media_url, { width: 256 }) : null,
        genres: ['Manga'],
        status: 'ONGOING'
      }));
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const item = await this.fetchUrl(`/wp-json/wp/v2/posts/${mangaId}`);
    return formatMangaDetails({
      id: mangaId,
      siteId: this.siteId,
      title: item.title?.rendered || mangaId,
      description: item.excerpt?.rendered || '',
      coverUrl: item.jetpack_featured_media_url ? ImageProxy.buildWsrvUrl(item.jetpack_featured_media_url, { quality: 85 }) : null,
      author: 'MangaTaro',
      status: 'ONGOING',
      genres: ['Manga'],
      chapters: [{ id: `${mangaId}_1`, chapterNumber: '1', title: 'Chapter 1' }]
    });
  }

  async getChapterPages(mangaId, chapterId) {
    const item = await this.fetchUrl(`/wp-json/wp/v2/posts/${mangaId}`);
    const content = item.content?.rendered || '';
    const matches = Array.from(content.matchAll(/src=["'](https?:\/\/[^"']+)["']/g)).map(m => m[1]);
    const pages = matches.map((url, idx) => ({ page: idx + 1, url: ImageProxy.buildWsrvUrl(url, { quality: 80, output: 'webp' }) }));
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '1', pages });
  }
}
