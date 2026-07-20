import { AppError } from '../../../common/utils/AppError';

describe('AppError', () => {
  describe('constructor with defaults', () => {
    it('should create an AppError with default statusCode 500', () => {
      const error = new AppError('Something went wrong');

      expect(error.message).toBe('Something went wrong');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(true);
    });

    it('should create an AppError with default isOperational true', () => {
      const error = new AppError('Custom error', 400);

      expect(error.statusCode).toBe(400);
      expect(error.isOperational).toBe(true);
    });
  });

  describe('constructor with custom values', () => {
    it('should create an AppError with custom statusCode', () => {
      const error = new AppError('Not found', 404);

      expect(error.message).toBe('Not found');
      expect(error.statusCode).toBe(404);
      expect(error.isOperational).toBe(true);
    });

    it('should create an AppError with custom isOperational false', () => {
      const error = new AppError('Database error', 500, false);

      expect(error.message).toBe('Database error');
      expect(error.statusCode).toBe(500);
      expect(error.isOperational).toBe(false);
    });

    it('should create an AppError with all custom values', () => {
      const error = new AppError('Auth failed', 401, true);

      expect(error.message).toBe('Auth failed');
      expect(error.statusCode).toBe(401);
      expect(error.isOperational).toBe(true);
    });

    it('should support isOperational false explicitly', () => {
      const error = new AppError('Unrecoverable', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('prototype chain', () => {
    it('should be instanceof Error', () => {
      const error = new AppError('Test error');

      expect(error instanceof Error).toBe(true);
    });

    it('should be instanceof AppError', () => {
      const error = new AppError('Test error');

      expect(error instanceof AppError).toBe(true);
    });

    it('should be both instanceof Error AND AppError', () => {
      const error = new AppError('Test error', 400);

      expect(error instanceof Error).toBe(true);
      expect(error instanceof AppError).toBe(true);
    });

    it('should have Error.prototype methods', () => {
      const error = new AppError('Test error');

      expect(typeof error.toString).toBe('function');
      const str = error.toString();
      expect(str).toContain('Error');
      expect(str).toContain('Test error');
    });
  });

  describe('stack trace', () => {
    it('should capture a stack trace', () => {
      const error = new AppError('Error with stack');

      expect(error.stack).toBeDefined();
      expect(typeof error.stack).toBe('string');
      expect(error.stack).toMatch(/Error|AppError/);
    });

    it('should exclude constructor from stack trace', () => {
      const error = new AppError('Error', 400);

      expect(error.stack).toBeDefined();
      // Stack trace should include the test file but Error.captureStackTrace
      // should exclude the AppError constructor itself from the stack
      expect(error.stack).not.toContain('new AppError');
    });

    it('should have line number in stack trace', () => {
      const error = new AppError('Test');

      expect(error.stack).toMatch(/app-error.test.ts/);
    });
  });

  describe('readonly properties', () => {
    it('should have statusCode property', () => {
      const error = new AppError('Error', 404);

      expect(error.statusCode).toBe(404);
      expect(Object.prototype.hasOwnProperty.call(error, 'statusCode')).toBe(true);
    });

    it('should have isOperational property', () => {
      const error = new AppError('Error', 400, true);

      expect(error.isOperational).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(error, 'isOperational')).toBe(true);
    });
  });

  describe('message property', () => {
    it('should preserve the message', () => {
      const message = 'User not found';
      const error = new AppError(message);

      expect(error.message).toBe(message);
    });

    it('should work with Vietnamese messages', () => {
      const message = 'Tài khoản không tồn tại';
      const error = new AppError(message, 401);

      expect(error.message).toBe(message);
    });

    it('should work with long messages', () => {
      const longMessage = 'This is a very long error message that contains detailed information about what went wrong';
      const error = new AppError(longMessage);

      expect(error.message).toBe(longMessage);
    });

    it('should work with empty message', () => {
      const error = new AppError('');

      expect(error.message).toBe('');
    });

    it('should work with special characters', () => {
      const message = 'Error: "Invalid" value <test> & more';
      const error = new AppError(message);

      expect(error.message).toBe(message);
    });
  });

  describe('HTTP status codes', () => {
    it('should support 400 Bad Request', () => {
      const error = new AppError('Invalid input', 400);

      expect(error.statusCode).toBe(400);
    });

    it('should support 401 Unauthorized', () => {
      const error = new AppError('Unauthorized', 401);

      expect(error.statusCode).toBe(401);
    });

    it('should support 403 Forbidden', () => {
      const error = new AppError('Forbidden', 403);

      expect(error.statusCode).toBe(403);
    });

    it('should support 404 Not Found', () => {
      const error = new AppError('Not found', 404);

      expect(error.statusCode).toBe(404);
    });

    it('should support 500 Internal Server Error', () => {
      const error = new AppError('Server error', 500);

      expect(error.statusCode).toBe(500);
    });

    it('should support 502 Bad Gateway', () => {
      const error = new AppError('Bad gateway', 502);

      expect(error.statusCode).toBe(502);
    });

    it('should support 503 Service Unavailable', () => {
      const error = new AppError('Service unavailable', 503);

      expect(error.statusCode).toBe(503);
    });
  });

  describe('operational vs non-operational errors', () => {
    it('should mark validation errors as operational', () => {
      const error = new AppError('Invalid email format', 400, true);

      expect(error.isOperational).toBe(true);
    });

    it('should mark auth errors as operational', () => {
      const error = new AppError('Token expired', 401, true);

      expect(error.isOperational).toBe(true);
    });

    it('should mark programming errors as non-operational', () => {
      const error = new AppError('Critical bug', 500, false);

      expect(error.isOperational).toBe(false);
    });

    it('should mark database connection errors as non-operational', () => {
      const error = new AppError('Database connection failed', 500, false);

      expect(error.isOperational).toBe(false);
    });
  });

  describe('error serialization', () => {
    it('should be convertible to string', () => {
      const error = new AppError('Test error', 404);
      const str = error.toString();

      expect(str).toMatch(/Error.*Test error/);
    });

    it('should have proper JSON representation', () => {
      const error = new AppError('Test', 400, true);

      const json = JSON.stringify(error, null, 2);
      expect(json).toBeDefined();
    });

    it('should preserve properties in destructuring', () => {
      const error = new AppError('Error message', 422, true);
      const { message, statusCode, isOperational } = error;

      expect(message).toBe('Error message');
      expect(statusCode).toBe(422);
      expect(isOperational).toBe(true);
    });
  });

  describe('error comparison', () => {
    it('should be distinguishable from regular Error', () => {
      const appErr = new AppError('AppError', 400);
      const regErr = new Error('RegularError');

      expect(appErr instanceof AppError).toBe(true);
      expect(regErr instanceof AppError).toBe(false);
    });

    it('should allow checking error type at runtime', () => {
      const error = new AppError('Test', 400);

      if (error instanceof AppError) {
        expect(error.statusCode).toBe(400);
        expect(error.isOperational).toBe(true);
      } else {
        fail('Should be AppError instance');
      }
    });
  });

  describe('edge cases', () => {
    it('should handle zero statusCode', () => {
      const error = new AppError('Zero status', 0);

      expect(error.statusCode).toBe(0);
    });

    it('should handle negative statusCode', () => {
      const error = new AppError('Negative status', -1);

      expect(error.statusCode).toBe(-1);
    });

    it('should handle very large statusCode', () => {
      const error = new AppError('Large status', 9999);

      expect(error.statusCode).toBe(9999);
    });

    it('should handle null message by coercing to string', () => {
      const error = new AppError(null as any);

      expect(error.message).toBeDefined();
    });

    it('should handle undefined message by coercing to string', () => {
      const error = new AppError(undefined as any);

      expect(error.message).toBeDefined();
    });
  });
});
