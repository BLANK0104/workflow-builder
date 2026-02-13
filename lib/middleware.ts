import { NextRequest, NextResponse } from 'next/server';
import { ZodSchema } from 'zod';
import { log, LogContext } from './logger';
import { sanitizeUserInput, generateCSP, RateLimiter, secureJsonParse } from './security';
import { errorResponseSchema } from './validation';

// Global rate limiter instance
const rateLimiter = new RateLimiter(100, 15 * 60 * 1000); // 100 requests per 15 minutes

// API Handler type
export type ApiHandler = (
  request: NextRequest,
  context?: { params?: any }
) => Promise<NextResponse>;

// Validation result type
export interface ValidationResult<T> {
  data?: T;
  errors?: string[];
}

/**
 * Request/Response logging middleware
 */
export function withLogging(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params?: any }) => {
    const startTime = Date.now();
    const method = request.method;
    const url = request.url;
    const userAgent = request.headers.get('user-agent') || 'unknown';
    const ip = request.headers.get('x-forwarded-for') || 
               request.headers.get('x-real-ip') || 
               'unknown';

    const logContext: LogContext = {
      ip,
      userAgent,
      params: context?.params,
    };

    log.request(method, url, logContext);

    try {
      const response = await handler(request, context);
      const duration = Date.now() - startTime;
      
      log.response(method, url, response.status, duration, {
        ...logContext,
        responseSize: response.headers.get('content-length') || 'unknown',
      });

      return response;
    } catch (error) {
      const duration = Date.now() - startTime;
      
      log.error(`API Error: ${method} ${url}`, {
        ...logContext,
        error: error instanceof Error ? error : String(error),
        duration,
      });

      throw error;
    }
  };
}

/**
 * Error handling middleware
 */
export function withErrorHandling(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params?: any }) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const isValidationError = errorMessage.includes('Validation error');
      const isRateLimitError = errorMessage.includes('Rate limit exceeded');
      
      let status = 500;
      if (isValidationError) {
        status = 400;
      } else if (isRateLimitError) {
        status = 429;
      }

      log.error('API handler error', {
        error: error instanceof Error ? error : String(error),
        method: request.method,
        url: request.url,
      });

      const errorResponse = errorResponseSchema.parse({
        error: errorMessage,
        code: isValidationError ? 'VALIDATION_ERROR' : 
              isRateLimitError ? 'RATE_LIMIT_EXCEEDED' : 'INTERNAL_ERROR',
        timestamp: new Date(),
      });

      return NextResponse.json(errorResponse, { status });
    }
  };
}

/**
 * Rate limiting middleware
 */
export function withRateLimit(
  customLimiter?: RateLimiter,
  getIdentifier?: (request: NextRequest) => string
): (handler: ApiHandler) => ApiHandler {
  const limiter = customLimiter || rateLimiter;
  
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: { params?: any }) => {
      const identifier = getIdentifier ? 
        getIdentifier(request) : 
        request.headers.get('x-forwarded-for') || 
        request.headers.get('x-real-ip') || 
        'unknown';

      if (!limiter.isAllowed(identifier)) {
        const remaining = limiter.getRemainingRequests(identifier);
        
        log.warn('Rate limit exceeded', {
          identifier,
          remaining,
          method: request.method,
          url: request.url,
        });

        return NextResponse.json(
          { error: 'Rate limit exceeded' },
          { 
            status: 429,
            headers: {
              'X-RateLimit-Remaining': remaining.toString(),
              'Retry-After': '900', // 15 minutes
            }
          }
        );
      }

      return await handler(request, context);
    };
  };
}

/**
 * Request validation middleware
 */
