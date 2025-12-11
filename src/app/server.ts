import { serve } from '@hono/node-server';
import app from './app';
import { env } from '@config/env';
import { logger } from '@utils/logger';
import { connectDatabase, disconnectDatabase } from '@database/prisma.client';

// ============================================
// STARTUP
// ============================================

async function startServer() {
  try {
    // Connect to database
    await connectDatabase();

    // Start server
    const server = serve({
      fetch: app.fetch,
      port: env.APP_PORT,
      hostname: env.APP_HOST,
    });

    logger.info(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║  🚀 ${env.APP_NAME} v${env.APP_VERSION}                   ║
║                                                           ║
║  Environment: ${env.NODE_ENV.toUpperCase().padEnd(41)}    ║
║  Server URL:  ${env.APP_URL.padEnd(41)}                   ║
║  Port:        ${env.APP_PORT.toString().padEnd(41)}       ║
║  Host:        ${env.APP_HOST.padEnd(41)}                  ║
║                                                           ║
║  📚 API Docs: ${(env.APP_URL + '/docs').padEnd(31)}       ║
║  ❤️ Health Check:  ${(env.APP_URL + '/health').padEnd(31)}║
║                                                           ║
║  🌍 African Communication Platform                        ║
║     SMS • Email • Voice • WhatsApp • Push • Chat          ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝
    `);

    logger.info(`✅ Server is running on ${env.APP_URL}`);

    // ============================================
    // GRACEFUL SHUTDOWN
    // ============================================

    const shutdown = async (signal: string) => {
      logger.info(`${signal} received, shutting down gracefully...`);

      // Close server
      server.close(() => {
        logger.info('HTTP server closed');
      });

      // Disconnect database
      await disconnectDatabase();

      logger.info('✅ Graceful shutdown completed');
      process.exit(0);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // Handle uncaught exceptions
    process.on('uncaughtException', (error) => {
      logger.error({ error }, '❌ Uncaught Exception');
      process.exit(1);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (reason, promise) => {
      logger.error({ reason, promise }, '❌ Unhandled Rejection');
      process.exit(1);
    });

  } catch (error) {
    logger.error({ error }, '❌ Failed to start server');
    process.exit(1);
  }
}

// Start the server
startServer();