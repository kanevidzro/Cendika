import type { Context } from 'hono';
import { cors } from 'hono/cors';
import { env } from '@config/env';

// CORS configuration
export const corsConfig = () => {
  const origins = env.CORS_ORIGIN.split(',').map(origin => origin.trim());
  const methods = env.CORS_METHODS.split(',').map(method => method.trim());

  return cors({
    origin: (origin) => {
      // Allow all origins in development
      if (env.NODE_ENV === 'development') {
        return origin;
      }

      // Check if origin is in allowed list
      if (origins.includes('*')) {
        return origin;
      }

      if (origins.includes(origin)) {
        return origin;
      }

      // Allow subdomains if parent domain is allowed
      const allowed = origins.some(allowedOrigin => {
        if (allowedOrigin.startsWith('*.')) {
          const domain = allowedOrigin.substring(2);
          return origin.endsWith(domain);
        }
        return false;
      });

      if (allowed) {
        return origin;
      }

      return origins[0]; // Return first allowed origin as fallback
    },
    allowMethods: methods,
    allowHeaders: [
      'Content-Type',
      'Authorization',
      'X-API-Key',
      'X-Request-ID',
      'X-Signature',
    ],
    exposeHeaders: [
      'X-Request-ID',
      'X-Response-Time',
      'X-RateLimit-Limit',
      'X-RateLimit-Remaining',
      'X-RateLimit-Reset',
      'X-Low-Balance-Warning',
      'X-Remaining-Balance',
    ],
    credentials: env.CORS_CREDENTIALS,
    maxAge: 86400, // 24 hours
  });
};

// Custom CORS handler for specific routes
export const apiCors = corsConfig();

// Pre-flight request handler
export const handlePreflight = (c: Context) => {
  c.header('Access-Control-Allow-Origin', c.req.header('origin') || '*');
  c.header('Access-Control-Allow-Methods', env.CORS_METHODS);
  c.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-API-Key');
  c.header('Access-Control-Max-Age', '86400');
  
  if (env.CORS_CREDENTIALS) {
    c.header('Access-Control-Allow-Credentials', 'true');
  }

  return c.body(null, 204);
};