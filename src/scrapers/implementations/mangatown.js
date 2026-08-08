import { BaseScraper } from '../base.scraper.js';
import { formatSearchResultItem, formatMangaDetails, formatChapterPages } from '../../models/manga.model.js';
import { ImageProxy } from '../../utils/imageProxy.js';
import * as cheerio from 'cheerio';

export class MangaTownScraper extends BaseScraper {
  constructor() {
    super({ siteId: 'mangatown', siteName: 'MangaTown', baseUrl: 'https://mangatown.com', requiresHeadless: false });
  }

  async search(query) {
    try {
      const html = await this.fetchUrl('/search', { params: { name: query } }).catch(() => null);
      if (!html) return [];
      const $ = cheerio.load(html);
      const items = [];
      $('.manga_search_item, .manga_pic').each((_, el) => {
        const a = $(el).find('a').first();
        const href = a.attr('href') || '';
        const title = a.attr('title') || $(el).find('h3').text().trim();
        const img = $(el).find('img').attr('src');
        const id = href.replace('/manga/', '').replace(/\/$/, '');
        if (id && title && !items.some(i => i.id === id)) {
          items.push(formatSearchResultItem({ id, siteId: this.siteId, title, coverUrl: img ? ImageProxy.buildWsrvUrl(img, { width: 256 }) : null, genres: ['Manga'], status: 'ONGOING' }));
        }
      });
      return items;
    } catch (e) { return []; }
  }

  async getDetails(mangaId) {
    const html = await this.fetchUrl(`/manga/${mangaId}/`);
    const $ = cheerio.load(html);
    const title = $('.title-top, h1').text().trim() || mangaId;
    const cover = $('.detail_info img').attr('src');
    const chapters = [];
    $('.chapter_list li a').each((_, el) => {
      const href = $(el).attr('href') || '';
      const chId = href.replace(`/manga/${mangaId}/`, '').replace(/\/$/, '');
      if (chId) chapters.push({ id: chId, chapterNumber: $(el).text().replace(/[^0-9.]/g, '') || '0', title: $(el).text().trim() });
    });
    return formatMangaDetails({ id: mangaId, siteId: this.siteId, title, coverUrl: cover ? ImageProxy.buildWsrvUrl(cover, { quality: 85 }) : null, author: 'MangaTown', status: 'ONGOING', genres: ['Manga'], chapters });
  }

  async getChapterPages(mangaId, chapterId) {
    const html = await this.fetchUrl(`/manga/${mangaId}/${chapterId}/1.html`);
    const $ = cheerio.load(html);
    const pages = [];
    $('#image, #img').each((idx, el) => {
      const src = $(el).attr('src');
      if (src) pages.push({ page: idx + 1, url: ImageProxy.buildWsrvUrl(src, { quality: 80, output: 'webp' }) });
    });
    return formatChapterPages({ siteId: this.siteId, mangaId, chapterId, chapterNumber: '0', pages });
  }
}
