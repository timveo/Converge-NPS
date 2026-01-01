// Winston Logger Configuration
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ level, message, statusCode, method, path, duration, ...meta }) => {
      const logObject: any = {};

      // Add any additional metadata first to preserve order
      Object.keys(meta).forEach(key => {
        if (meta[key] !== undefined) {
          logObject[key] = meta[key];
        }
      });

      // Add HTTP fields in specific order
      if (statusCode !== undefined) logObject.statusCode = statusCode;
      if (method !== undefined) logObject.method = method;
      if (path !== undefined) logObject.path = path;
      if (duration !== undefined) logObject.duration = duration;

      // Only log if there are fields to log
      if (Object.keys(logObject).length > 0 || message) {
        return JSON.stringify(logObject);
      }

      // Suppress empty logs
      return null;
    })
  ),
  transports: [
    // Console transport (always active for Railway/cloud platforms)
    new winston.transports.Console(),
  ],
});

// Add file transport in production
if (process.env.NODE_ENV === 'production') {
  logger.add(
    new winston.transports.File({
      filename: 'logs/error.log',
      level: 'error',
    })
  );
  logger.add(
    new winston.transports.File({
      filename: 'logs/combined.log',
    })
  );
}

export default logger;
