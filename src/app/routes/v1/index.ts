import { Hono } from 'hono';
import { ResponseBuilder } from '@utils/api-response';

const v1Router = new Hono();

// API v1 info
v1Router.get('/', (c) => {
  return ResponseBuilder.success(c, {
    version: 'v1',
    endpoints: {
      auth: '/api/v1/auth',
      sms: '/api/v1/sms',
      email: '/api/v1/email',
      voice: '/api/v1/voice',
      whatsapp: '/api/v1/whatsapp',
      push: '/api/v1/push',
      lookup: '/api/v1/lookup',
      verify: '/api/v1/verify',
      chat: '/api/v1/chat',
      billing: '/api/v1/billing',
    },
    documentation: '/docs',
  }, 'AfriCom API v1');
});

// Health endpoint for v1
v1Router.get('/health', async (c) => {
  return ResponseBuilder.success(c, {
    status: 'healthy',
    version: 'v1',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// MODULE ROUTES (to be added)
// ============================================

// v1Router.route('/auth', authRouter);
// v1Router.route('/sms', smsRouter);
// v1Router.route('/email', emailRouter);
// v1Router.route('/voice', voiceRouter);
// v1Router.route('/whatsapp', whatsappRouter);
// v1Router.route('/push', pushRouter);
// v1Router.route('/lookup', lookupRouter);
// v1Router.route('/verify', verifyRouter);
// v1Router.route('/chat', chatRouter);
// v1Router.route('/billing', billingRouter);

export default v1Router;