export function withValidation<T>(
  schema: ZodSchema<T>,
  target: 'body' | 'query' | 'params' = 'body'
): (handler: (request: NextRequest, data: T, context?: any) => Promise<NextResponse>) => ApiHandler {
  return (handler) => {
    return async (request: NextRequest, context?: { params?: any }) => {
      try {
        let rawData: unknown;

        switch (target) {
          case 'body':
            const contentType = request.headers.get('content-type') || '';
            if (contentType.includes('application/json')) {
              const text = await request.text();
              rawData = secureJsonParse(text);
            } else {
              rawData = await request.formData();
            }
            break;
            
          case 'query':
            rawData = Object.fromEntries(
              new URL(request.url).searchParams.entries()
            );
            break;
            
          case 'params':
            rawData = context?.params || {};
            break;
        }

        // Sanitize string inputs
        if (rawData && typeof rawData === 'object') {
          rawData = sanitizeObjectStrings(rawData);
        }

        const validatedData = schema.parse(rawData);
        
        return await handler(request, validatedData, context);
      } catch (error) {
        if (error instanceof Error) {
          throw error;
        }
        throw new Error('Validation failed');
      }
    };
  };
}

/**
 * Security headers middleware
 */
export function withSecurityHeaders(handler: ApiHandler): ApiHandler {
  return async (request: NextRequest, context?: { params?: any }) => {
    const response = await handler(request, context);

    // Add security headers
    response.headers.set('Content-Security-Policy', generateCSP());
    response.headers.set('X-Content-Type-Options', 'nosniff');
    response.headers.set('X-Frame-Options', 'DENY');
    response.headers.set('X-XSS-Protection', '1; mode=block');
    response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
    response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

    // CORS headers for API routes
    if (process.env.NODE_ENV === 'development') {
      response.headers.set('Access-Control-Allow-Origin', '*');
      response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
      response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    }

    return response;
  };
}

/**
 * CORS middleware
 */
export function withCORS(
  origins: string[] = ['http://localhost:3000'],
  methods: string[] = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS']
): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: { params?: any }) => {
      const origin = request.headers.get('origin');

      // Handle preflight requests
      if (request.method === 'OPTIONS') {
        return new NextResponse(null, {
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': origin && origins.includes(origin) ? origin : origins[0],
            'Access-Control-Allow-Methods': methods.join(', '),
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            'Access-Control-Max-Age': '86400',
          },
        });
      }

      const response = await handler(request, context);

      // Add CORS headers
      if (origin && origins.includes(origin)) {
        response.headers.set('Access-Control-Allow-Origin', origin);
      }

      return response;
    };
  };
}

/**
 * Compose multiple middleware functions
 */
export function composeMiddleware(...middlewares: Array<(handler: ApiHandler) => ApiHandler>) {
  return (handler: ApiHandler): ApiHandler => {
    return middlewares.reduceRight(
      (acc, middleware) => middleware(acc),
      handler
    );
  };
}

/**
 * Standard API middleware stack
 */
export const withStandardMiddleware = composeMiddleware(
  withErrorHandling,
  withLogging,
  withRateLimit(),
  withSecurityHeaders
);

/**
 * Utility function to create a standardized API response
 */
export function createApiResponse<T>(
  data: T,
  message?: string,
  status = 200
): NextResponse {
  const response = {
    data,
    message,
    timestamp: new Date(),
  };

  return NextResponse.json(response, { status });
}

/**
 * Utility function to create error response
 */
export function createErrorResponse(
  error: string,
  code?: string,
  status = 500
): NextResponse {
  const response = errorResponseSchema.parse({
    error,
    code,
    timestamp: new Date(),
  });

  return NextResponse.json(response, { status });
}

/**
 * Recursively sanitize string values in an object
 */
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeUserInput(obj);
  }
  
  if (Array.isArray(obj)) {
    return obj.map(item => sanitizeObjectStrings(item));
  }
  
  if (obj && typeof obj === 'object') {
    const sanitized: any = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip prototype pollution attempts
      if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
        continue;
      }
      sanitized[key] = sanitizeObjectStrings(value);
    }
    return sanitized;
  }
  
  return obj;
}

/**
 * Method validation middleware
 */
export function withMethodValidation(allowedMethods: string[]): (handler: ApiHandler) => ApiHandler {
  return (handler: ApiHandler) => {
    return async (request: NextRequest, context?: { params?: any }) => {
      if (!allowedMethods.includes(request.method)) {
        return NextResponse.json(
          { error: `Method ${request.method} not allowed` },
          { 
            status: 405,
            headers: {
              'Allow': allowedMethods.join(', ')
            }
          }
        );
      }

      return await handler(request, context);
    };
  };
}