import {
  Span,
  SpanDatabase,
  SpanExternalService,
  SpanMessageQueue,
  SpanCache,
} from './tracing.decorator';

// Mock OpenTelemetry
const mockSpan = {
  setAttribute: jest.fn(),
  setStatus: jest.fn(),
  recordException: jest.fn(),
  end: jest.fn(),
};

jest.mock('@opentelemetry/api', () => ({
  trace: {
    getTracer: jest.fn(() => ({
      startSpan: jest.fn(() => mockSpan),
    })),
  },
  SpanKind: { INTERNAL: 0, CLIENT: 1 },
  SpanStatusCode: { OK: 1, ERROR: 2 },
}));

describe('Tracing Decorators', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('@Span', () => {
    it('should wrap method with span', async () => {
      class TestService {
        @Span()
        async testMethod(): Promise<string> {
          return 'result';
        }
      }

      const service = new TestService();
      const result = await service.testMethod();

      expect(result).toBe('result');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({ code: 1 });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should use custom span name', async () => {
      class TestService {
        @Span('custom.operation')
        async customMethod(): Promise<string> {
          return 'custom';
        }
      }

      const service = new TestService();
      await service.customMethod();

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should record exception on error', async () => {
      const error = new Error('Test error');

      class TestService {
        @Span()
        async failingMethod(): Promise<void> {
          throw error;
        }
      }

      const service = new TestService();

      await expect(service.failingMethod()).rejects.toThrow('Test error');
      expect(mockSpan.setStatus).toHaveBeenCalledWith({
        code: 2,
        message: 'Test error',
      });
      expect(mockSpan.recordException).toHaveBeenCalledWith(error);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('@SpanDatabase', () => {
    it('should create database span', async () => {
      class DatabaseService {
        @SpanDatabase('find', 'devices')
        async findDevices(): Promise<unknown[]> {
          return [];
        }
      }

      const service = new DatabaseService();
      const result = await service.findDevices();

      expect(result).toEqual([]);
      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('@SpanExternalService', () => {
    it('should create external service span', async () => {
      class ExternalService {
        @SpanExternalService('payment-api', 'processPayment')
        async callExternal(): Promise<{ success: boolean }> {
          return { success: true };
        }
      }

      const service = new ExternalService();
      const result = await service.callExternal();

      expect(result).toEqual({ success: true });
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should handle external service errors', async () => {
      class ExternalService {
        @SpanExternalService('payment-api', 'failingCall')
        async failingCall(): Promise<void> {
          throw new Error('Service unavailable');
        }
      }

      const service = new ExternalService();

      await expect(service.failingCall()).rejects.toThrow('Service unavailable');
      expect(mockSpan.recordException).toHaveBeenCalled();
    });
  });

  describe('@SpanMessageQueue', () => {
    it('should create message queue span for publish', async () => {
      class QueueService {
        @SpanMessageQueue('events', 'publish')
        async publish(): Promise<void> {
          // publish logic
        }
      }

      const service = new QueueService();
      await service.publish();

      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should create message queue span for consume', async () => {
      class QueueService {
        @SpanMessageQueue('events', 'consume')
        async consume(): Promise<void> {
          // consume logic
        }
      }

      const service = new QueueService();
      await service.consume();

      expect(mockSpan.end).toHaveBeenCalled();
    });
  });

  describe('@SpanCache', () => {
    it('should create cache span for get operation', async () => {
      class CacheService {
        @SpanCache('get')
        async getFromCache(): Promise<string | null> {
          return 'cached-value';
        }
      }

      const service = new CacheService();
      const result = await service.getFromCache();

      expect(result).toBe('cached-value');
      expect(mockSpan.end).toHaveBeenCalled();
    });

    it('should create cache span for set operation', async () => {
      class CacheService {
        @SpanCache('set')
        async setCache(): Promise<void> {
          // set logic
        }
      }

      const service = new CacheService();
      await service.setCache();

      expect(mockSpan.end).toHaveBeenCalled();
    });
  });
});

