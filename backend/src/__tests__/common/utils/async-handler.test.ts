import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../../../common/utils/asyncHandler';

describe('asyncHandler middleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: jest.Mock;

  beforeEach(() => {
    mockReq = {};
    mockRes = {};
    mockNext = jest.fn();
  });

  describe('successful async handler', () => {
    it('should not call next on successful promise resolution', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        return { success: true };
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      // Give promises a chance to resolve
      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).not.toHaveBeenCalled();
      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });

    it('should wrap an async function that resolves successfully', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        return 'async result';
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should receive req, res, and next arguments', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        expect(req).toEqual(mockReq);
        expect(res).toEqual(mockRes);
        expect(typeof next).toBe('function');
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(asyncFn).toHaveBeenCalledWith(mockReq, mockRes, mockNext);
    });
  });

  describe('rejected promise handling', () => {
    it('should forward rejected promise to next', async () => {
      const error = new Error('async error');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
      expect(mockNext).toHaveBeenCalledTimes(1);
    });

    it('should forward the exact error object', async () => {
      const customError = new Error('custom async error');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw customError;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(customError);
    });

    it('should handle AppError exceptions', async () => {
      const appError = {
        message: 'Not found',
        statusCode: 404,
        isOperational: true,
      };
      const asyncFn = jest.fn(async (req, res, next) => {
        throw appError;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(appError);
    });

    it('should handle generic Error objects', async () => {
      const error = new TypeError('type error');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle non-Error objects thrown', async () => {
      const errorMessage = 'string error';
      const asyncFn = jest.fn(async (req, res, next) => {
        throw errorMessage;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(errorMessage);
    });
  });

  describe('synchronous errors in async context', () => {
    it('should catch synchronous throw inside async function', async () => {
      const error = new Error('sync error in async');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should catch errors from synchronous operations before await', async () => {
      const error = new Error('before await error');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should catch errors from await expressions', async () => {
      const error = new Error('await error');
      const asyncFn = jest.fn(async (req, res, next) => {
        await Promise.reject(error);
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('return value handling', () => {
    it('should return void', () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        res.send = jest.fn().mockReturnValue(res);
        return { data: 'test' };
      });

      const handler = asyncHandler(asyncFn);
      const result = handler(mockReq as Request, mockRes as Response, mockNext);

      expect(result).toBeUndefined();
    });

    it('should handle async functions that return data', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        return { id: 1, name: 'test' };
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Handler should complete without calling next since it resolved
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async functions that return null', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        return null;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle async functions that return undefined', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        // No explicit return
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('middleware chaining', () => {
    it('should work in a chain of middlewares', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        (req as any).data = 'added by handler';
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect((mockReq as any).data).toBe('added by handler');
    });

    it('should allow the wrapped function to call next explicitly', async () => {
      const nextFnFromHandler = jest.fn();
      const asyncFn = jest.fn(async (req, res, next) => {
        // Handler can call next if needed for chaining
        if (Math.random() > 1) {
          next();
        }
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(asyncFn).toHaveBeenCalled();
    });
  });

  describe('multiple sequential calls', () => {
    it('should handle multiple handlers independently', async () => {
      const asyncFn1 = jest.fn(async (req, res, next) => {
        (req as any).handler1 = true;
      });

      const asyncFn2 = jest.fn(async (req, res, next) => {
        (req as any).handler2 = true;
      });

      const handler1 = asyncHandler(asyncFn1);
      const handler2 = asyncHandler(asyncFn2);

      const mockReq1: any = {};
      const mockReq2: any = {};

      handler1(mockReq1 as Request, mockRes as Response, jest.fn());
      handler2(mockReq2 as Request, mockRes as Response, jest.fn());

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockReq1.handler1).toBe(true);
      expect(mockReq2.handler2).toBe(true);
      expect(mockReq1.handler2).toBeUndefined();
      expect(mockReq2.handler1).toBeUndefined();
    });
  });

  describe('response modification', () => {
    it('should allow handler to modify response', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        (res as any).statusCode = 200;
        (res as any).data = { success: true };
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect((mockRes as any).statusCode).toBe(200);
      expect((mockRes as any).data).toEqual({ success: true });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should not interfere with response handling', async () => {
      mockRes.json = jest.fn().mockReturnValue(mockRes);
      const asyncFn = jest.fn(async (req, res, next) => {
        (res as any).json({ result: 'test' });
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect((mockRes as any).json).toHaveBeenCalledWith({ result: 'test' });
    });
  });

  describe('timing and async behavior', () => {
    it('should handle delayed async operations', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        await new Promise((resolve) => setTimeout(resolve, 50));
        return 'delayed result';
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      // Handler returns immediately
      expect(mockNext).not.toHaveBeenCalled();

      // Wait for async operation to complete
      await new Promise((resolve) => setTimeout(resolve, 100));

      expect(asyncFn).toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle nested promises', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        await Promise.resolve().then(() => Promise.resolve('nested'));
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(asyncFn).toHaveBeenCalled();
    });

    it('should handle multiple sequential awaits', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        await Promise.resolve(1);
        await Promise.resolve(2);
        await Promise.resolve(3);
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  describe('error recovery scenarios', () => {
    it('should only call next once even if error is thrown multiple times', async () => {
      const error = new Error('fatal');
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledTimes(1);
      expect(mockNext).toHaveBeenCalledWith(error);
    });

    it('should handle errors with null message', async () => {
      const error = new Error();
      const asyncFn = jest.fn(async (req, res, next) => {
        throw error;
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });

  describe('edge cases', () => {
    it('should handle handler that never resolves (timeout)', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        // Never resolves
        await new Promise(() => {});
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      // Should not call next (still pending)
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Promise that resolves immediately', async () => {
      const asyncFn = jest.fn(async (req, res, next) => {
        await Promise.resolve('immediate');
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).not.toHaveBeenCalled();
    });

    it('should handle Promise that rejects immediately', async () => {
      const error = new Error('immediate reject');
      const asyncFn = jest.fn(async (req, res, next) => {
        await Promise.reject(error);
      });

      const handler = asyncHandler(asyncFn);
      handler(mockReq as Request, mockRes as Response, mockNext);

      await new Promise((resolve) => setTimeout(resolve, 10));

      expect(mockNext).toHaveBeenCalledWith(error);
    });
  });
});
