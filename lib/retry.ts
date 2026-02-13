import { log, LogContext } from './logger';

interface RetryOptions {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
  backoffMultiplier: number;
  jitterMs: number;
  retryCondition?: (error: Error) => boolean;
  onRetry?: (attempt: number, error: Error) => void;
}

const DEFAULT_RETRY_OPTIONS: RetryOptions = {
  maxAttempts: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30000,
  backoffMultiplier: 2,
  jitterMs: 100,
  retryCondition: (error) => {
    // Retry on network errors, timeouts, and rate limits
    const retryableErrors = [
      'ECONNRESET',
      'ENOTFOUND', 
      'ECONNREFUSED',
      'ETIMEDOUT',
      'rate_limit_exceeded',
      'service_unavailable',
    ];
    
    return retryableErrors.some(errorType => 
      error.message.includes(errorType) || 
      error.name.includes(errorType)
    );
  },
};

/**
 * Retry function with exponential backoff and jitter
 */
export async function retryWithBackoff<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {},
  context?: LogContext
): Promise<T> {
  const config = { ...DEFAULT_RETRY_OPTIONS, ...options };
  let lastError: Error = new Error('Operation failed without specific error');

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      log.debug(`Attempting operation (attempt ${attempt}/${config.maxAttempts})`, {
        ...context,
        attempt,
        operation: 'retry_operation',
      });

      const result = await operation();
      
      if (attempt > 1) {
        log.info(`Operation succeeded after ${attempt} attempts`, {
          ...context,
          attempts: attempt,
          operation: 'retry_success',
        });
      }

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      log.warn(`Operation failed (attempt ${attempt}/${config.maxAttempts})`, {
        ...context,
        attempt,
        error: lastError,
        operation: 'retry_attempt_failed',
      });

      // Don't retry if this is the last attempt or if error isn't retryable
      if (attempt === config.maxAttempts || !config.retryCondition?.(lastError)) {
        break;
      }

      // Calculate delay with exponential backoff and jitter
      const exponentialDelay = Math.min(
        config.baseDelayMs * Math.pow(config.backoffMultiplier, attempt - 1),
        config.maxDelayMs
      );
      
      const jitter = Math.random() * config.jitterMs;
      const delay = exponentialDelay + jitter;

      log.debug(`Waiting ${delay}ms before retry`, {
        ...context,
        attempt,
        delay,
        operation: 'retry_delay',
      });

      config.onRetry?.(attempt, lastError);
      await sleep(delay);
    }
  }

  log.error(`Operation failed after ${config.maxAttempts} attempts`, {
    ...context,
    attempts: config.maxAttempts,
    error: lastError,
    operation: 'retry_exhausted',
  });

  throw lastError;
}

/**
 * Circuit breaker pattern implementation
 */
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: 'closed' | 'open' | 'half-open' = 'closed';

  constructor(
    private failureThreshold: number = 5,
    private recoveryTimeMs: number = 60000, // 1 minute
    private successThreshold: number = 3
  ) {}

  async execute<T>(
    operation: () => Promise<T>,
    context?: LogContext
  ): Promise<T> {
    if (this.state === 'open') {
      if (Date.now() - this.lastFailureTime > this.recoveryTimeMs) {
        this.state = 'half-open';
        log.info('Circuit breaker transitioning to half-open', {
          ...context,
          state: this.state,
          operation: 'circuit_breaker',
        });
      } else {
        throw new Error('Circuit breaker is open');
      }
    }

    try {
      const result = await operation();
      
      if (this.state === 'half-open') {
        this.reset(context);
      }
      
      return result;
    } catch (error) {
      this.recordFailure(context);
      throw error;
    }
  }

  private recordFailure(context?: LogContext): void {
    this.failures++;
    this.lastFailureTime = Date.now();

    if (this.failures >= this.failureThreshold) {
      this.state = 'open';
      log.error('Circuit breaker opened due to failures', {
        ...context,
        failures: this.failures,
        state: this.state,
        operation: 'circuit_breaker',
      });
    }
  }

  private reset(context?: LogContext): void {
    this.failures = 0;
    this.lastFailureTime = 0;
    this.state = 'closed';
    
    log.info('Circuit breaker reset to closed state', {
      ...context,
      state: this.state,
      operation: 'circuit_breaker',
    });
  }

  getState(): string {
    return this.state;
  }
}

/**
 * Async timeout wrapper
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  timeoutMessage = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(timeoutMessage)), timeoutMs)
    ),
  ]);
}

/**
 * Batch processing with concurrency control
 */
export async function processBatch<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  options: {
    batchSize?: number;
    concurrency?: number;
    onProgress?: (completed: number, total: number) => void;
  } = {}
): Promise<R[]> {
  const { batchSize = 10, concurrency = 3, onProgress } = options;
  const results: R[] = [];
  let completed = 0;

  // Process items in batches
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    // Process batch with limited concurrency
    const batchPromises = batch.map(async (item, index) => {
      const semaphore = new Semaphore(concurrency);
      await semaphore.acquire();
      
      try {
        const result = await processor(item);
        completed++;
        onProgress?.(completed, items.length);
        return result;
      } finally {
        semaphore.release();
      }
    });

    const batchResults = await Promise.all(batchPromises);
    results.push(...batchResults);
  }

  return results;
}

/**
 * Semaphore for concurrency control
 */
class Semaphore {
  private tasks: (() => void)[] = [];
  private count = 0;

  constructor(private max: number) {}

  acquire(): Promise<void> {
    if (this.count < this.max) {
      this.count++;
      return Promise.resolve();
    }

    return new Promise(resolve => {
      this.tasks.push(() => {
        this.count++;
        resolve();
      });
    });
  }

  release(): void {
    this.count--;
    
    if (this.tasks.length > 0 && this.count < this.max) {
      const next = this.tasks.shift();
      next?.();
    }
  }
}

/**
 * Sleep utility
 */
function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Debounce function calls
 */
export function debounce<T extends (...args: any[]) => any>(
  func: T,
  waitMs: number
): T {
  let timeoutId: NodeJS.Timeout;
  
  return ((...args: any[]) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => func(...args), waitMs);
  }) as T;
}

/**
 * Throttle function calls
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limitMs: number
): T {
  let inThrottle: boolean;
  
  return ((...args: any[]) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limitMs);
    }
  }) as T;
}

/**
 * Promise pool for limited concurrency
 */
export class PromisePool<T = any> {
  private running = new Set<Promise<any>>();
  
  constructor(private concurrency: number = 3) {}
  
  async add<R>(promiseFactory: () => Promise<R>): Promise<R> {
    // Wait if we've hit the concurrency limit
    while (this.running.size >= this.concurrency) {
      await Promise.race(this.running);
    }
    
    const promise = promiseFactory();
    this.running.add(promise);
    
    // Clean up when promise resolves/rejects
    promise.finally(() => {
      this.running.delete(promise);
    });
    
    return promise;
  }
  
  async drain(): Promise<void> {
    await Promise.all(this.running);
  }
}