/**
 * Lightweight OpenAPI 3.0 Specification & Swagger UI HTML Handler.
 */

export const openApiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'Comics & Manga Scraper Ecosystem API',
    version: '1.0.0',
    description: 'Enterprise-grade Serverless REST API ecosystem for high-volume comic & manga data retrieval across 1,200+ site sources. Powered by AWS Lambda, Strategy Pattern scraper registry, wsrv.nl image caching, and stream batch downloading.'
  },
  servers: [
    { url: '/', description: 'Current Serverless Deployment' }
  ],
  paths: {
    '/search': {
      get: {
        summary: 'Parallel search across registered site scrapers',
        parameters: [
          { name: 'q', in: 'query', required: true, schema: { type: 'string' }, description: 'Search term (e.g. Naruto)' },
          { name: 'sites', in: 'query', required: false, schema: { type: 'string', default: 'mangadex,comick,asurascans' }, description: 'Comma-separated site IDs' }
        ],
        responses: {
          200: { description: 'Search results aggregated across scrapers' },
          400: { description: 'Validation or invalid site ID error' }
        }
      }
    },
    '/manga/{siteId}/{mangaId}': {
      get: {
        summary: 'Load deep metadata and chapter list for a manga',
        parameters: [
          { name: 'siteId', in: 'path', required: true, schema: { type: 'string' }, description: 'Target site scraper ID (e.g. mangadex, comick, asurascans)' },
          { name: 'mangaId', in: 'path', required: true, schema: { type: 'string' }, description: 'Manga unique ID or slug' }
        ],
        responses: {
          200: { description: 'Full manga metadata and chapter list' },
          404: { description: 'Manga not found' }
        }
      }
    },
    '/manga/{siteId}/{mangaId}/chapter/{chapterId}': {
      get: {
        summary: 'Fetch reading page image URLs for a chapter',
        parameters: [
          { name: 'siteId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'mangaId', in: 'path', required: true, schema: { type: 'string' } },
          { name: 'chapterId', in: 'path', required: true, schema: { type: 'string' } }
        ],
        responses: {
          200: { description: 'List of chapter page image URLs' }
        }
      }
    },
    '/download/batch': {
      post: {
        summary: 'Batch streaming download and optimization of chapter images',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  images: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        id: { type: 'string' },
                        url: { type: 'string' }
                      },
                      required: ['url']
                    }
                  },
                  options: {
                    type: 'object',
                    properties: {
                      quality: { type: 'integer', default: 80 },
                      format: { type: 'string', enum: ['original', 'webp', 'jpeg', 'png'], default: 'original' },
                      concurrency: { type: 'integer', default: 5 }
                    }
                  }
                },
                required: ['images']
              }
            }
          }
        },
        responses: {
          200: { description: 'Batch download execution report and base64 image buffers' }
        }
      }
    },
    '/proxy/image': {
      get: {
        summary: 'On-the-fly image cache & resize proxy via wsrv.nl',
        parameters: [
          { name: 'url', in: 'query', required: true, schema: { type: 'string' }, description: 'Target image URL to proxy' },
          { name: 'w', in: 'query', required: false, schema: { type: 'integer' }, description: 'Optional target width' },
          { name: 'q', in: 'query', required: false, schema: { type: 'integer', default: 80 }, description: 'Quality (1-100)' },
          { name: 'output', in: 'query', required: false, schema: { type: 'string', enum: ['webp', 'jpeg', 'png'], default: 'webp' } }
        ],
        responses: {
          302: { description: 'Redirect to global CDN edge image server' }
        }
      }
    }
  }
};

/**
 * Lambda Handler: GET /docs/openapi.json
 */
export const openApiJson = async () => {
  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*'
    },
    body: JSON.stringify(openApiSpec, null, 2)
  };
};

/**
 * Lambda Handler: GET /docs
 */
export const swaggerUiHtml = async () => {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Comics & Manga Scraper API Documentation</title>
  <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui.css" />
  <style>
    body { margin: 0; padding: 0; background: #0f172a; }
    .swagger-ui { filter: invert(88%) hue-rotate(180deg); }
    .swagger-ui .topbar { display: none; }
  </style>
</head>
<body>
  <div id="swagger-ui"></div>
  <script src="https://cdn.jsdelivr.net/npm/swagger-ui-dist@5/swagger-ui-bundle.js"></script>
  <script>
    window.onload = () => {
      window.ui = SwaggerUIBundle({
        url: '/docs/openapi.json',
        dom_id: '#swagger-ui',
        deepLinking: true,
        presets: [
          SwaggerUIBundle.presets.apis,
          SwaggerUIBundle.SwaggerUIStandalonePreset
        ]
      });
    };
  </script>
</body>
</html>`;

  return {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/html; charset=utf-8',
      'Access-Control-Allow-Origin': '*'
    },
    body: html
  };
};
