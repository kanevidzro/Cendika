// prisma.ts - Updated for Prisma v7 with global integration
import { PrismaClient } from '../../../generated/prisma/client';
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from 'pg';
import type { Context, Next } from 'hono';
import { logger } from '@utils/logger';
import * as dotenv from 'dotenv';

dotenv.config();

// Global type declaration for development
declare global {
  var prismaGlobal: PrismaClient | undefined;
}

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error('DATABASE_URL is not set');
}

// Singleton creation function matching your v6 pattern
const prismaClientSingleton = () => {
  // Create connection pool
  const pool = new Pool({ connectionString: databaseUrl });
  const adapter = new PrismaPg(pool);
  
  return new PrismaClient({
    adapter,
    log: [
      { level: 'warn', emit: 'event' },
      { level: 'error', emit: 'event' },
      { level: 'query', emit: 'event' },
    ],
  });
};

// Global prisma instance for development (matching v6 pattern)
export const prismaGlobal = globalThis.prismaGlobal ?? prismaClientSingleton();

if (process.env.NODE_ENV !== 'production') {
  globalThis.prismaGlobal = prismaGlobal;
}

// Logging setup for global instance (matching v6)
prismaGlobal.$on('query', (e: any) => {
  if (process.env.LOG_LEVEL === 'debug') {
    logger.debug({
      query: e.query,
      params: e.params,
      duration: `${e.duration}ms`,
    }, 'Prisma query executed');
  }
});

prismaGlobal.$on('error', (e: any) => {
  logger.error({ target: e.target, message: e.message }, 'Prisma error');
});

prismaGlobal.$on('warn', (e: any) => {
  logger.warn({ target: e.target, message: e.message }, 'Prisma warning');
});

// Hono middleware function
function prismaMiddleware(c: Context, next: Next) {
  if (!c.get('prisma')) {
    // Use the global instance in development, create new in production
    const prisma = process.env.NODE_ENV === 'production' 
      ? prismaClientSingleton()
      : prismaGlobal;
    
    c.set('prisma', prisma);
  }
  return next();
}

// Connection test (matching v6)
export async function connectDatabase(): Promise<void> {
  try {
    await prismaGlobal.$connect();
    logger.info('✅ Database connected successfully');
  } catch (error) {
    logger.error({ error }, '❌ Database connection failed');
    process.exit(1);
  }
}

// Graceful shutdown (matching v6)
export async function disconnectDatabase(): Promise<void> {
  await prismaGlobal.$disconnect();
  logger.info('Database disconnected');
}

// Health check (matching v6)
export async function checkDatabaseHealth(): Promise<boolean> {
  try {
    await prismaGlobal.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    logger.error({ error }, 'Database health check failed');
    return false;
  }
}

// Export both the middleware and the global instance
export default prismaMiddleware;
export { prismaGlobal as prisma };