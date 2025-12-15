/**
 * Server Entry Point
 *
 * Initializes and starts the Express server
 */

import dotenv from 'dotenv';
import { createServer } from 'http';
import { createApp } from './app';
import logger from './utils/logger';
import { PrismaClient } from '@prisma/client';
import { initializeSocketServer } from './socket';

// Load environment variables
dotenv.config();

const prisma = new PrismaClient();

// Configuration
const PORT = parseInt(process.env.PORT || '3000', 10);
const HOST = process.env.HOST || '0.0.0.0';
const NODE_ENV = process.env.NODE_ENV || 'development';

/**
 * Start server
 */
async function startServer() {
  try {
    // Test database connection
    await prisma.$connect();
    logger.info('Database connected successfully');

    // Create Express app and HTTP server
    const app = createApp();
    const httpServer = createServer(app);

    // Initialize Socket.IO server for real-time messaging
    initializeSocketServer(httpServer);

    // Start listening
    httpServer.listen(PORT, HOST, () => {
      logger.info(`Server started successfully`, {
        host: HOST,
        port: PORT,
        environment: NODE_ENV,
        url: `http://${HOST}:${PORT}`,
      });

      const endpoints = {
        base: `http://${HOST}:${PORT}`,
        health: `http://${HOST}:${PORT}/health`,
        auth: `http://${HOST}:${PORT}/api/v1/auth`,
        users: `http://${HOST}:${PORT}/api/v1/users`,
        connections: `http://${HOST}:${PORT}/api/v1/connections`,
      };

      logger.info(`API endpoints available at:\n${JSON.stringify(endpoints, null, 2)}`);
    });

    // Graceful shutdown
    const gracefulShutdown = async (signal: string) => {
      logger.info(`${signal} received. Starting graceful shutdown...`);

      httpServer.close(async () => {
        logger.info('HTTP server closed');

        // Close database connection
        await prisma.$disconnect();
        logger.info('Database connection closed');

        logger.info('Graceful shutdown complete');
        process.exit(0);
      });

      // Force shutdown after 10 seconds
      setTimeout(() => {
        logger.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    // Handle shutdown signals
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
    process.on('SIGINT', () => gracefulShutdown('SIGINT'));

    // Handle uncaught errors
    process.on('unhandledRejection', (reason: any, promise: Promise<any>) => {
      logger.error('Unhandled Rejection', { reason, promise });
    });

    process.on('uncaughtException', (error: Error) => {
      logger.error('Uncaught Exception', { message: error.message, stack: error.stack });
      process.exit(1);
    });
  } catch (error: any) {
    logger.error('Failed to start server', {
      message: error.message,
      stack: error.stack,
    });
    process.exit(1);
  }
}

// Start the server
startServer();
