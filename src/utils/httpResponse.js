/**
 * Standardized HTTP API Gateway Response Formatter.
 */
export class HttpResponse {
  /**
   * Format a successful HTTP response.
   * @param {number} statusCode
   * @param {any} data
   * @param {Object} [meta={}]
   */
  static success(statusCode = 200, data, meta = {}) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({
        success: true,
        data,
        meta: {
          timestamp: new Date().toISOString(),
          ...meta
        }
      })
    };
  }

  /**
   * Format an error HTTP response.
   * @param {number} statusCode
   * @param {string} message
   * @param {any} [details=null]
   */
  static error(statusCode = 500, message = 'Internal Server Error', details = null) {
    return {
      statusCode,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Credentials': 'true'
      },
      body: JSON.stringify({
        success: false,
        error: {
          code: statusCode,
          message,
          ...(details ? { details } : {})
        },
        timestamp: new Date().toISOString()
      })
    };
  }
}
