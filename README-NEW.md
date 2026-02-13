# Workflow Builder - Production Ready

A robust Next.js application for building and executing AI-powered content processing workflows with enterprise-grade reliability, security, and operational monitoring.

## 🎯 Key Features

### 🛡️ **Security Hygiene - Zero-Trust Rendering**
- **Input Sanitization**: All user inputs sanitized using DOMPurify with strict configurations
- **Output Encoding**: Safe rendering of dynamic content with XSS prevention
- **Security Headers**: Comprehensive CSP, HSTS, and other security headers
- **Rate Limiting**: Configurable rate limiting with IP-based tracking
- **Validation**: Schema-based validation for all API inputs using Zod

### 🔄 **AI Reliability - Structured Output Validation**
- **Circuit Breaker**: Automatic protection against failing AI services
- **Retry Logic**: Exponential backoff with jitter for transient failures
- **Input Validation**: Structured input validation using Zod schemas
- **Output Sanitization**: AI responses validated and sanitized before use
- **Timeout Protection**: All AI calls protected with configurable timeouts
- **Performance Monitoring**: Detailed metrics and timing information

### 📊 **Operational Rigor - Structured Logging & Testing**
- **Structured JSON Logging**: Comprehensive logging with Pino for production monitoring
- **Request/Response Tracking**: Full API request lifecycle logging
- **Performance Metrics**: Automated timing and performance tracking
- **Error Tracking**: Detailed error logging with context and stack traces
- **Unit Testing**: Comprehensive Jest test suite with 70%+ coverage requirements
- **E2E Testing**: Playwright tests covering critical user journeys
- **Security Testing**: Automated security testing in E2E suite

## 🏗️ Architecture Overview

```
├── app/                    # Next.js App Router
│   ├── api/               # API routes with middleware
│   ├── globals.css        # Global styles
│   └── layout.tsx         # Root layout
├── lib/                   # Core utilities
│   ├── logger.ts          # Structured logging
│   ├── security.ts        # Security utilities
│   ├── validation.ts      # Zod schemas
│   ├── retry.ts           # Reliability patterns
│   ├── middleware.ts      # API middleware
│   └── gemini.ts          # Enhanced AI service
├── __tests__/             # Unit tests
├── e2e/                   # E2E tests
└── components/            # React components
```

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ 
- MongoDB instance
- GROQ API key
- (Optional) Gemini API key

### Installation

```bash
# Install dependencies
npm install

# Set up environment variables
cp .env.example .env.local
```

### Environment Configuration

```env
# Required
MONGODB_URI=mongodb://localhost:27017/workflow-builder
GROQ_API_KEY=your_groq_api_key

# Optional
GEMINI_API_KEY=your_gemini_api_key
LOG_LEVEL=info
NODE_ENV=development
```

### Development

```bash
# Start development server
npm run dev

# Run tests
npm run test

# Run E2E tests
npm run test:e2e

# Run all tests
npm run test:all

# Check test coverage
npm run test:coverage

# Type checking
npm run type-check
```

## 🧪 Testing Strategy

### Unit Tests (`npm run test`)
- **Security utilities**: Input sanitization, validation
- **Reliability utilities**: Retry logic, circuit breakers
- **Validation schemas**: All Zod schemas
- **Middleware**: Request/response handling

### E2E Tests (`npm run test:e2e`)
- **User Flows**: Workflow creation, execution
- **Security**: XSS protection, input sanitization
- **Performance**: Response times, mobile responsiveness
- **Error Handling**: Graceful degradation

### Coverage Requirements
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## 🛠️ Utilities

### Logger (`lib/logger.ts`)

```typescript
import { log } from '@/lib/logger';

// Basic logging
log.info('Operation completed', { userId: '123', duration: 1500 });
log.error('Operation failed', { error, context: 'user-action' });

// Performance timing
const timer = log.time('database_query');
// ... do work
timer.end('Query completed successfully');
```

### Security (`lib/security.ts`)

```typescript
import { 
  sanitizeHtml, 
  sanitizeUserInput,
  RateLimiter,
  generateCSP 
} from '@/lib/security';

// Input sanitization
const clean = sanitizeUserInput('<script>alert("xss")</script>Hello');
// Result: "Hello"

// Rate limiting
const limiter = new RateLimiter(100, 15 * 60 * 1000); // 100 req/15min
const allowed = limiter.isAllowed('user-ip');
```

### Validation (`lib/validation.ts`)

```typescript
import { createWorkflowSchema } from '@/lib/validation';

// Validate API input
const validatedData = createWorkflowSchema.parse(requestBody);
```

### Retry Logic (`lib/retry.ts`)

```typescript
import { retryWithBackoff, CircuitBreaker } from '@/lib/retry';

// Retry with exponential backoff
const result = await retryWithBackoff(
  () => apiCall(),
  { maxAttempts: 3, baseDelayMs: 1000 }
);

// Circuit breaker
const breaker = new CircuitBreaker(5, 60000);
const result = await breaker.execute(() => unreliableService());
```

## 🔍 Troubleshooting

### Common Issues

**High severity vulnerability in xlsx**
- Known issue with xlsx library
- Consider upgrading or switching to alternative when fix available
- Monitor for security updates

**Rate limiting too aggressive**
- Adjust rate limiter configuration in `lib/security.ts`
- Consider different limits for different endpoints

**AI service timeouts**
- Check circuit breaker state: `getAIServiceMetrics()`
- Verify GROQ API key and quotas
- Review retry configuration

### Debug Mode

```bash
# Enable verbose logging
LOG_LEVEL=debug npm run dev

# Debug tests
DEBUG_TESTS=1 npm run test
```

## 📝 Contributing

1. **Security First**: All PRs must pass security tests
2. **Test Coverage**: Maintain 70%+ test coverage
3. **Type Safety**: All code must be properly typed
4. **Logging**: Add structured logging for new operations
5. **Validation**: Use Zod schemas for all data validation

## 📄 License

MIT License - see LICENSE file for details.

---

**Built with ❤️ for production reliability and security**