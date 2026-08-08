import { HttpResponse } from './httpResponse.js';

/**
 * Image Cache & Resize utility powered by wsrv.nl (300+ global datacenters).
 */
export class ImageProxy {
  /**
   * Format an external image URL to route through wsrv.nl global CDN cache.
   * 
   * @param {string} imageUrl - Direct source image URL
   * @param {Object} [options={}]
   * @param {number} [options.width] - Optional target width resize
   * @param {number} [options.height] - Optional target height resize
   * @param {number} [options.quality=80] - Compression quality (1-100)
   * @param {string} [options.output='webp'] - Target format ('webp' | 'jpeg' | 'png' | 'json')
   * @param {boolean} [options.isAnimated=false] - Preserves GIF/WebP animations
   * @returns {string}
   */
  static buildWsrvUrl(imageUrl, options = {}) {
    if (!imageUrl || typeof imageUrl !== 'string') return imageUrl;

    const baseUrl = 'https://wsrv.nl/';
    const params = new URLSearchParams();

    params.set('url', imageUrl);
    params.set('q', String(options.quality || 80));
    params.set('output', options.output || 'webp');
    
    if (options.width) params.set('w', String(options.width));
    if (options.height) params.set('h', String(options.height));
    if (options.isAnimated) params.set('n', '-1');

    return `${baseUrl}?${params.toString()}`;
  }

  /**
   * Handle GET /proxy/image endpoint.
   * Redirects to the optimized wsrv.nl CDN URL or formats response.
   * 
   * @param {Object} queryParams
   */
  static handleProxyRequest(queryParams) {
    const rawUrl = queryParams?.url;
    if (!rawUrl || typeof rawUrl !== 'string') {
      return HttpResponse.error(400, 'Missing required query parameter "url".');
    }

    const options = {
      width: queryParams.w ? parseInt(queryParams.w, 10) : undefined,
      height: queryParams.h ? parseInt(queryParams.h, 10) : undefined,
      quality: queryParams.q ? parseInt(queryParams.q, 10) : 80,
      output: queryParams.output || 'webp'
    };

    const proxiedUrl = this.buildWsrvUrl(rawUrl, options);

    // Return 302 Redirect to wsrv.nl edge server for instant browser caching
    return {
      statusCode: 302,
      headers: {
        'Location': proxiedUrl,
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*'
      },
      body: ''
    };
  }
}
