import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';
import * as cheerio from 'cheerio';

export class MangaGoScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangago', siteName: 'MangaGo', baseUrl: 'https://mangago.me', requiresHeadless: false });
  }

  async search(query) {
    try {
      const html = await this.fetchUrl('/r/l_search/', { params: { name: query } }).catch(() => null);
      if (!html) return [];
      const $ = cheerio.load(html);
      const items = [];
      $('#search_list li').each((_, el) => {
        const a = $(el).find('h2 a').first();
        const href = a.attr('href') || '';
        const title = a.text().trim();
        const img = $(el).find('img').attr('src');
        const id = href.replace(this.baseUrl, '').replace(/^\//, '').replace(/\/$/, '');
        if (id && title) {
          items.push(formatSearchResultItem({ id, siteId: this.siteId, title, coverUrl: img ? ImageProxy.buildWsrvUrl(img, { width: 256 }) : null, genres: ['Manga'], status: 'ONGOING' }));
        }
      });
      return items;
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const html = await this.fetchUrl(`/${mangaId}`);
    const $ = cheerio.load(html);
    const title = $('h1').first().text().trim() || mangaId;
    const cover = $('.cover img').attr('src');
    const chapters = [];
    $('#chapter_table a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const chId = href.replace(this.baseUrl, '').replace(/^\//, '').replace(/\/$/, '');
      if (chId) chapters.push({ id: chId, chapterNumber: $(el).text().replace(/[^0-9.]/g, '') || '0', title: $(el).text().trim() });
    });
    return formatMangaDetails({ id: mangaId, siteId: this.siteId, title, coverUrl: cover ? ImageProxy.buildWsrvUrl(cover, { quality: 85 }) : null, author: 'MangaGo', status: 'ONGOING', genres: ['Manga'], chapters });
  }

  async getChapterPages(mangaId, chapterId) {
    const html = await this.fetchUrl(`/${chapterId}`);
    const $ = cheerio.load(html);
    const pages = [];
    $('#page1 img, #pagehouse img').each((idx, el) => {
      const src = $(el).attr('src') || $(el).attr('data-src');
      if (src && src.startsWith('http')) pages.push({ page: idx + 1, url: ImageProxy.buildWsrvUrl(src, { quality: 80, output: 'webp' }) });
    });
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
