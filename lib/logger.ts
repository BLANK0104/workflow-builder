import pino from 'pino';

// Create structured logger with consistent formatting
const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && {
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        translateTime: 'SYS:standard',
        ignore: 'pid,hostname',
      },
    },
  }),
  base: {
    service: 'workflow-builder',
    version: process.env.npm_package_version || '1.0.0',
  },
});

// Type-safe logging interfaces
export interface LogContext {
  userId?: string;
  workflowId?: string;
  runId?: string;
  fileId?: string;
  operation?: string;
  duration?: number;
  error?: Error | string;
  [key: string]: any;
}

// Structured logging methods
export const log = {
  info: (message: string, context?: LogContext) => {
    logger.info({ ...context }, message);
  },
  
  warn: (message: string, context?: LogContext) => {
    logger.warn({ ...context }, message);
  },
  
  error: (message: string, context?: LogContext) => {
    const errorData = context?.error instanceof Error 
      ? { 
          ...context, 
          error: {
            name: context.error.name,
            message: context.error.message,
            stack: context.error.stack,
          }
        }
      : context;
    logger.error(errorData, message);
  },
  
  debug: (message: string, context?: LogContext) => {
    logger.debug({ ...context }, message);
  },

  // Performance tracking
  time: (operation: string, context?: LogContext) => {
    const startTime = Date.now();
    return {
      end: (message?: string) => {
        const duration = Date.now() - startTime;
        logger.info({ 
          ...context, 
          operation, 
          duration,
          performance: true 
        }, message || `${operation} completed`);
      }
    };
  },

  // Request/Response logging for API routes
  request: (method: string, path: string, context?: LogContext) => {
    logger.info({
      ...context,
      request: { method, path },
      type: 'request'
    }, `${method} ${path}`);
  },

  response: (method: string, path: string, status: number, duration: number, context?: LogContext) => {
    logger.info({
      ...context,
      response: { method, path, status, duration },
      type: 'response'
    }, `${method} ${path} ${status} (${duration}ms)`);
  },
};

export default logger;