import { mangaController } from '../components/manga/manga.controller.js';
import { HttpResponse } from '../utils/httpResponse.js';
import { ImageProxy } from '../utils/imageProxy.js';
import { swaggerUiHtml, openApiJson } from './swagger.js';

/**
 * Helper to safely extract JSON body payload from API Gateway event.
 */
function parseRequestBody(event) {
  if (!event.body) return {};
  try {
    const rawBody = event.isBase64Encoded 
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body;
    return typeof rawBody === 'string' ? JSON.parse(rawBody) : rawBody;
  } catch (err) {
    throw new Error('Malformed JSON payload in request body.');
  }
}

/**
 * Lambda Handler: GET /api/scrape/providers
 */
export const getProviders = async () => {
  return mangaController.handleGetProviders();
};

/**
 * Lambda Handler: GET /api/scrape/search
 */
export const scrapeSearch = async (event) => {
  const queryParams = event.queryStringParameters || {};
  return await mangaController.handleScrapeSearch(queryParams);
};

/**
 * Lambda Handler: GET /api/scrape/info
 */
export const scrapeInfo = async (event) => {
  const queryParams = event.queryStringParameters || {};
  return await mangaController.handleScrapeInfo(queryParams);
};

/**
 * Lambda Handler: GET /api/scrape/chapters
 */
export const scrapeChapters = async (event) => {
  const queryParams = event.queryStringParameters || {};
  return await mangaController.handleScrapeChapters(queryParams);
};

/**
 * Lambda Handler: GET /api/scrape/pages
 */
export const scrapePages = async (event) => {
  const queryParams = event.queryStringParameters || {};
  return await mangaController.handleScrapePages(queryParams);
};

/**
 * Lambda Handler: GET /search
 */
export const search = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    return await mangaController.handleSearch(queryParams);
  } catch (err) {
    return HttpResponse.error(500, 'Server Error in Search Handler', err.message);
  }
};

/**
 * Lambda Handler: GET /manga/{siteId}/{mangaId}
 */
export const getDetails = async (event) => {
  try {
    const pathParams = event.pathParameters || {};
    return await mangaController.handleGetDetails(pathParams);
  } catch (err) {
    return HttpResponse.error(500, 'Server Error in Details Handler', err.message);
  }
};

/**
 * Lambda Handler: GET /manga/{siteId}/{mangaId}/chapter/{chapterId}
 */
export const getChapterPages = async (event) => {
  try {
    const pathParams = event.pathParameters || {};
    return await mangaController.handleGetChapterPages(pathParams);
  } catch (err) {
    return HttpResponse.error(500, 'Server Error in Chapter Pages Handler', err.message);
  }
};

/**
 * Lambda Handler: POST /download/batch
 */
export const batchDownload = async (event) => {
  try {
    const bodyPayload = parseRequestBody(event);
    return await mangaController.handleBatchDownload(bodyPayload);
  } catch (err) {
    if (err.message.includes('Malformed JSON')) {
      return HttpResponse.error(400, err.message);
    }
    return HttpResponse.error(500, 'Server Error in Batch Download Handler', err.message);
  }
};

/**
 * Lambda Handler: GET /proxy/image or GET /api/proxy/image
 */
export const proxyImage = async (event) => {
  try {
    const queryParams = event.queryStringParameters || {};
    return ImageProxy.handleProxyRequest(queryParams);
  } catch (err) {
    return HttpResponse.error(500, 'Server Error in Image Proxy Handler', err.message);
  }
};

/**
 * Cloudflare Worker / ES Module Default Export Handler
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;
    const method = request.method.toUpperCase();

    const queryParams = {};
    url.searchParams.forEach((v, k) => { queryParams[k] = v; });

    try {
      if (path === '/docs') {
        const res = await swaggerUiHtml();
        return new Response(res.body, { status: res.statusCode, headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' } });
      }
      if (path === '/docs/openapi.json') {
        const res = await openApiJson();
        return new Response(res.body, { status: res.statusCode, headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' } });
      }
      if (path === '/proxy/image' || path === '/api/proxy/image') {
        const res = ImageProxy.handleProxyRequest(queryParams);
        return new Response('', { status: res.statusCode, headers: res.headers });
      }
      if (path === '/api/scrape/providers') {
        const res = mangaController.handleGetProviders();
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path === '/api/scrape/search') {
        const res = await mangaController.handleScrapeSearch(queryParams);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path === '/api/scrape/info') {
        const res = await mangaController.handleScrapeInfo(queryParams);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path === '/api/scrape/chapters') {
        const res = await mangaController.handleScrapeChapters(queryParams);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path === '/api/scrape/pages') {
        const res = await mangaController.handleScrapePages(queryParams);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path === '/search') {
        const res = await mangaController.handleSearch(queryParams);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
      if (path.startsWith('/manga/')) {
        const parts = path.split('/').filter(Boolean);
        if (parts.length >= 3 && parts[2] === 'chapter') {
          const res = await mangaController.handleGetChapterPages({ siteId: parts[0], mangaId: parts[1], chapterId: parts[3] });
          return new Response(res.body, { status: res.statusCode, headers: res.headers });
        } else if (parts.length >= 2) {
          const res = await mangaController.handleGetDetails({ siteId: parts[0], mangaId: parts[1] });
          return new Response(res.body, { status: res.statusCode, headers: res.headers });
        }
      }
      if (path === '/download/batch' && method === 'POST') {
        const body = await request.json().catch(() => ({}));
        const res = await mangaController.handleBatchDownload(body);
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }

      const defaultRes = mangaController.handleGetProviders();
      return new Response(defaultRes.body, { status: defaultRes.statusCode, headers: defaultRes.headers });
    } catch (err) {
      const errorRes = HttpResponse.error(500, 'Cloudflare Worker Error', err.message);
      return new Response(errorRes.body, { status: 500, headers: errorRes.headers });
    }
  }
};
