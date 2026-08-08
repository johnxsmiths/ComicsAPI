import { mangaController } from '../src/components/manga/manga.controller.js';
import { HttpResponse } from '../utils/httpResponse.js';
import { ImageProxy } from '../utils/imageProxy.js';
import { swaggerUiHtml, openApiJson } from '../src/handlers/swagger.js';

export async function onRequest(context) {
  const url = new URL(context.request.url);
  const path = url.pathname;
  const method = context.request.method.toUpperCase();

  // Extract query parameters as key-value object
  const queryParams = {};
  url.searchParams.forEach((val, key) => {
    queryParams[key] = val;
  });

  try {
    // 1. Interactive Swagger UI Documentation
    if (path === '/docs') {
      const res = await swaggerUiHtml();
      return new Response(res.body, {
        status: res.statusCode,
        headers: { 'Content-Type': 'text/html; charset=utf-8', 'Access-Control-Allow-Origin': '*' }
      });
    }

    if (path === '/docs/openapi.json') {
      const res = await openApiJson();
      return new Response(res.body, {
        status: res.statusCode,
        headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
      });
    }

    // 2. Image Proxy Endpoint
    if (path === '/proxy/image' || path === '/api/proxy/image') {
      const res = ImageProxy.handleProxyRequest(queryParams);
      return new Response('', {
        status: res.statusCode,
        headers: res.headers
      });
    }

    // 3. MangaScrapeAPI Compatibility Endpoints (/api/scrape/*)
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

    // 4. Standard REST Endpoints
    if (path === '/search') {
      const res = await mangaController.handleSearch(queryParams);
      return new Response(res.body, { status: res.statusCode, headers: res.headers });
    }

    if (path.startsWith('/manga/')) {
      const parts = path.split('/').filter(Boolean);
      if (parts.length >= 3 && parts[3] === 'chapter') {
        const res = await mangaController.handleGetChapterPages({
          siteId: parts[1],
          mangaId: parts[2],
          chapterId: parts[4]
        });
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      } else if (parts.length >= 2) {
        const res = await mangaController.handleGetDetails({
          siteId: parts[1],
          mangaId: parts[2]
        });
        return new Response(res.body, { status: res.statusCode, headers: res.headers });
      }
    }

    if (path === '/download/batch' && method === 'POST') {
      const body = await context.request.json().catch(() => ({}));
      const res = await mangaController.handleBatchDownload(body);
      return new Response(res.body, { status: res.statusCode, headers: res.headers });
    }

    // Default static fallback or 404
    return context.next();
  } catch (err) {
    const errorRes = HttpResponse.error(500, 'Cloudflare Worker Error', err.message);
    return new Response(errorRes.body, { status: 500, headers: errorRes.headers });
  }
}
