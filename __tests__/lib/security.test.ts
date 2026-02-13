import { z } from 'zod';

// Use manual mock from __mocks__ directory
jest.mock('isomorphic-dompurify');

import {
  sanitizeHtml, 
  sanitizeUserInput, 
  sanitizeText, 
  sanitizeFilename, 
  validateUrl,
  generateCSP,
  RateLimiter,
  createValidator,
  secureJsonStringify,
  secureJsonParse,
  escapeRegex,
  generateSecureId 
} from '../../lib/security';

describe('Security Utilities', () => {
  describe('sanitizeHtml', () => {
    test('should preserve safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong>!</p>';
      const result = sanitizeHtml(input);
      expect(result).toContain('Hello');
      expect(result).toContain('world');
    });

    test('should remove dangerous HTML tags', () => {
      const input = '<script>alert("xss")</script><p>Safe content</p>';
      const result = sanitizeHtml(input);
      expect(result).not.toContain('<script>');
      expect(result).toContain('Safe');
    });

    test('should throw error for non-string input', () => {
      expect(() => sanitizeHtml(123 as any)).toThrow('Input must be a string');
    });
  });

  describe('sanitizeUserInput', () => {
    test('should remove all HTML tags', () => {
      const input = '<p>Hello <script>alert("xss")</script> world</p>';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Hello  world'); // Both HTML tags and script content removed
    });

    test('should preserve text content', () => {
      const input = 'Plain text content';
      const result = sanitizeUserInput(input);
      expect(result).toBe('Plain text content');
    });
  });

  describe('sanitizeText', () => {
    test('should sanitize and enforce length limits', () => {
      const input = '<p>Hello world</p><script>alert("xss")</script>';
      const result = sanitizeText(input, 50); 
      expect(result).toBe('Hello world'); // Should strip all tags for user input
    });

    test('should throw error when text exceeds limit', () => {
      const input = 'This is a very long text string';
      expect(() => sanitizeText(input, 10)).toThrow('Text exceeds maximum length');
    });
  });

  describe('validateUrl', () => {
    test('should validate safe URLs', () => {
      expect(validateUrl('https://example.com')).toBe(true);
      expect(validateUrl('http://example.com')).toBe(true);
    });

    test('should reject dangerous URLs', () => {
      expect(validateUrl('javascript:alert("xss")')).toBe(false);
      expect(validateUrl('data:text/html,<script>alert("xss")</script>')).toBe(false);
      expect(validateUrl('not-a-url')).toBe(false);
    });
  });

  describe('generateCSP', () => {
    test('should generate comprehensive CSP header', () => {
      const csp = generateCSP();
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("frame-src 'none'");
      expect(csp).toContain("object-src 'none'");
    });
  });

  describe('RateLimiter', () => {
    test('should allow requests under limit', () => {
      const limiter = new RateLimiter(5, 1000);
      expect(limiter.isAllowed('test-user')).toBe(true);
      expect(limiter.isAllowed('test-user')).toBe(true);
    });

    test('should block requests over limit', () => {
      const limiter = new RateLimiter(2, 1000);
      expect(limiter.isAllowed('test-user')).toBe(true);
      expect(limiter.isAllowed('test-user')).toBe(true);
      expect(limiter.isAllowed('test-user')).toBe(false);
    });
  });

  describe('createValidator', () => {
    const schema = z.object({
      name: z.string().min(1),
      age: z.number().min(0),
    });
    
    const validator = createValidator(schema);

    test('should validate correct input', () => {
      const input = { name: 'John', age: 30 };
      const result = validator(input);
      expect(result).toEqual(input);
    });

    test('should throw error for invalid input', () => {
      const input = { name: '', age: -1 };
      expect(() => validator(input)).toThrow('Validation error');
    });
  });

  describe('secureJsonStringify', () => {
    test('should stringify safe objects', () => {
      const obj = { name: 'test', value: 123 };
      const result = secureJsonStringify(obj);
      expect(result).toBe('{"name":"test","value":123}');
    });
  });

  describe('escapeRegex', () => {
    test('should escape special regex characters', () => {
      const input = 'hello.world*test?';
      const result = escapeRegex(input);
      expect(result).toBe('hello\\.world\\*test\\?');
    });
  });

  describe('generateSecureId', () => {
    test('should generate IDs of specified length', () => {
      const id = generateSecureId(16);
      expect(id).toHaveLength(16);
    });

    test('should generate unique IDs', () => {
      const id1 = generateSecureId();
      const id2 = generateSecureId();
      expect(id1).not.toBe(id2);
    });

    test('should contain only safe characters', () => {
      const id = generateSecureId(100);
      expect(id).toMatch(/^[A-Za-z0-9]+$/);
    });
  });
});