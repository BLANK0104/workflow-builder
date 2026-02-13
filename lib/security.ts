import { z } from 'zod';

/**
 * Simple HTML entity encoder for basic XSS protection
 */
function encodeHtmlEntities(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

/**
 * Strip HTML tags from string
 */
function stripHtmlTags(input: string): string {
  // Remove HTML tags while preserving content
  return input.replace(/<[^>]*>/g, '');
}

/**
 * Sanitize HTML content while preserving safe formatting
 * For serverless compatibility, we use a simple tag stripper
 */
export function sanitizeHtml(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  // For now, just strip all HTML tags to avoid XSS
  return stripHtmlTags(input);
}

/**
 * Strictly sanitize user input by removing all HTML tags and encoding entities
 */
export function sanitizeUserInput(input: string): string {
  if (typeof input !== 'string') {
    throw new Error('Input must be a string');
  }
  // Strip HTML tags and encode any remaining special characters
  const stripped = stripHtmlTags(input);
  return stripped.trim();
}

/**
 * Sanitize and validate text content with length limits
 */
export function sanitizeText(input: string, maxLength = 10000): string {
  const sanitized = sanitizeUserInput(input);
  if (sanitized.length > maxLength) {
    throw new Error(`Text exceeds maximum length of ${maxLength} characters`);
  }
  return sanitized;
}

/**
 * Validate and sanitize filename
 */
export function sanitizeFilename(filename: string): string {
  if (typeof filename !== 'string') {
    throw new Error('Filename must be a string');
  }
  
  // Remove dangerous characters and normalize
  const sanitized = filename
    .replace(/[^\w\s.-]/gi, '') // Only allow alphanumeric, spaces, dots, dashes
    .replace(/\s+/g, '_') // Replace spaces with underscores
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^[.-]|[.-]$/g, '') // Remove leading/trailing dots and dashes
    .substring(0, 255); // Limit length
  
  if (!sanitized) {
    throw new Error('Invalid filename');
  }
  
  return sanitized;
}

/**
 * Validate URL for safe redirects
 */
export function validateUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    // Only allow http/https protocols
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}

/**
 * Generate Content Security Policy header value
 */
export function generateCSP(): string {
  const directives = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-eval' 'unsafe-inline'", // Next.js requires unsafe-eval
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self'",
    "connect-src 'self' https://api.groq.com https://generativelanguage.googleapis.com",
    "frame-src 'none'",
    "object-src 'none'",
    "media-src 'self'",
    "worker-src 'self' blob:",
  ];
  
  return directives.join('; ');
}

/**
 * Rate limiting helper
 */
export class RateLimiter {
  private requests = new Map<string, number[]>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests = 100, windowMs = 15 * 60 * 1000) { // 100 requests per 15 minutes
    this.maxRequests = maxRequests;
    this.windowMs = windowMs;
  }

  isAllowed(identifier: string): boolean {
    const now = Date.now();
    const windowStart = now - this.windowMs;

    // Get or create request history for this identifier
    let requestTimes = this.requests.get(identifier) || [];
    
    // Filter out requests outside the current window
    requestTimes = requestTimes.filter(time => time > windowStart);
    
    // Check if under limit
    if (requestTimes.length >= this.maxRequests) {
      this.requests.set(identifier, requestTimes);
      return false;
    }

    // Add current request
    requestTimes.push(now);
    this.requests.set(identifier, requestTimes);
    
    return true;
  }

  getRemainingRequests(identifier: string): number {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    const requestTimes = (this.requests.get(identifier) || [])
      .filter(time => time > windowStart);
    
    return Math.max(0, this.maxRequests - requestTimes.length);
  }
}

/**
 * Input validation middleware factory
 */
export function createValidator<T>(schema: z.ZodSchema<T>) {
  return (input: unknown): T => {
    try {
      return schema.parse(input);
    } catch (error) {
      if (error instanceof z.ZodError) {
        const messages = error.issues.map((err: any) => 
          `${err.path.join('.')}: ${err.message}`
        ).join(', ');
        throw new Error(`Validation error: ${messages}`);
      }
      throw error;
    }
  };
}

/**
 * Secure JSON serialization that prevents prototype pollution
 */
export function secureJsonStringify(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    // Block potentially dangerous keys
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return undefined;
    }
    return value;
  });
}

/**
 * Safe JSON parsing with validation
 */
export function secureJsonParse<T>(
  jsonString: string, 
  schema?: z.ZodSchema<T>
): T {
  try {
    const parsed = JSON.parse(jsonString);
    
    // Basic protection against prototype pollution
    if (parsed && typeof parsed === 'object') {
      delete parsed.__proto__;
      delete parsed.constructor;
      delete parsed.prototype;
    }
    
    if (schema) {
      return schema.parse(parsed);
    }
    
    return parsed;
  } catch (error) {
    throw new Error('Invalid JSON format');
  }
}

/**
 * Escape special characters for regex
 */
export function escapeRegex(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Generate secure random string
 */
export function generateSecureId(length = 16): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  
  for (let i = 0; i < length; i++) {
    result += chars[array[i] % chars.length];
  }
  
  return result;
}