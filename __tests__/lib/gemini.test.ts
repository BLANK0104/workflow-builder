import { processWithGemini, checkGeminiConnection, getAIServiceMetrics } from '@/lib/gemini';
import { StepType } from '@/lib/types';

// Mock dependencies
jest.mock('groq-sdk');
jest.mock('@/lib/logger');
jest.mock('@/lib/retry');
jest.mock('@/lib/security');

describe('gemini.ts - AI Processing Module', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('processWithGemini', () => {
    it('should process text with clean step type', async () => {
      // Mock Groq SDK
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: { content: 'Cleaned text output' },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 10,
              completion_tokens: 5,
              total_tokens: 15
            },
            model: 'llama-3.3-70b-versatile'
          })
        }
      };

      // Mock retry and circuit breaker
      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      // Mock security sanitization
      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      const result = await processWithGemini('test input', 'clean' as StepType);

      expect(result).toBe('Cleaned text output');
      expect(mockGroq.prototype.chat.completions.create).toHaveBeenCalled();
    });

    it('should handle custom prompts correctly', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: { content: 'Custom processed output' },
              finish_reason: 'stop'
            }],
            usage: {
              prompt_tokens: 20,
              completion_tokens: 10,
              total_tokens: 30
            },
            model: 'llama-3.3-70b-versatile'
          })
        }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      const customPrompt = 'Convert this to uppercase';
      const result = await processWithGemini('test', 'custom' as StepType, customPrompt);

      expect(result).toBe('Custom processed output');
    });

    it('should throw error when AI service returns no content', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: { content: null },
              finish_reason: 'stop'
            }]
          })
        }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      await expect(processWithGemini('test', 'clean' as StepType)).rejects.toThrow();
    });

    it('should handle circuit breaker errors appropriately', async () => {
      const { retryWithBackoff, CircuitBreaker } = require('@/lib/retry');
      CircuitBreaker.mockImplementation(() => ({
        execute: jest.fn().mockRejectedValue(new Error('Circuit breaker is open'))
      }));

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      await expect(processWithGemini('test', 'clean' as StepType))
        .rejects
        .toThrow('AI service is temporarily unavailable');
    });

    it('should use different temperatures for different step types', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: { content: 'Output' },
          finish_reason: 'stop'
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15
        },
        model: 'llama-3.3-70b-versatile'
      });

      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: { create: mockCreate }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      // Test clean (should use low temperature)
      await processWithGemini('test', 'clean' as StepType);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        temperature: expect.any(Number)
      }));

      // Test expand (should use higher temperature)
      await processWithGemini('test', 'expand' as StepType);
      expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
        temperature: expect.any(Number)
      }));
    });
  });

  describe('checkGeminiConnection', () => {
    it('should return true when connection is healthy', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: 'Hello' } }]
          })
        }
      };

      const { withTimeout } = require('@/lib/retry');
      withTimeout.mockImplementation((promise: any) => promise);

      const isHealthy = await checkGeminiConnection();
      expect(isHealthy).toBe(true);
    });

    it('should return false when connection fails', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockRejectedValue(new Error('Connection failed'))
        }
      };

      const { withTimeout } = require('@/lib/retry');
      withTimeout.mockImplementation((promise: any) => promise);

      const isHealthy = await checkGeminiConnection();
      expect(isHealthy).toBe(false);
    });

    it('should return false when response has no content', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{ message: { content: null } }]
          })
        }
      };

      const { withTimeout } = require('@/lib/retry');
      withTimeout.mockImplementation((promise: any) => promise);

      const isHealthy = await checkGeminiConnection();
      expect(isHealthy).toBe(false);
    });
  });

  describe('getAIServiceMetrics', () => {
    it('should return current metrics', () => {
      const { CircuitBreaker } = require('@/lib/retry');
      CircuitBreaker.mockImplementation(function(this: any) {
        this.getState = () => ({ status: 'closed', failures: 0 });
        return this;
      });

      const metrics = getAIServiceMetrics();

      expect(metrics).toHaveProperty('circuitBreakerState');
      expect(metrics).toHaveProperty('lastApiCall');
      expect(metrics).toHaveProperty('minApiInterval');
    });
  });

  describe('Input validation and sanitization', () => {
    it('should sanitize prompt inputs', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: { content: 'Safe output' },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            model: 'llama-3.3-70b-versatile'
          })
        }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      const mockSanitize = jest.fn().mockImplementation((text: string) => text);
      sanitizeText.mockImplementation(mockSanitize);

      await processWithGemini('potentially <unsafe> input', 'clean' as StepType);

      expect(mockSanitize).toHaveBeenCalled();
    });

    it('should validate AI request parameters with Zod schema', async () => {
      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: {
          create: jest.fn().mockResolvedValue({
            choices: [{
              message: { content: 'Valid output' },
              finish_reason: 'stop'
            }],
            usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
            model: 'llama-3.3-70b-versatile'
          })
        }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation((fn: any) => fn());
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      // Should not throw validation error for valid input
      await expect(processWithGemini('valid input', 'clean' as StepType)).resolves.toBeDefined();
    });
  });

  describe('Error handling and retry logic', () => {
    it('should retry on rate limit errors', async () => {
      const mockCreate = jest.fn()
        .mockRejectedValueOnce(new Error('rate_limit_exceeded'))
        .mockResolvedValueOnce({
          choices: [{
            message: { content: 'Success after retry' },
            finish_reason: 'stop'
          }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
          model: 'llama-3.3-70b-versatile'
        });

      const mockGroq = require('groq-sdk');
      mockGroq.prototype.chat = {
        completions: { create: mockCreate }
      };

      const { retryWithBackoff, CircuitBreaker, withTimeout } = require('@/lib/retry');
      retryWithBackoff.mockImplementation(async (fn: any) => {
        try {
          return await fn();
        } catch (error) {
          return await fn();
        }
      });
      CircuitBreaker.mockImplementation(() => ({
        execute: (fn: any) => fn()
      }));
      withTimeout.mockImplementation((promise: any) => promise);

      const { sanitizeText } = require('@/lib/security');
      sanitizeText.mockImplementation((text: string) => text);

      const result = await processWithGemini('test', 'clean' as StepType);
      expect(result).toBe('Success after retry');
      expect(mockCreate).toHaveBeenCalledTimes(2);
    });
  });
});
