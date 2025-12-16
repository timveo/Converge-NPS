// Database Configuration
import { PrismaClient } from '@prisma/client';
import logger from '../utils/logger';

// Prisma Client instance with minimal logging
const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
});

// Log errors with meaningful content only
prisma.$on('error', (e: any) => {
  logger.error('Prisma error', { message: e.message, target: e.target });
});

// Log warnings with meaningful content only
prisma.$on('warn', (e: any) => {
  logger.warn('Prisma warning', { message: e.message, target: e.target });
});

// Graceful shutdown
async function disconnectDatabase() {
  await prisma.$disconnect();
  logger.info('Database disconnected');
}

process.on('SIGINT', disconnectDatabase);
process.on('SIGTERM', disconnectDatabase);

export default prisma;
