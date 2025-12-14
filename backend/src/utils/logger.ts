// Winston Logger Configuration
import winston from 'winston';

const logLevel = process.env.LOG_LEVEL || 'info';

const logger = winston.createLogger({
  level: logLevel,
  format: winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.splat(),
    winston.format.printf(({ timestamp, level, message, statusCode, method, path, duration, ...meta }) => {
      const logObject: any = {};
      
      // Add fields in specific order: statusCode, method, path, duration, timestamp
      if (statusCode !== undefined) logObject.statusCode = statusCode;
      if (method !== undefined) logObject.method = method;
      if (path !== undefined) logObject.path = path;
      if (duration !== undefined) logObject.duration = duration;
      if (timestamp !== undefined) logObject.timestamp = timestamp;
      
      // Add any additional metadata
      Object.keys(meta).forEach(key => {
        if (meta[key] !== undefined) {
          logObject[key] = meta[key];
        }
      });
      
      return JSON.stringify(logObject);
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
