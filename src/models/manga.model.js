import Joi from 'joi';

/**
 * @typedef {Object} SearchResultItem
 * @property {string} id - Scraper-specific manga/comic ID
 * @property {string} siteId - Registered site identifier (e.g., 'mangadex', 'manganato')
 * @property {string} title - Title of the comic/manga
 * @property {string|null} coverUrl - URL to thumbnail/cover image
 * @property {string[]} genres - List of genre tags
 * @property {string|null} status - Publication status
 * @property {string|null} latestChapter - Latest chapter number/title
 */

/**
 * @typedef {Object} ChapterMetadata
 * @property {string} id - Chapter unique ID
 * @property {string} chapterNumber - Chapter number or label
 * @property {string|null} title - Chapter title
 * @property {string|null} releaseDate - Release date string
 * @property {string|null} scanGroup - Scanlation group name
 */

/**
 * @typedef {Object} MangaDetails
 * @property {string} id - Manga ID
 * @property {string} siteId - Site ID
 * @property {string} title - Title
 * @property {string[]} altTitles - Alternative titles
 * @property {string|null} description - Synopsis or summary
 * @property {string|null} coverUrl - Full cover image URL
 * @property {string|null} author - Author/Artist name
 * @property {string|null} status - Publication status
 * @property {string[]} genres - Genre tags
 * @property {number} totalChapters - Total count of chapters
 * @property {ChapterMetadata[]} chapters - Chapter list
 */

/**
 * @typedef {Object} ChapterPages
 * @property {string} siteId - Site ID
 * @property {string} mangaId - Manga ID
 * @property {string} chapterId - Chapter ID
 * @property {string} chapterNumber - Display chapter identifier
 * @property {'images'|'pdf'|'epub'} format - Chapter content format type
 * @property {string|null} downloadUrl - Optional direct document download URL (for PDF or EPUB)
 * @property {number} totalPages - Number of pages in chapter
 * @property {Array<{ page: number, url: string, headers?: Record<string, string> }>} pages - Page objects
 */

// ==========================================
// JOI REQUEST VALIDATION SCHEMAS
// ==========================================

export const SearchQuerySchema = Joi.object({
  q: Joi.string().trim().min(2).max(100).optional(),
  query: Joi.string().trim().min(2).max(100).optional(),
  sites: Joi.alternatives().try(
    Joi.string().trim(),
    Joi.array().items(Joi.string().trim())
  ).optional(),
  provider: Joi.string().trim().optional()
}).or('q', 'query').messages({
  'object.missing': 'Search query parameter "q" or "query" is required.'
});

export const ScrapeSearchSchema = Joi.object({
  query: Joi.string().trim().min(2).max(100).required(),
  provider: Joi.string().trim().default('mangadex')
});

export const ScrapeInfoSchema = Joi.object({
  id: Joi.string().trim().required(),
  provider: Joi.string().trim().default('mangadex')
});

export const ScrapeChaptersSchema = Joi.object({
  id: Joi.string().trim().required(),
  provider: Joi.string().trim().default('mangadex')
});

export const ScrapePagesSchema = Joi.object({
  id: Joi.string().trim().required(),
  chapterNumber: Joi.string().trim().optional(),
  chapterId: Joi.string().trim().optional(),
  provider: Joi.string().trim().default('mangadex')
});

export const MangaParamsSchema = Joi.object({
  siteId: Joi.string().trim().lowercase().min(2).max(30).required(),
  mangaId: Joi.string().trim().min(1).max(200).required()
});

export const ChapterParamsSchema = Joi.object({
  siteId: Joi.string().trim().lowercase().min(2).max(30).required(),
  mangaId: Joi.string().trim().min(1).max(200).required(),
  chapterId: Joi.string().trim().min(1).max(200).required()
});

export const BatchDownloadSchema = Joi.object({
  images: Joi.array().items(
    Joi.object({
      id: Joi.string().optional(),
      url: Joi.string().uri().required(),
      filename: Joi.string().optional(),
      headers: Joi.object().pattern(Joi.string(), Joi.string()).optional()
    })
  ).min(1).max(200).required(),
  options: Joi.object({
    quality: Joi.number().integer().min(10).max(100).default(80),
    format: Joi.string().valid('original', 'webp', 'jpeg', 'png').default('original'),
    maxWidth: Joi.number().integer().min(100).max(4000).optional(),
    concurrency: Joi.number().integer().min(1).max(10).default(5)
  }).default({
    quality: 80,
    format: 'original',
    concurrency: 5
  })
});

// ==========================================
// DATA CONTRACT BUILDERS
// ==========================================

export function formatSearchResultItem(data) {
  return {
    id: String(data.id || ''),
    siteId: String(data.siteId || data.provider || ''),
    title: String(data.title || 'Untitled'),
    coverUrl: data.coverUrl || null,
    genres: Array.isArray(data.genres) ? data.genres : [],
    status: data.status || 'Unknown',
    latestChapter: data.latestChapter ? String(data.latestChapter) : null
  };
}

export function formatMangaDetails(data) {
  return {
    id: String(data.id || ''),
    siteId: String(data.siteId || data.provider || ''),
    title: String(data.title || 'Untitled'),
    altTitles: Array.isArray(data.altTitles) ? data.altTitles : [],
    description: data.description || '',
    coverUrl: data.coverUrl || null,
    author: data.author || 'Unknown',
    status: data.status || 'Unknown',
    genres: Array.isArray(data.genres) ? data.genres : [],
    totalChapters: Array.isArray(data.chapters) ? data.chapters.length : 0,
    chapters: Array.isArray(data.chapters) ? data.chapters.map(c => ({
      id: String(c.id || ''),
      chapterNumber: String(c.chapterNumber || '0'),
      title: c.title || null,
      releaseDate: c.releaseDate || null,
      scanGroup: c.scanGroup || null
    })) : []
  };
}

export function formatChapterPages(data) {
  const pages = Array.isArray(data.pages) ? data.pages : [];
  const format = data.format || (data.downloadUrl?.endsWith('.pdf') ? 'pdf' : data.downloadUrl?.endsWith('.epub') ? 'epub' : 'images');

  return {
    siteId: String(data.siteId || data.provider || ''),
    mangaId: String(data.mangaId || ''),
    chapterId: String(data.chapterId || ''),
    chapterNumber: String(data.chapterNumber || '0'),
    format, // 'images' | 'pdf' | 'epub'
    downloadUrl: data.downloadUrl || null,
    totalPages: pages.length,
    pages: pages.map((p, idx) => ({
      page: typeof p.page === 'number' ? p.page : idx + 1,
      url: typeof p === 'string' ? p : p.url,
      headers: p.headers || undefined
    }))
  };
}
