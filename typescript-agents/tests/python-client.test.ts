/**
 * Tests for PythonServiceClient
 */

import { PythonServiceClient } from '../src/utils/python-client';

describe('PythonServiceClient', () => {
  let client: PythonServiceClient;

  beforeEach(() => {
    client = new PythonServiceClient({
      baseURL: 'http://localhost:8000',
      apiKey: 'test-key',
      timeout: 5000,
      retryConfig: {
        maxRetries: 2,
        initialDelayMs: 100,
        backoffMultiplier: 2
      }
    });
  });

  describe('Initialization', () => {
    it('should initialize with correct base URL', () => {
      expect(client.getBaseURL()).toBe('http://localhost:8000');
    });

    it('should initialize with custom timeout', () => {
      const customClient = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key',
        timeout: 10000
      });

      expect(customClient).toBeDefined();
    });

    it('should initialize with default timeout if not specified', () => {
      const defaultClient = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key'
      });

      expect(defaultClient).toBeDefined();
    });
  });

  describe('Retry Logic', () => {
    it('should determine retryable errors correctly', () => {
      // Network error (no response)
      const networkError = {
        isAxiosError: true,
        response: undefined
      };
      expect((client as any).shouldRetry(networkError)).toBe(true);

      // 500 server error
      const serverError = {
        isAxiosError: true,
        response: { status: 500 }
      };
      expect((client as any).shouldRetry(serverError)).toBe(true);

      // 503 service unavailable
      const serviceError = {
        isAxiosError: true,
        response: { status: 503 }
      };
      expect((client as any).shouldRetry(serviceError)).toBe(true);

      // 429 rate limit
      const rateLimitError = {
        isAxiosError: true,
        response: { status: 429 }
      };
      expect((client as any).shouldRetry(rateLimitError)).toBe(true);
    });

    it('should not retry 4xx client errors (except 429)', () => {
      const badRequestError = {
        isAxiosError: true,
        response: { status: 400 }
      };
      expect((client as any).shouldRetry(badRequestError)).toBe(false);

      const unauthorizedError = {
        isAxiosError: true,
        response: { status: 401 }
      };
      expect((client as any).shouldRetry(unauthorizedError)).toBe(false);

      const notFoundError = {
        isAxiosError: true,
        response: { status: 404 }
      };
      expect((client as any).shouldRetry(notFoundError)).toBe(false);
    });

    it('should calculate exponential backoff delay', () => {
      // Attempt 1: initialDelay * backoff^0 = 100 * 1 = 100
      expect((client as any).calculateDelay(1)).toBe(100);

      // Attempt 2: initialDelay * backoff^1 = 100 * 2 = 200
      expect((client as any).calculateDelay(2)).toBe(200);

      // Attempt 3: initialDelay * backoff^2 = 100 * 4 = 400
      expect((client as any).calculateDelay(3)).toBe(400);
    });

    it('should cap delay at maxDelay', () => {
      const clientWithMaxDelay = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key',
        retryConfig: {
          maxRetries: 10,
          initialDelayMs: 1000,
          maxDelayMs: 5000,
          backoffMultiplier: 2
        }
      });

      // Attempt 5: 1000 * 2^4 = 16000, but capped at 5000
      expect((clientWithMaxDelay as any).calculateDelay(5)).toBe(5000);
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors', () => {
      const networkError = {
        isAxiosError: true,
        message: 'Network Error',
        response: undefined
      };

      const agentError = (client as any).handleError(networkError);
      expect(agentError.type).toBe('API_ERROR');
      expect(agentError.message).toContain('Network error');
    });

    it('should handle HTTP errors with error message', () => {
      const httpError = {
        isAxiosError: true,
        response: {
          status: 400,
          data: {
            error: 'Invalid request',
            details: 'Missing required field'
          }
        }
      };

      const agentError = (client as any).handleError(httpError);
      expect(agentError.type).toBe('API_ERROR');
      expect(agentError.message).toContain('HTTP 400');
      expect(agentError.message).toContain('Invalid request');
      expect(agentError.message).toContain('Missing required field');
    });

    it('should handle HTTP errors without detailed message', () => {
      const httpError = {
        isAxiosError: true,
        response: {
          status: 500,
          data: {}
        }
      };

      const agentError = (client as any).handleError(httpError);
      expect(agentError.type).toBe('API_ERROR');
      expect(agentError.message).toContain('HTTP 500');
    });
  });

  describe('API Method Signatures', () => {
    it('should have analyzeTechnical method', () => {
      expect(typeof client.analyzeTechnical).toBe('function');
    });

    it('should have analyzeImpact method', () => {
      expect(typeof client.analyzeImpact).toBe('function');
    });

    it('should have analyzeDueDiligence method', () => {
      expect(typeof client.analyzeDueDiligence).toBe('function');
    });

    it('should have analyzeBudget method', () => {
      expect(typeof client.analyzeBudget).toBe('function');
    });

    it('should have analyzeCommunity method', () => {
      expect(typeof client.analyzeCommunity).toBe('function');
    });

    it('should have generateMilestones method', () => {
      expect(typeof client.generateMilestones).toBe('function');
    });

    it('should have healthCheck method', () => {
      expect(typeof client.healthCheck).toBe('function');
    });
  });

  describe('Configuration', () => {
    it('should use custom retry configuration', () => {
      const customClient = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key',
        retryConfig: {
          maxRetries: 5,
          initialDelayMs: 500,
          maxDelayMs: 20000,
          backoffMultiplier: 3
        }
      });

      expect((customClient as any).retryConfig.maxRetries).toBe(5);
      expect((customClient as any).retryConfig.initialDelayMs).toBe(500);
      expect((customClient as any).retryConfig.maxDelayMs).toBe(20000);
      expect((customClient as any).retryConfig.backoffMultiplier).toBe(3);
    });

    it('should use default retry configuration when not provided', () => {
      const defaultClient = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key'
      });

      expect((defaultClient as any).retryConfig.maxRetries).toBe(3);
      expect((defaultClient as any).retryConfig.initialDelayMs).toBe(1000);
      expect((defaultClient as any).retryConfig.backoffMultiplier).toBe(2);
    });

    it('should merge custom and default retry configuration', () => {
      const partialClient = new PythonServiceClient({
        baseURL: 'http://localhost:8000',
        apiKey: 'test-key',
        retryConfig: {
          maxRetries: 5
          // Other values should use defaults
        }
      });

      expect((partialClient as any).retryConfig.maxRetries).toBe(5);
      expect((partialClient as any).retryConfig.initialDelayMs).toBe(1000);
    });
  });
});
