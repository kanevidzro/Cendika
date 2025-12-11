import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';

// Request/Response logging middleware
export const requestLogger = createMiddleware(async (c: Context, next: Next) => {
  const start = Date.now();
  const method = c.req.method;
  const path = c.req.path;
  const requestId = c.get('requestId');

  // Log request
  logger.info({
    type: 'request_start',
    method,
    path,
    requestId,
    userAgent: c.req.header('user-agent'),
    ip: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
  }, `→ ${method} ${path}`);

  await next();

  const duration = Date.now() - start;
  const status = c.res.status;

  // Log response
  logger.info({
    type: 'request_end',
    method,
    path,
    status,
    duration: `${duration}ms`,
    requestId,
  }, `← ${method} ${path} ${status} (${duration}ms)`);
});

// API usage logging middleware
export const usageLogger = createMiddleware(async (c: Context, next: Next) => {
  const account = c.get('account');
  const apiKey = c.get('apiKey');
  const start = Date.now();

  await next();

  // Only log successful requests
  if (c.res.status >= 200 && c.res.status < 300 && account) {
    const duration = Date.now() - start;
    const method = c.req.method;
    const path = c.req.path;
    const serviceType = extractServiceType(path);

    logger.info({
      type: 'api_usage',
      accountId: account.id,
      apiKeyId: apiKey?.id,
      method,
      path,
      serviceType,
      status: c.res.status,
      duration: `${duration}ms`,
    }, 'API usage logged');
  }
});

// Audit logging middleware
export const auditLogger = (action: string, entity: string) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const account = c.get('account');
    const user = c.get('user');
    const apiKey = c.get('apiKey');

    await next();

    // Only log successful mutations (POST, PUT, PATCH, DELETE)
    if (
      c.res.status >= 200 && 
      c.res.status < 300 && 
      ['POST', 'PUT', 'PATCH', 'DELETE'].includes(c.req.method)
    ) {
      try {
        const body = await c.req.json().catch(() => ({}));
        
        await prisma.auditLog.create({
          data: {
            accountId: account?.id,
            action,
            entity,
            entityId: c.req.param('id'),
            actorType: user ? 'user' : 'api_key',
            actorId: user?.id || apiKey?.id,
            actorEmail: user?.email || account?.contactEmail,
            newData: body,
            ipAddress: c.req.header('x-forwarded-for') || c.req.header('x-real-ip'),
            userAgent: c.req.header('user-agent'),
            description: `${action} ${entity}`,
          },
        });

        logger.info({
          type: 'audit',
          action,
          entity,
          accountId: account?.id,
          actorId: user?.id || apiKey?.id,
        }, `Audit: ${action} ${entity}`);
      } catch (error) {
        logger.error({ error, action, entity }, 'Failed to create audit log');
      }
    }
  });
};

// Error logging middleware
export const errorLogger = createMiddleware(async (c: Context, next: Next) => {
  try {
    await next();
  } catch (error: any) {
    const account = c.get('account');
    const requestId = c.get('requestId');

    logger.error({
      type: 'error',
      error: {
        name: error.name,
        message: error.message,
        stack: error.stack,
      },
      accountId: account?.id,
      requestId,
      method: c.req.method,
      path: c.req.path,
    }, `Error: ${error.message}`);

    throw error; // Re-throw to be handled by error handler
  }
});

// SMS delivery logging
export const logSMSDelivery = async (
  messageId: string,
  status: string,
  provider?: string,
  error?: string
) => {
  logger.info({
    type: 'sms_delivery',
    messageId,
    status,
    provider,
    error,
  }, `SMS ${status}: ${messageId}`);
};

// Email delivery logging
export const logEmailDelivery = async (
  emailId: string,
  status: string,
  recipient: string,
  error?: string
) => {
  logger.info({
    type: 'email_delivery',
    emailId,
    status,
    recipient,
    error,
  }, `Email ${status} to ${recipient}`);
};

// Voice call logging
export const logVoiceCall = async (
  callId: string,
  status: string,
  duration?: number,
  error?: string
) => {
  logger.info({
    type: 'voice_call',
    callId,
    status,
    duration,
    error,
  }, `Voice call ${status}: ${callId}`);
};

// Payment logging
export const logPayment = async (
  accountId: string,
  amount: number,
  currency: string,
  method: string,
  status: string,
  transactionId?: string
) => {
  logger.info({
    type: 'payment',
    accountId,
    amount,
    currency,
    method,
    status,
    transactionId,
  }, `Payment ${status}: ${amount} ${currency}`);
};

// Webhook logging
export const logWebhook = async (
  webhookId: string,
  event: string,
  status: string,
  responseCode?: number,
  error?: string
) => {
  logger.info({
    type: 'webhook',
    webhookId,
    event,
    status,
    responseCode,
    error,
  }, `Webhook ${event} ${status}`);
};

// Extract service type from path
function extractServiceType(path: string): string {
  const match = path.match(/\/api\/v\d+\/([^/]+)/);
  return match ? match[1] : 'unknown';
}