import type { Context, Next } from 'hono';
import { logger as pinoLogger } from '@utils/logger';
import { env } from '@config/env';

// Custom logger middleware with request tracking
export const loggerPlugin = async (c: Context, next: Next) => {
  const start = Date.now();
  const requestId = c.get('requestId');
  const method = c.req.method;
  const url = c.req.url;
  const path = c.req.path;

  // Skip logging for health checks in production
  if (env.NODE_ENV === 'production' && path === '/health') {
    await next();
    return;
  }

  // Get request metadata
  const userAgent = c.req.header('user-agent') || 'unknown';
  const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 
             c.req.header('x-real-ip') || 
             'unknown';
  const referer = c.req.header('referer');

  // Log incoming request
  pinoLogger.info({
    type: 'http_request',
    requestId,
    method,
    path,
    url,
    ip,
    userAgent,
    referer,
  }, `→ ${method} ${path}`);

  try {
    await next();
  } catch (error: any) {
    // Log error
    pinoLogger.error({
      type: 'http_error',
      requestId,
      method,
      path,
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
    }, `✗ ${method} ${path} - ${error.message}`);
    
    throw error;
  }

  // Calculate response time
  const duration = Date.now() - start;
  const status = c.res.status;

  // Determine log level based on status
  const logLevel = status >= 500 ? 'error' : 
                   status >= 400 ? 'warn' : 
                   'info';

  // Log response
  pinoLogger[logLevel]({
    type: 'http_response',
    requestId,
    method,
    path,
    status,
    duration,
    contentLength: c.res.headers.get('content-length'),
  }, `← ${method} ${path} ${status} (${duration}ms)`);

  // Add custom timing header
  c.header('X-Response-Time', `${duration}ms`);

  // Warn on slow requests (> 1s)
  if (duration > 1000) {
    pinoLogger.warn({
      type: 'slow_request',
      requestId,
      method,
      path,
      duration,
    }, `⚠ Slow request: ${method} ${path} took ${duration}ms`);
  }
};

// Request size logger
export const requestSizeLogger = async (c: Context, next: Next) => {
  const contentLength = c.req.header('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);

    // Warn on large requests (> 5MB)
    if (size > 5 * 1024 * 1024) {
      pinoLogger.warn({
        type: 'large_request',
        requestId: c.get('requestId'),
        path: c.req.path,
        size,
        sizeMB,
      }, `Large request: ${sizeMB}MB`);
    }
  }

  await next();
};

// Response size logger
export const responseSizeLogger = async (c: Context, next: Next) => {
  await next();

  const contentLength = c.res.headers.get('content-length');
  
  if (contentLength) {
    const size = parseInt(contentLength);
    const sizeMB = (size / (1024 * 1024)).toFixed(2);

    // Warn on large responses (> 10MB)
    if (size > 10 * 1024 * 1024) {
      pinoLogger.warn({
        type: 'large_response',
        requestId: c.get('requestId'),
        path: c.req.path,
        size,
        sizeMB,
      }, `Large response: ${sizeMB}MB`);
    }
  }
};

// Performance logger for critical operations
export const performanceLogger = (operation: string) => {
  return async (c: Context, next: Next) => {
    const start = Date.now();
    
    await next();
    
    const duration = Date.now() - start;
    
    pinoLogger.info({
      type: 'performance',
      operation,
      duration,
      requestId: c.get('requestId'),
    }, `⏱ ${operation} completed in ${duration}ms`);
  };
};