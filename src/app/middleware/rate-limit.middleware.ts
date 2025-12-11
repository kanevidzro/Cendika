import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import { env } from '@config/env';

// In-memory rate limiting store (use Redis in production)
interface RateLimitStore {
  [key: string]: {
    count: number;
    resetAt: number;
  };
}

const rateLimitStore: RateLimitStore = {};

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  Object.keys(rateLimitStore).forEach(key => {
    if (rateLimitStore[key].resetAt < now) {
      delete rateLimitStore[key];
    }
  });
}, 5 * 60 * 1000);

interface RateLimitOptions {
  windowMs?: number;
  max?: number;
  keyGenerator?: (c: Context) => string;
  skipSuccessfulRequests?: boolean;
  message?: string;
}

export const rateLimit = (options: RateLimitOptions = {}) => {
  const {
    windowMs = env.RATE_LIMIT_WINDOW,
    max = env.RATE_LIMIT_MAX_REQUESTS,
    keyGenerator = (c: Context) => {
      const apiKey = c.get('apiKey');
      if (apiKey) return `api_key:${apiKey.id}`;
      
      const ip = c.req.header('x-forwarded-for')?.split(',')[0] || 
                 c.req.header('x-real-ip') || 
                 'unknown';
      return `ip:${ip}`;
    },
    skipSuccessfulRequests = false,
    message = 'Too many requests, please try again later',
  } = options;

  return createMiddleware(async (c: Context, next: Next) => {
    if (!env.ENABLE_RATE_LIMITING) {
      await next();
      return;
    }

    const key = keyGenerator(c);
    const now = Date.now();

    // Get or create rate limit entry
    if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
      rateLimitStore[key] = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    const store = rateLimitStore[key];

    // Check if rate limit exceeded
    if (store.count >= max) {
      const retryAfter = Math.ceil((store.resetAt - now) / 1000);
      
      logger.warn({
        key,
        count: store.count,
        max,
        retryAfter,
      }, 'Rate limit exceeded');

      c.header('X-RateLimit-Limit', max.toString());
      c.header('X-RateLimit-Remaining', '0');
      c.header('X-RateLimit-Reset', store.resetAt.toString());
      c.header('Retry-After', retryAfter.toString());

      return ResponseBuilder.rateLimit(c, retryAfter);
    }

    // Increment counter
    store.count++;

    // Set rate limit headers
    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', (max - store.count).toString());
    c.header('X-RateLimit-Reset', store.resetAt.toString());

    await next();

    // Reset counter if request was successful and skipSuccessfulRequests is true
    if (skipSuccessfulRequests && c.res.status < 400) {
      store.count--;
    }
  });
};

// API key specific rate limiting
export const apiKeyRateLimit = createMiddleware(async (c: Context, next: Next) => {
  const apiKey = c.get('apiKey');
  
  if (!apiKey || !apiKey.rateLimit) {
    await next();
    return;
  }

  const key = `api_key:${apiKey.id}`;
  const now = Date.now();
  const windowMs = 60 * 1000; // 1 minute window

  if (!rateLimitStore[key] || rateLimitStore[key].resetAt < now) {
    rateLimitStore[key] = {
      count: 0,
      resetAt: now + windowMs,
    };
  }

  const store = rateLimitStore[key];
  const max = apiKey.rateLimit;

  if (store.count >= max) {
    const retryAfter = Math.ceil((store.resetAt - now) / 1000);
    
    logger.warn({
      apiKeyId: apiKey.id,
      accountId: apiKey.accountId,
      count: store.count,
      max,
    }, 'API key rate limit exceeded');

    c.header('X-RateLimit-Limit', max.toString());
    c.header('X-RateLimit-Remaining', '0');
    c.header('X-RateLimit-Reset', store.resetAt.toString());

    return ResponseBuilder.rateLimit(c, retryAfter);
  }

  store.count++;

  c.header('X-RateLimit-Limit', max.toString());
  c.header('X-RateLimit-Remaining', (max - store.count).toString());
  c.header('X-RateLimit-Reset', store.resetAt.toString());

  await next();
});

// Service-specific rate limits
export const smsRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  message: 'SMS rate limit exceeded',
});

export const emailRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 50,
  message: 'Email rate limit exceeded',
});

export const voiceRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,
  message: 'Voice rate limit exceeded',
});

export const lookupRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 200,
  message: 'Lookup rate limit exceeded',
});