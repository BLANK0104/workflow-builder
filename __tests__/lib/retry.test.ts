import {
  retryWithBackoff,
  CircuitBreaker,
  withTimeout,
  processBatch,
  debounce,
  throttle,
  PromisePool,
} from '../../lib/retry';

// Mock the logger to avoid actual logging during tests
jest.mock('../../lib/logger', () => ({
  log: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('Retry Utilities', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('retryWithBackoff', () => {
    test('should succeed on first attempt', async () => {
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await retryWithBackoff(operation);
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should retry on retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockRejectedValueOnce(new Error('ETIMEDOUT'))
        .mockResolvedValueOnce('success');
      
      const result = await retryWithBackoff(operation, { 
        maxAttempts: 3,
        baseDelayMs: 10, // Fast for testing
      });
      
      expect(result).toBe('success');
      expect(operation).toHaveBeenCalledTimes(3);
    });

    test('should not retry non-retryable errors', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('Invalid input'));
      
      await expect(retryWithBackoff(operation, {
        maxAttempts: 3,
        retryCondition: () => false,
      })).rejects.toThrow('Invalid input');
      
      expect(operation).toHaveBeenCalledTimes(1);
    });

    test('should exhaust retries and throw last error', async () => {
      const operation = jest.fn()
        .mockRejectedValue(new Error('ECONNRESET'));
      
      await expect(retryWithBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
      })).rejects.toThrow('ECONNRESET');
      
      expect(operation).toHaveBeenCalledTimes(2);
    });

    test('should call onRetry callback', async () => {
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('ECONNRESET'))
        .mockResolvedValueOnce('success');
      
      const onRetry = jest.fn();
      
      await retryWithBackoff(operation, {
        maxAttempts: 2,
        baseDelayMs: 10,
        onRetry,
      });
      
      expect(onRetry).toHaveBeenCalledTimes(1);
      expect(onRetry).toHaveBeenCalledWith(1, expect.any(Error));
    });
  });

  describe('CircuitBreaker', () => {
    test('should execute operation when closed', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000);
      const operation = jest.fn().mockResolvedValue('success');
      
      const result = await circuitBreaker.execute(operation);
      
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });

    test('should open circuit after failure threshold', async () => {
      const circuitBreaker = new CircuitBreaker(2, 1000);
      const operation = jest.fn().mockRejectedValue(new Error('Service error'));
      
      // First failure
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('closed');
      
      // Second failure - opens circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');
      
      // Should reject immediately without calling operation
      await expect(circuitBreaker.execute(operation)).rejects.toThrow('Circuit breaker is open');
      expect(operation).toHaveBeenCalledTimes(2); // Not called on third attempt
    });

    test('should transition to half-open after recovery time', async () => {
      const circuitBreaker = new CircuitBreaker(1, 100); // 100ms recovery time
      const operation = jest.fn()
        .mockRejectedValueOnce(new Error('Service error'))
        .mockResolvedValueOnce('success');
      
      // Trigger failure and open circuit
      await expect(circuitBreaker.execute(operation)).rejects.toThrow();
      expect(circuitBreaker.getState()).toBe('open');
      
      // Wait for recovery time
      await new Promise(resolve => setTimeout(resolve, 150));
      
      // Should succeed and close circuit
      const result = await circuitBreaker.execute(operation);
      expect(result).toBe('success');
      expect(circuitBreaker.getState()).toBe('closed');
    });
  });

  describe('withTimeout', () => {
    test('should resolve if promise completes within timeout', async () => {
      const promise = Promise.resolve('success');
      
      const result = await withTimeout(promise, 1000);
      
      expect(result).toBe('success');
    });

    test('should reject if promise exceeds timeout', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100)).rejects.toThrow('Operation timed out');
    });

    test('should use custom timeout message', async () => {
      const promise = new Promise(resolve => setTimeout(() => resolve('late'), 200));
      
      await expect(withTimeout(promise, 100, 'Custom timeout')).rejects.toThrow('Custom timeout');
    });
  });

  describe('processBatch', () => {
    test('should process all items', async () => {
      const items = [1, 2, 3, 4, 5];
      const processor = jest.fn((item: number) => Promise.resolve(item * 2));
      
      const results = await processBatch(items, processor, {
        batchSize: 2,
        concurrency: 2,
      });
      
      expect(results).toEqual([2, 4, 6, 8, 10]);
      expect(processor).toHaveBeenCalledTimes(5);
    });

    test('should call onProgress callback', async () => {
      const items = [1, 2, 3];
      const processor = (item: number) => Promise.resolve(item);
      const onProgress = jest.fn();
      
      await processBatch(items, processor, {
        batchSize: 1,
        concurrency: 1,
        onProgress,
      });
      
      expect(onProgress).toHaveBeenCalledTimes(3);
      expect(onProgress).toHaveBeenNthCalledWith(1, 1, 3);
      expect(onProgress).toHaveBeenNthCalledWith(2, 2, 3);
      expect(onProgress).toHaveBeenNthCalledWith(3, 3, 3);
    });
  });

  describe('debounce', () => {
    test('should delay function execution', async () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn();
      debouncedFn();
      debouncedFn();
      
      expect(fn).not.toHaveBeenCalled();
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      expect(fn).toHaveBeenCalledTimes(1);
    });

    test('should cancel previous calls', async () => {
      const fn = jest.fn();
      const debouncedFn = debounce(fn, 100);
      
      debouncedFn('first');
      setTimeout(() => debouncedFn('second'), 50);
      
      await new Promise(resolve => setTimeout(resolve, 200));
      
      expect(fn).toHaveBeenCalledTimes(1);
      expect(fn).toHaveBeenCalledWith('second');
    });
  });

  describe('throttle', () => {
    test('should limit function calls', async () => {
      const fn = jest.fn();
      const throttledFn = throttle(fn, 100);
      
      throttledFn();
      throttledFn();
      throttledFn();
      
      expect(fn).toHaveBeenCalledTimes(1);
      
      await new Promise(resolve => setTimeout(resolve, 150));
      
      throttledFn();
      expect(fn).toHaveBeenCalledTimes(2);
    });
  });

  describe('PromisePool', () => {
    test('should limit concurrent promises', async () => {
      const pool = new PromisePool(2);
      let running = 0;
      let maxRunning = 0;
      
      const createPromise = () => {
        return pool.add(() => {
          running++;
          maxRunning = Math.max(maxRunning, running);
          return new Promise(resolve => {
            setTimeout(() => {
              running--;
              resolve(undefined);
            }, 50);
          });
        });
      };
      
      const promises = [
        createPromise(),
        createPromise(),
        createPromise(),
        createPromise(),
      ];
      
      await Promise.all(promises);
      
      expect(maxRunning).toBe(2);
    });

    test('should drain all promises', async () => {
      const pool = new PromisePool(2);
      const results: number[] = [];
      
      pool.add(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            results.push(1);
            resolve(1);
          }, 100);
        });
      });
      
      pool.add(() => {
        return new Promise(resolve => {
          setTimeout(() => {
            results.push(2);
            resolve(2);
          }, 50);
        });
      });
      
      await pool.drain();
      
      expect(results.sort()).toEqual([1, 2]);
    });
  });
});