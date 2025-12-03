// Database Configuration
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Prisma Client instance with logging
const prisma = new PrismaClient({
  log: [
    { level: 'query', emit: 'event' },
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log queries in development
if (process.env.NODE_ENV === 'development') {
  prisma.$on('query', (e: any) => {
    logger.debug('Query: ' + e.query);
    logger.debug('Duration: ' + e.duration + 'ms');
  });
}

// Log errors
prisma.$on('error', (e: any) => {
  logger.error('Prisma error:', e);
});

// Log warnings
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma warning:', e);
});

// Graceful shutdown
async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

process.on('SIGINT', disconnectDatabase);
process.on('SIGTERM', disconnectDatabase);

export default prisma;
