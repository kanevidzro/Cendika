import { swaggerUI } from '@hono/swagger-ui';
import type { Context } from 'hono';
import { env } from '@config/env';

// OpenAPI specification
export const openApiSpec = {
  openapi: '3.0.0',
  info: {
    title: 'AfriCom API',
    version: env.APP_VERSION,
    description: `
# African Communication Platform API

Unified REST API for sending SMS, emails, voice calls, WhatsApp messages, push notifications, and more across Africa.

## Features

- 📱 **SMS** - Send SMS across African networks
- 📧 **Email** - SMTP email delivery
- 📞 **Voice** - Voice calls and IVR
- 💬 **WhatsApp** - WhatsApp Business API
- 🔔 **Push** - Web and mobile push notifications
- 🔍 **Lookup** - Phone number validation
- ✅ **Verify** - OTP verification
- 💬 **Chat** - Live chat widget

## Authentication

All API requests require authentication using an API key:

\`\`\`
X-API-Key: ak_live_your_api_key_here
\`\`\`

Or using Bearer token:

\`\`\`
Authorization: Bearer your_api_key_here
\`\`\`

## Rate Limiting

API requests are rate limited based on your account plan. Rate limit information is returned in response headers:

- \`X-RateLimit-Limit\` - Maximum requests allowed
- \`X-RateLimit-Remaining\` - Remaining requests
- \`X-RateLimit-Reset\` - Reset timestamp

## Error Codes

| Code | Description |
|------|-------------|
| UNAUTHORIZED | Missing or invalid API key |
| FORBIDDEN | Insufficient permissions |
| VALIDATION_ERROR | Invalid request parameters |
| INSUFFICIENT_BALANCE | Account balance too low |
| RATE_LIMIT_EXCEEDED | Too many requests |
| SERVICE_UNAVAILABLE | Service temporarily unavailable |

## Support

- Documentation: ${env.APP_URL}/docs
- API Status: ${env.APP_URL}/health
    `,
    contact: {
      name: 'AfriCom Support',
      email: 'support@africom.com',
      url: 'https://africom.com/support',
    },
    license: {
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    },
  },
  servers: [
    {
      url: env.APP_URL,
      description: env.NODE_ENV === 'production' ? 'Production' : 'Development',
    },
  ],
  tags: [
    { name: 'SMS', description: 'SMS messaging operations' },
    { name: 'Email', description: 'Email delivery operations' },
    { name: 'Voice', description: 'Voice call operations' },
    { name: 'WhatsApp', description: 'WhatsApp messaging operations' },
    { name: 'Push', description: 'Push notification operations' },
    { name: 'Lookup', description: 'Phone number lookup operations' },
    { name: 'Verify', description: 'OTP verification operations' },
    { name: 'Chat', description: 'Live chat operations' },
    { name: 'Billing', description: 'Billing and payment operations' },
    { name: 'Auth', description: 'Authentication operations' },
  ],
  components: {
    securitySchemes: {
      ApiKeyAuth: {
        type: 'apiKey',
        in: 'header',
        name: 'X-API-Key',
        description: 'API key authentication',
      },
      BearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'API Key',
        description: 'Bearer token authentication',
      },
    },
    schemas: {
      Error: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: false },
          error: {
            type: 'object',
            properties: {
              code: { type: 'string', example: 'VALIDATION_ERROR' },
              message: { type: 'string', example: 'Invalid phone number format' },
              details: { type: 'object' },
            },
          },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string' },
        },
      },
      Success: {
        type: 'object',
        properties: {
          success: { type: 'boolean', example: true },
          message: { type: 'string' },
          data: { type: 'object' },
          timestamp: { type: 'string', format: 'date-time' },
          requestId: { type: 'string' },
        },
      },
      PhoneNumber: {
        type: 'string',
        pattern: '^\\+?[1-9]\\d{1,14}$',
        example: '+233244123456',
        description: 'Phone number in E.164 format',
      },
      CountryCode: {
        type: 'string',
        pattern: '^[A-Z]{2}$',
        example: 'GH',
        description: 'ISO 3166-1 alpha-2 country code',
      },
    },
    responses: {
      Unauthorized: {
        description: 'Unauthorized - Invalid or missing API key',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      Forbidden: {
        description: 'Forbidden - Insufficient permissions',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      NotFound: {
        description: 'Resource not found',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      ValidationError: {
        description: 'Validation error',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
      RateLimitExceeded: {
        description: 'Rate limit exceeded',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
        headers: {
          'X-RateLimit-Limit': {
            schema: { type: 'integer' },
            description: 'Request limit per window',
          },
          'X-RateLimit-Remaining': {
            schema: { type: 'integer' },
            description: 'Remaining requests in window',
          },
          'X-RateLimit-Reset': {
            schema: { type: 'integer' },
            description: 'Window reset timestamp',
          },
          'Retry-After': {
            schema: { type: 'integer' },
            description: 'Seconds until retry',
          },
        },
      },
      InsufficientBalance: {
        description: 'Insufficient account balance',
        content: {
          'application/json': {
            schema: { $ref: '#/components/schemas/Error' },
          },
        },
      },
    },
  },
  security: [
    { ApiKeyAuth: [] },
    { BearerAuth: [] },
  ],
  paths: {}, // To be populated by route handlers
};

// Swagger UI configuration
export const swaggerConfig = swaggerUI({
  url: '/api/openapi.json',
  version: '3.0.0',
});

// Serve OpenAPI JSON
export const serveOpenApiJson = (c: Context) => {
  return c.json(openApiSpec);
};

// Redoc documentation (alternative to Swagger UI)
export const redocHtml = `
<!DOCTYPE html>
<html>
  <head>
    <title>AfriCom API Documentation</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>
      body { margin: 0; padding: 0; }
    </style>
  </head>
  <body>
    <redoc spec-url='/api/openapi.json'></redoc>
    <script src="https://cdn.redoc.ly/redoc/latest/bundles/redoc.standalone.js"></script>
  </body>
</html>
`;

// Serve Redoc
export const serveRedoc = (c: Context) => {
  return c.html(redocHtml);
};