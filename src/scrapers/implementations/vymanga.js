import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';
import * as cheerio from 'cheerio';

export class VyMangaScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'vymanga', siteName: 'VyManga', baseUrl: 'https://vymanga.net', requiresHeadless: false });
  }

  async search(query) {
    try {
      const html = await this.fetchUrl('/search', { params: { key: query } }).catch(() => null);
      if (!html) return [];
      const $ = cheerio.load(html);
      const items = [];
      $('.comic-item, a[href*="/manga/"]').each((_, el) => {
        const href = $(el).attr('href') || '';
        const title = $(el).text().trim();
        const img = $(el).find('img').attr('src');
        const id = href.replace('/manga/', '').split('/')[0];
        if (id && title && !items.some(i => i.id === id)) {
          items.push(formatSearchResultItem({ id, siteId: this.siteId, title, coverUrl: img ? ImageProxy.buildWsrvUrl(img, { width: 256 }) : null, genres: ['Manga'], status: 'ONGOING' }));
        }
      });
      return items;
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const html = await this.fetchUrl(`/manga/${mangaId}`);
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || mangaId;
    const cover = $('.image img').attr('src');
    const chapters = [];
    $('a[href*="/read/"]').each((_, el) => {
      const href = $(el).attr('href') || '';
      const chId = href.replace('/read/', '').replace(/\/$/, '');
      if (chId) chapters.push({ id: chId, chapterNumber: $(el).text().replace(/[^0-9.]/g, '') || '0', title: $(el).text().trim() });
    });
    return formatMangaDetails({ id: mangaId, siteId: this.siteId, title, coverUrl: cover ? ImageProxy.buildWsrvUrl(cover, { quality: 85 }) : null, author: 'VyManga', status: 'ONGOING', genres: ['Manga'], chapters });
  }

  async getChapterPages(mangaId, chapterId) {
    const html = await this.fetchUrl(`/read/${chapterId}`);
    const $ = cheerio.load(html);
    const pages = [];
    $('.content-read img').each((idx, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.startsWith('http')) pages.push({ page: idx + 1, url: ImageProxy.buildWsrvUrl(src, { quality: 80, output: 'webp' }) });
    });
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
