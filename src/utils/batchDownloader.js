import axios from 'axios';
import pLimit from 'p-limit';

/**
 * High-performance batch image downloader optimized for Serverless execution.
 * Handles concurrency limiting, exponential retries, streaming, and image quality options.
 */
export class BatchDownloader {
  /**
   * Process batch downloading of image URLs.
   * 
   * @param {Array<{ url: string, id?: string, filename?: string, headers?: Record<string, string> }>} items
   * @param {Object} options
   * @param {number} [options.concurrency=5] - Number of parallel workers (1-10)
   * @param {number} [options.quality=80] - Image compression quality (10-100)
   * @param {string} [options.format='original'] - Target format: 'original' | 'webp' | 'jpeg' | 'png'
   * @param {number} [options.maxWidth] - Optional maximum width resize limit
   * @returns {Promise<Object>}
   */
  static async processBatch(items, options = {}) {
    const concurrency = Math.min(Math.max(options.concurrency || 5, 1), 10);
    const limit = pLimit(concurrency);
    const startTime = Date.now();

    // Dynamically attempt loading sharp for WebP conversion/resizing
    let sharp = null;
    try {
      const sharpModule = await import('sharp');
      sharp = sharpModule.default || sharpModule;
    } catch (e) {
      // sharp optional binary not available in local environment, fallback to raw buffer processing
    }

    const downloadTasks = items.map((item, index) => {
      return limit(() => this.downloadSingleImage(item, index, options, sharp));
    });

    const results = await Promise.allSettled(downloadTasks);

    const processed = results.map((res, idx) => {
      if (res.status === 'fulfilled') {
        return res.value;
      }
      return {
        index: idx,
        id: items[idx].id || `img_${idx}`,
        url: items[idx].url,
        success: false,
        error: res.reason?.message || 'Download failed',
        byteLength: 0
      };
    });

    const successfulCount = processed.filter(p => p.success).length;
    const failedCount = processed.length - successfulCount;

    return {
      summary: {
        total: items.length,
        successful: successfulCount,
        failed: failedCount,
        concurrency,
        format: options.format || 'original',
        durationMs: Date.now() - startTime
      },
      images: processed
    };
  }

  /**
   * Download a single image with retry logic and quality compression.
   */
  static async downloadSingleImage(item, index, options, sharpInstance) {
    const { url, id, filename, headers = {} } = item;
    const imageId = id || `page_${index + 1}`;
    let attempts = 0;
    const maxRetries = 3;

    while (attempts <= maxRetries) {
      try {
        attempts++;
        const downloadStart = Date.now();

        const response = await axios.get(url, {
          responseType: 'arraybuffer',
          timeout: 12000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
            'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
            ...headers
          }
        });

        let rawBuffer = Buffer.from(response.data);
        let mimeType = response.headers['content-type'] || 'image/jpeg';
        let processedFormat = options.format || 'original';

        // Apply Sharp processing if requested and available
        if (sharpInstance && (options.format !== 'original' || options.maxWidth || options.quality < 100)) {
          try {
            let pipeline = sharpInstance(rawBuffer);

            if (options.maxWidth) {
              pipeline = pipeline.resize({ width: options.maxWidth, withoutEnlargement: true });
            }

            if (options.format === 'webp') {
              pipeline = pipeline.webp({ quality: options.quality || 80 });
              mimeType = 'image/webp';
            } else if (options.format === 'jpeg') {
              pipeline = pipeline.jpeg({ quality: options.quality || 80 });
              mimeType = 'image/jpeg';
            } else if (options.format === 'png') {
              pipeline = pipeline.png({ compressionLevel: 8 });
              mimeType = 'image/png';
            }

            rawBuffer = await pipeline.toBuffer();
          } catch (sharpError) {
            // Fallback to raw buffer if sharp transformations fail
          }
        }

        return {
          index,
          id: imageId,
          url,
          filename: filename || `${imageId}.${mimeType.split('/')[1] || 'jpg'}`,
          success: true,
          mimeType,
          byteLength: rawBuffer.length,
          base64Data: rawBuffer.toString('base64'),
          latencyMs: Date.now() - downloadStart
        };
      } catch (err) {
        if (attempts > maxRetries) {
          throw new Error(`Failed after ${maxRetries} retries: ${err.message}`);
        }
        // Exponential backoff with jitter
        const backoffMs = Math.pow(2, attempts) * 300 + Math.floor(Math.random() * 200);
        await new Promise(r => setTimeout(r, backoffMs));
      }
    }
  }
}
