require('@testing-library/jest-dom');

// Mock environment variables for tests
process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://localhost:27017/test-db';
process.env.GROQ_API_KEY = 'test-key';
process.env.GEMINI_API_KEY = 'test-key';

// Mock Next.js modules
jest.mock('next/server', () => ({
  NextRequest: jest.fn(),
  NextResponse: {
    json: jest.fn((data, init) => ({
      json: () => Promise.resolve(data),
      status: init?.status || 200,
      headers: {
        set: jest.fn(),
        get: jest.fn(),
        has: jest.fn(),
        delete: jest.fn(),
      },
      ...init,
    })),
  },
}));

// Mock MongoDB
jest.mock('./lib/mongodb', () => ({
  getDatabase: jest.fn(() => Promise.resolve({
    collection: jest.fn(() => ({
      find: jest.fn(() => ({
        sort: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
        })),
        limit: jest.fn(() => ({
          toArray: jest.fn(() => Promise.resolve([])),
        })),
        toArray: jest.fn(() => Promise.resolve([])),
      })),
      findOne: jest.fn(() => Promise.resolve(null)),
      insertOne: jest.fn(() => Promise.resolve({ insertedId: 'test-id' })),
      updateOne: jest.fn(() => Promise.resolve({ modifiedCount: 1 })),
      deleteOne: jest.fn(() => Promise.resolve({ deletedCount: 1 })),
    })),
  })),
}));

// Mock AI services
jest.mock('./lib/gemini', () => ({
  processWithGemini: jest.fn(() => Promise.resolve('Mocked AI response')),
  checkGeminiConnection: jest.fn(() => Promise.resolve(true)),
}));

// Global test utilities
global.fetch = jest.fn();

// Mock crypto for secure ID generation
global.crypto = {
  getRandomValues: jest.fn((arr) => {
    for (let i = 0; i < arr.length; i++) {
      arr[i] = Math.floor(Math.random() * 256);
    }
    return arr;
  }),
};

// Silence console logs during tests unless debugging
if (!process.env.DEBUG_TESTS) {
  global.console = {
    ...console,
    log: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  };
}

// Setup and teardown
beforeEach(() => {
  jest.clearAllMocks();
});

afterEach(() => {
  jest.restoreAllMocks();
});