import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';
import * as cheerio from 'cheerio';

export class MangaKatanaScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangakatana', siteName: 'MangaKatana', baseUrl: 'https://mangakatana.com', requiresHeadless: false });
  }

  async search(query) {
    try {
      const html = await this.fetchUrl('/', { params: { search: query, search_by: 'book_name' } }).catch(() => null);
      if (!html) return [];
      const $ = cheerio.load(html);
      const items = [];
      $('#book_list .item').each((_, el) => {
        const link = $(el).find('h3 a').attr('href') || '';
        const title = $(el).find('h3 a').text().trim();
        const img = $(el).find('.wrap_img img').attr('src');
        const id = link.split('/manga/')[1]?.split('.')[0] || link;
        if (id && title) {
          items.push(formatSearchResultItem({ id, siteId: this.siteId, title, coverUrl: img ? ImageProxy.buildWsrvUrl(img, { width: 256 }) : null, genres: ['Manga'], status: 'ONGOING' }));
        }
      });
      return items;
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const html = await this.fetchUrl(`/manga/${mangaId}`);
    const $ = cheerio.load(html);
    const title = $('h1.heading').text().trim() || mangaId;
    const cover = $('.cover img').attr('src');
    const chapters = [];
    $('.chapters tr').each((_, el) => {
      const a = $(el).find('.chapter a');
      const href = a.attr('href') || '';
      const chId = href.split('/manga/')[1] || href;
      if (chId) {
        chapters.push({ id: chId, chapterNumber: a.text().replace(/[^0-9.]/g, '') || '0', title: a.text().trim() });
      }
    });
    return formatMangaDetails({ id: mangaId, siteId: this.siteId, title, coverUrl: cover ? ImageProxy.buildWsrvUrl(cover, { quality: 85 }) : null, author: 'MangaKatana', status: 'ONGOING', genres: ['Manga'], chapters });
  }

  async getChapterPages(mangaId, chapterId) {
    const html = await this.fetchUrl(`/manga/${chapterId}`);
    const matches = Array.from(html.matchAll(/thzq\s*=\s*\[(.*?)\];/g))[0];
    const pages = [];
    if (matches && matches[1]) {
      const urls = matches[1].replace(/['"\s]/g, '').split(',');
      urls.forEach((u, i) => {
        if (u.startsWith('http')) pages.push({ page: i + 1, url: ImageProxy.buildWsrvUrl(u, { quality: 80, output: 'webp' }) });
      });
    }
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
