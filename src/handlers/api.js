import { mangaController } from '../components/manga/manga.controller.js';
import { HttpResponse } from '../utils/httpResponse.js';
import { ImageProxy } from '../utils/imageProxy.js';

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
