/**
 * Express Application Setup
 *
 * Configures Express app with all middleware and routes
 */

import express, { Application, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { errorHandler } from './middleware/errorHandler';
import logger from './utils/logger';

// Import routes
import authRoutes from './routes/auth.routes';
import profileRoutes from './routes/profile.routes';
import connectionRoutes from './routes/connection.routes';
import sessionRoutes from './routes/session.routes';
import projectRoutes from './routes/project.routes';
import messageRoutes from './routes/message.routes';
import adminRoutes from './routes/admin.routes';
import smartsheetRoutes from './routes/smartsheet.routes';
import partnerRoutes from './routes/partner.routes';
import staffRoutes from './routes/staff.routes';
import opportunityRoutes from './routes/opportunity.routes';
import recommendationRoutes from './routes/recommendation.routes';

export function createApp(): Application {
  const app = express();

  // Sample health endpoint logs to reduce noise
  let healthLogCounter = 0;

  // ===========================
  // Security Middleware
  // ===========================

  // Helmet - Security headers
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'", 'https://cdn.jsdelivr.net'],
          styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
          fontSrc: ["'self'", 'https://fonts.gstatic.com'],
          imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
          connectSrc: [
            "'self'",
            process.env.API_URL || 'http://localhost:3000',
            process.env.FRONTEND_URL || 'http://localhost:5173',
          ],
          frameAncestors: ["'none'"],
          baseUri: ["'self'"],
          formAction: ["'self'"],
        },
      },
      hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true,
      },
      frameguard: { action: 'deny' },
      noSniff: true,
      xssFilter: true,
    })
  );

  // CORS - Cross-origin resource sharing
  const allowedOrigins = (process.env.CORS_ORIGIN || process.env.FRONTEND_URL || 'http://localhost:5173').split(',');

  const corsOptions = {
    origin: (origin: string | undefined, callback: (err: Error | null, allow?: boolean) => void) => {
      // Allow requests with no origin (like mobile apps or curl requests)
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
    exposedHeaders: ['X-RateLimit-Limit', 'X-RateLimit-Remaining', 'X-RateLimit-Reset'],
    maxAge: 86400, // 24 hours
  };

  app.use(cors(corsOptions));

  // ===========================
  // Parsing Middleware
  // ===========================

  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // ===========================
  // Request/Response Logging
  // ===========================

  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    // Log when response finishes
    res.on('finish', () => {
      const duration = Date.now() - start;

      if (req.path === '/health') {
        healthLogCounter = (healthLogCounter + 1) % 20;
        if (healthLogCounter !== 0) {
          return;
        }
      }

      // Log 304s at debug level to reduce noise, everything else at info
      const logLevel = res.statusCode === 304 ? 'debug' : 'info';
      logger[logLevel](`${req.method} ${req.path}`, {
        statusCode: res.statusCode,
        method: req.method,
        path: req.path,
        duration: `${duration}ms`,
      });
    });
    
    next();
  });

  // ===========================
  // Health Check
  // ===========================

  app.get('/health', (_req: Request, res: Response) => {
    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || 'development',
    });
  });

  app.get('/', (_req: Request, res: Response) => {
    res.status(200).json({
      name: 'Converge-NPS API',
      version: '1.0.0',
      status: 'running',
      endpoints: {
        health: '/health',
        auth: '/api/v1/auth',
        users: '/api/v1/users',
        connections: '/api/v1/connections',
        sessions: '/api/v1/sessions',
        projects: '/api/v1/projects',
        opportunities: '/api/v1/opportunities',
        partners: '/api/v1/partners',
        messages: '/api/v1/messages',
        staff: '/api/v1/staff',
        admin: '/api/v1/admin',
      },
    });
  });

  // ===========================
  // API Routes
  // ===========================

  const API_VERSION = '/api/v1';

  app.use(`${API_VERSION}/auth`, authRoutes);
  app.use(`${API_VERSION}/users`, profileRoutes);
  app.use(`${API_VERSION}/connections`, connectionRoutes);
  app.use(`${API_VERSION}/sessions`, sessionRoutes);
  app.use(`${API_VERSION}/projects`, projectRoutes);
  app.use(`${API_VERSION}/opportunities`, opportunityRoutes);
  app.use(`${API_VERSION}/messages`, messageRoutes);
  app.use(`${API_VERSION}/partners`, partnerRoutes);
  app.use(`${API_VERSION}/staff`, staffRoutes);
  app.use(`${API_VERSION}/admin`, adminRoutes);
  app.use(`${API_VERSION}/admin/smartsheet`, smartsheetRoutes);
  app.use(`${API_VERSION}/recommendations`, recommendationRoutes);

  // ===========================
  // 404 Handler
  // ===========================

  app.use((req: Request, res: Response) => {
    res.status(404).json({
      error: {
        code: 'NOT_FOUND',
        message: `Route ${req.method} ${req.path} not found`,
        timestamp: new Date().toISOString(),
      },
    });
  });

  // ===========================
  // Error Handler (must be last)
  // ===========================

  app.use(errorHandler);

  return app;
}
