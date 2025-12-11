import type { Context, Next } from 'hono';
import { createMiddleware } from 'hono/factory';
import { ResponseBuilder } from '@utils/api-response';
import { logger } from '@utils/logger';
import prisma from '@database/prisma.client';
import { verify } from 'hono/jwt';
import { env } from '@config/env';

// API Key authentication middleware
export const apiKeyAuth = createMiddleware(async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key') || c.req.header('Authorization')?.replace('Bearer ', '');

  if (!apiKey) {
    logger.warn({ path: c.req.path }, 'API key missing');
    return ResponseBuilder.unauthorized(c, 'API key is required');
  }

  try {
    // Validate API key format
    if (!apiKey.startsWith(env.API_KEY_PREFIX)) {
      logger.warn({ apiKey: apiKey.substring(0, 10) }, 'Invalid API key format');
      return ResponseBuilder.unauthorized(c, 'Invalid API key format');
    }

    // Find API key in database
    const key = await prisma.apiKey.findUnique({
      where: { key: apiKey },
      include: {
        account: {
          select: {
            id: true,
            status: true,
            walletBalance: true,
            creditBalance: true,
            type: true,
            isPersonal: true,
            country: true,
            currency: true,
          },
        },
      },
    });

    if (!key) {
      logger.warn({ apiKey: apiKey.substring(0, 10) }, 'API key not found');
      return ResponseBuilder.unauthorized(c, 'Invalid API key');
    }

    // Check if key is active
    if (!key.isActive) {
      logger.warn({ keyId: key.id }, 'API key is inactive');
      return ResponseBuilder.unauthorized(c, 'API key is inactive');
    }

    // Check if key has expired
    if (key.expiresAt && new Date(key.expiresAt) < new Date()) {
      logger.warn({ keyId: key.id, expiresAt: key.expiresAt }, 'API key has expired');
      return ResponseBuilder.unauthorized(c, 'API key has expired');
    }

    // Check account status
    if (key.account.status !== 'ACTIVE') {
      logger.warn({ accountId: key.accountId, status: key.account.status }, 'Account is not active');
      return ResponseBuilder.forbidden(c, 'Account is not active');
    }

    // Check IP whitelist if configured
    if (key.ipWhitelist && key.ipWhitelist.length > 0) {
      const clientIp = c.req.header('x-forwarded-for')?.split(',')[0] || 
                       c.req.header('x-real-ip') || 
                       'unknown';
      
      if (!key.ipWhitelist.includes(clientIp)) {
        logger.warn({ keyId: key.id, clientIp, whitelist: key.ipWhitelist }, 'IP not in whitelist');
        return ResponseBuilder.forbidden(c, 'IP address not allowed');
      }
    }

    // Update last used timestamp (async, don't await)
    prisma.apiKey.update({
      where: { id: key.id },
      data: {
        lastUsedAt: new Date(),
        totalRequests: { increment: 1 },
      },
    }).catch((error: any) => {
      logger.error({ error, keyId: key.id }, 'Failed to update API key usage');
    });

    // Set account and key info in context
    c.set('apiKey', key);
    c.set('account', key.account);
    c.set('accountId', key.accountId);

    await next();
  } catch (error) {
    logger.error({ error, path: c.req.path }, 'API key authentication error');
    return ResponseBuilder.serverError(c, 'Authentication error');
  }
});

// JWT authentication middleware (for user sessions)
export const jwtAuth = createMiddleware(async (c: Context, next: Next) => {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');

  if (!token) {
    return ResponseBuilder.unauthorized(c, 'Access token is required');
  }

  try {
    const payload = await verify(token, env.JWT_SECRET);

    if (!payload || !payload.userId) {
      return ResponseBuilder.unauthorized(c, 'Invalid token');
    }

    // Check if session is valid
    const session = await prisma.session.findUnique({
      where: { token },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    });

    if (!session || !session.isActive) {
      return ResponseBuilder.unauthorized(c, 'Invalid or expired session');
    }

    if (new Date(session.expiresAt) < new Date()) {
      return ResponseBuilder.unauthorized(c, 'Session has expired');
    }

    // Update last active timestamp
    prisma.session.update({
      where: { id: session.id },
      data: { lastActiveAt: new Date() },
    }).catch((error: any) => {
      logger.error({ error, sessionId: session.id }, 'Failed to update session');
    });

    c.set('user', session.user);
    c.set('userId', session.userId);
    c.set('session', session);

    await next();
  } catch (error) {
    logger.error({ error }, 'JWT authentication error');
    return ResponseBuilder.unauthorized(c, 'Invalid or expired token');
  }
});

// Optional authentication - continues if no auth provided
export const optionalAuth = createMiddleware(async (c: Context, next: Next) => {
  const apiKey = c.req.header('X-API-Key');
  const bearerToken = c.req.header('Authorization');

  if (!apiKey && !bearerToken) {
    await next();
    return;
  }

  if (apiKey) {
    return apiKeyAuth(c, next);
  }

  if (bearerToken) {
    return jwtAuth(c, next);
  }

  await next();
});

// Check permissions middleware
export const requirePermissions = (...permissions: string[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const apiKey = c.get('apiKey');
    
    if (!apiKey) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    const hasPermission = permissions.every(permission => 
      apiKey.permissions.includes(permission)
    );

    if (!hasPermission) {
      logger.warn({ 
        keyId: apiKey.id, 
        required: permissions, 
        has: apiKey.permissions 
      }, 'Insufficient permissions');
      return ResponseBuilder.forbidden(c, 'Insufficient permissions');
    }

    await next();
  });
};

// Check account type middleware
export const requireAccountType = (...types: string[]) => {
  return createMiddleware(async (c: Context, next: Next) => {
    const account = c.get('account');
    
    if (!account) {
      return ResponseBuilder.unauthorized(c, 'Authentication required');
    }

    if (!types.includes(account.type)) {
      logger.warn({ 
        accountId: account.id, 
        accountType: account.type, 
        required: types 
      }, 'Account type not allowed');
      return ResponseBuilder.forbidden(c, `This feature requires ${types.join(' or ')} account`);
    }

    await next();
  });
};