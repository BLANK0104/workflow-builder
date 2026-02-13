import { NextRequest, NextResponse } from 'next/server';
import {
  withLogging,
  withErrorHandling,
  withRateLimit,
  withValidation,
  withSecurityHeaders,
  withMethodValidation,
  composeMiddleware,
  withStandardMiddleware,
  createApiResponse,
  createErrorResponse,
} from '../../lib/middleware';
import { z } from 'zod';

// Mock the logger to avoid actual logging during tests
jest.mock('../../lib/logger', () => ({
  log: {
    request: jest.fn(),
    response: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
  },
}));

// Mock the security module
jest.mock('../../lib/security', () => ({
  generateCSP: jest.fn(() => "default-src 'self'"),
  RateLimiter: jest.fn().mockImplementation(() => ({
    isAllowed: jest.fn().mockReturnValue(true),
    getRemainingRequests: jest.fn().mockReturnValue(95),
  })),
  sanitizeUserInput: jest.fn((input) => input),
  secureJsonParse: jest.fn((input) => {
    if (!input || input === 'undefined') return {};
    return JSON.parse(input);
  }),
}));

describe('Middleware Utilities', () => {
  let mockRequest: jest.Mocked<NextRequest>;
  let mockHandler: jest.MockedFunction<any>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock NextRequest with proper headers implementation
    const headersMap = new Map([
      ['user-agent', 'test-agent'],
      ['x-forwarded-for', '127.0.0.1'],
    ]);
    
    mockRequest = {
      method: 'GET',
      url: 'http://localhost:3000/api/test',
      headers: headersMap,
      json: jest.fn(),
      text: jest.fn(),
      ip: '127.0.0.1',
    } as any;

    mockHandler = jest.fn().mockResolvedValue(NextResponse.json({ data: 'test' }));
  });

  describe('withLogging', () => {
    test('should log requests and responses', async () => {
      const { log } = require('../../lib/logger');
      const wrappedHandler = withLogging(mockHandler);
      
      await wrappedHandler(mockRequest);
      
      expect(log.request).toHaveBeenCalledWith('GET', 'http://localhost:3000/api/test', expect.any(Object));
      expect(log.response).toHaveBeenCalledWith('GET', 'http://localhost:3000/api/test', 200, expect.any(Number), expect.any(Object));
    });

    test('should log errors when handler throws', async () => {
      const { log } = require('../../lib/logger');
      const error = new Error('Test error');
      mockHandler.mockRejectedValueOnce(error);
      
      const wrappedHandler = withLogging(mockHandler);
      
      await expect(wrappedHandler(mockRequest)).rejects.toThrow('Test error');
      expect(log.error).toHaveBeenCalledWith(
        'API Error: GET http://localhost:3000/api/test',
        expect.objectContaining({ error })
      );
    });
  });

  describe('withErrorHandling', () => {
    test('should handle and format errors', async () => {
      const error = new Error('Test error');
      mockHandler.mockRejectedValueOnce(error);
      
      const wrappedHandler = withErrorHandling(mockHandler);
      const response = await wrappedHandler(mockRequest);
      
      expect(response).toEqual(expect.objectContaining({
        json: expect.any(Function),
        status: 500,
      }));
    });

    test('should handle validation errors with 400 status', async () => {
      const error = new Error('Validation error: field is required');
      mockHandler.mockRejectedValueOnce(error);
      
      const wrappedHandler = withErrorHandling(mockHandler);
      const response = await wrappedHandler(mockRequest);
      
      expect(response.status).toBe(400);
    });

    test('should handle rate limit errors with 429 status', async () => {
      const error = new Error('Rate limit exceeded');
      mockHandler.mockRejectedValueOnce(error);
      
      const wrappedHandler = withErrorHandling(mockHandler);
      const response = await wrappedHandler(mockRequest);
      
      expect(response.status).toBe(429);
    });
  });

  describe('withRateLimit', () => {
    test('should allow requests under rate limit', async () => {
      const wrappedHandler = withRateLimit()(mockHandler);
      
      const response = await wrappedHandler(mockRequest);
      
      expect(response).toEqual(expect.objectContaining({
        json: expect.any(Function),
        status: 200,
      }));
    });

    test('should block requests over rate limit', async () => {
      const { RateLimiter } = require('../../lib/security');
      const mockLimiter = {
        isAllowed: jest.fn().mockReturnValue(false),
        getRemainingRequests: jest.fn().mockReturnValue(0),
      };
      
      const wrappedHandler = withRateLimit(mockLimiter as any)(mockHandler);
      const response = await wrappedHandler(mockRequest);
      
      expect(response.status).toBe(429);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('withValidation', () => {
    const schema = z.object({
      name: z.string(),
      age: z.number(),
    });

    test('should validate and pass valid request body', async () => {
      const validData = { name: 'John', age: 30 };
      
      // Create proper mock request
      const mockReq = {
        ...mockRequest,
        text: jest.fn().mockResolvedValue(JSON.stringify(validData)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'test-agent'],
          ['x-forwarded-for', '127.0.0.1']
        ]),
      } as any;
      
      const validatedHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withValidation(schema)(validatedHandler);
      
      await wrappedHandler(mockReq);
      
      expect(validatedHandler).toHaveBeenCalledWith(mockReq, validData, undefined);
    });

    test('should reject invalid request body', async () => {
      const invalidData = { name: 'John', age: 'invalid' };
      
      const mockReq = {
        ...mockRequest,
        text: jest.fn().mockResolvedValue(JSON.stringify(invalidData)),
        headers: new Map([
          ['content-type', 'application/json'],
          ['user-agent', 'test-agent'],
          ['x-forwarded-for', '127.0.0.1']
        ]),
      } as any;
      
      const validatedHandler = jest.fn();
      const wrappedHandler = withValidation(schema)(validatedHandler);
      
      await expect(wrappedHandler(mockReq)).rejects.toThrow();
      expect(validatedHandler).not.toHaveBeenCalled();
    });

    test('should validate query parameters', async () => {
      mockRequest.url = 'http://localhost:3000/api/test?name=John&age=30';
      
      const querySchema = z.object({
        name: z.string(),
        age: z.string(), // Query params are always strings
      });
      
      const validatedHandler = jest.fn().mockResolvedValue(NextResponse.json({ success: true }));
      const wrappedHandler = withValidation(querySchema, 'query')(validatedHandler);
      
      await wrappedHandler(mockRequest);
      
      expect(validatedHandler).toHaveBeenCalledWith(
        mockRequest, 
        { name: 'John', age: '30' }, 
        undefined
      );
    });
  });

  describe('withSecurityHeaders', () => {
    test('should add security headers to response', async () => {
      const wrappedHandler = withSecurityHeaders(mockHandler);
      const response = await wrappedHandler(mockRequest);
      
      expect(response.headers.set).toHaveBeenCalledWith('Content-Security-Policy', expect.any(String));
      expect(response.headers.set).toHaveBeenCalledWith('X-Content-Type-Options', 'nosniff');
      expect(response.headers.set).toHaveBeenCalledWith('X-Frame-Options', 'DENY');
    });
  });

  describe('withMethodValidation', () => {
    test('should allow valid methods', async () => {
      const wrappedHandler = withMethodValidation(['GET', 'POST'])(mockHandler);
      
      const response = await wrappedHandler(mockRequest);
      
      expect(response).toEqual(expect.objectContaining({
        status: 200,
      }));
    });

    test('should reject invalid methods', async () => {
      mockRequest.method = 'DELETE';
      const wrappedHandler = withMethodValidation(['GET', 'POST'])(mockHandler);
      
      const response = await wrappedHandler(mockRequest);
      
      expect(response.status).toBe(405);
      expect(mockHandler).not.toHaveBeenCalled();
    });
  });

  describe('composeMiddleware', () => {
    test('should compose multiple middleware functions', async () => {
      const middleware1 = jest.fn((handler) => handler);
      const middleware2 = jest.fn((handler) => handler);
      const middleware3 = jest.fn((handler) => handler);
      
      const composedHandler = composeMiddleware(
        middleware1,
        middleware2,
        middleware3
      )(mockHandler);
      
      await composedHandler(mockRequest);
      
      expect(middleware1).toHaveBeenCalled();
      expect(middleware2).toHaveBeenCalled();
      expect(middleware3).toHaveBeenCalled();
    });

    test('should apply middleware in correct order', async () => {
      const executionOrder: string[] = [];
      
      const middleware1 = (handler: any) => async (req: any, ctx?: any) => {
        executionOrder.push('middleware1-before');
        const result = await handler(req, ctx);
        executionOrder.push('middleware1-after');
        return result;
      };
      
      const middleware2 = (handler: any) => async (req: any, ctx?: any) => {
        executionOrder.push('middleware2-before');
        const result = await handler(req, ctx);
        executionOrder.push('middleware2-after');
        return result;
      };
      
      const testHandler = jest.fn(async (req: any) => {
        executionOrder.push('handler');
        return NextResponse.json({ success: true });
      });
      
      const composedHandler = composeMiddleware(
        middleware1,
        middleware2
      )(testHandler);
      
      await composedHandler(mockRequest);
      
      expect(executionOrder).toEqual([
        'middleware1-before',
        'middleware2-before', 
        'handler',
        'middleware2-after',
        'middleware1-after'
      ]);
    });
  });

  describe('withStandardMiddleware', () => {
    test('should apply all standard middleware', async () => {      
      const wrappedHandler = withStandardMiddleware(mockHandler);
      
      // Should not throw and should call the original handler
      const result = await wrappedHandler(mockRequest);
      expect(result).toBeDefined();
    });
  });
});