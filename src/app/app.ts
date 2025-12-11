import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger as honoLogger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { secureHeaders } from 'hono/secure-headers';
import { requestId } from 'hono/request-id';
import { timing } from 'hono/timing';
import { compress } from 'hono/compress';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { ResponseBuilder } from '@utils/api-response';
//import type { Context } from 'hono';

// Create Hono app
const app = new Hono();
 
// ============================================
// GLOBAL MIDDLEWARE
// ============================================

// Request ID
app.use('*', requestId());

// Timing
app.use('*', timing());

// Security headers
app.use('*', secureHeaders());

// CORS
app.use('*', cors({
  origin: env.CORS_ORIGIN.split(','),
  credentials: env.CORS_CREDENTIALS,
  allowMethods: env.CORS_METHODS.split(','),
  allowHeaders: ['Content-Type', 'Authorization', 'X-API-Key'],
  exposeHeaders: ['X-Request-Id', 'X-Response-Time'],
  maxAge: 86400,
}));

// Compression
app.use('*', compress());

// Pretty JSON in development
if (env.NODE_ENV === 'development') {
  app.use('*', prettyJSON());
}

// Logger middleware
app.use('*', honoLogger((message, ...rest) => {
  logger.info({ message, ...rest });
}));

// Request logging middleware
app.use('*', async (c, next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  logger.info({
    type: 'http',
    method,
    path,
    status,
    duration: `${duration}ms`,
    requestId: c.get('requestId'),
  }, `${method} ${path} ${status} - ${duration}ms`);
});

// Error handling middleware
app.onError((err, c) => {
  logger.error({
    error: err.message,
    stack: err.stack,
    path: c.req.path,
    method: c.req.method,
  }, 'Request error');

  return ResponseBuilder.serverError(
    c,
    env.NODE_ENV === 'development' ? err.message : 'Internal server error',
    env.NODE_ENV === 'development' ? err.stack : undefined
  );
});

// 404 handler
app.notFound((c) => {
  return ResponseBuilder.notFound(c, 'Route');
});

// ============================================
// ROUTES
// ============================================

// Health check
app.get('/health', async (c) => {
  const { checkDatabaseHealth } = await import('@database/prisma.client');
  const dbHealthy = await checkDatabaseHealth();
  
  const health = {
    status: dbHealthy ? 'healthy' : 'unhealthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: env.NODE_ENV,
    version: env.APP_VERSION,
    database: dbHealthy ? 'connected' : 'disconnected',
  };

  return c.json(health, dbHealthy ? 200 : 503);
});

// Welcome route
app.get('/', (c) => {
  return ResponseBuilder.success(c, {
    name: env.APP_NAME,
    version: env.APP_VERSION,
    environment: env.NODE_ENV,
    documentation: `${env.APP_URL}/docs`,
    health: `${env.APP_URL}/health`,
  }, 'Welcome to AfriCom API');
});

// API v1 routes
app.route('/api/v1', await import('./routes/v1/index').then(m => m.default));

export default app;