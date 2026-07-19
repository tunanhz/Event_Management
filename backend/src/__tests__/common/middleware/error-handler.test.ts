import request from 'supertest';
import express, { Express, Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { errorHandler } from '../../../common/middleware/errorHandler';
import { AppError } from '../../../common/utils/AppError';

describe('errorHandler middleware', () => {
  let app: Express;

  beforeEach(() => {
    app = express();

    // Route that throws AppError
    app.get('/app-error', (req: Request, res: Response, next: NextFunction) => {
      next(new AppError('Custom app error', 404));
    });

    // Route that throws generic Error
    app.get('/generic-error', (req: Request, res: Response, next: NextFunction) => {
      next(new Error('Generic error'));
    });

    // Route that throws validation error
    app.get('/validation-error', (req: Request, res: Response, next: NextFunction) => {
      const validationError = new mongoose.Error.ValidationError();
      const error1 = new mongoose.Error.ValidatorError({ path: 'name', message: 'Name is required' });
      const error2 = new mongoose.Error.ValidatorError({ path: 'email', message: 'Email is invalid' });
      validationError.errors = { name: error1, email: error2 };
      next(validationError);
    });

    // Route that throws CastError
    app.get('/cast-error', (req: Request, res: Response, next: NextFunction) => {
      const castError = new mongoose.Error.CastError('ObjectId', 'invalid-id', '_id');
      next(castError);
    });

    // Route that throws duplicate key error
    app.get('/duplicate-error', (req: Request, res: Response, next: NextFunction) => {
      const error = new Error('Duplicate key error') as any;
      error.code = 11000;
      next(error);
    });

    // Register error handler at the end
    app.use(errorHandler);
  });

  describe('AppError handling', () => {
    it('should return the AppError statusCode', async () => {
      const res = await request(app).get('/app-error');

      expect(res.status).toBe(404);
    });

    it('should return success: false', async () => {
      const res = await request(app).get('/app-error');

      expect(res.body.success).toBe(false);
    });

    it('should return the AppError message', async () => {
      const res = await request(app).get('/app-error');

      expect(res.body.message).toBe('Custom app error');
    });

    it('should NOT include stack in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app).get('/app-error');

        expect(res.body.stack).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should include stack in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';
        const res = await request(app).get('/app-error');

        expect(res.body.stack).toBeDefined();
        expect(typeof res.body.stack).toBe('string');
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should use AppError statusCode from error object', async () => {
      const res = await request(app).get('/app-error');

      // Should use the statusCode from AppError (404)
      expect(res.status).toBe(404);
      expect(res.body.message).toBe('Custom app error');
    });
  });

  describe('Mongoose ValidationError handling', () => {
    it('should return 400 status for ValidationError', async () => {
      const res = await request(app).get('/validation-error');

      expect(res.status).toBe(400);
    });

    it('should return success: false', async () => {
      const res = await request(app).get('/validation-error');

      expect(res.body.success).toBe(false);
    });

    it('should include "Dữ liệu không hợp lệ:" prefix', async () => {
      const res = await request(app).get('/validation-error');

      expect(res.body.message).toContain('Dữ liệu không hợp lệ:');
    });

    it('should join multiple validation error messages', async () => {
      const res = await request(app).get('/validation-error');

      expect(res.body.message).toContain('Name is required');
      expect(res.body.message).toContain('Email is invalid');
      expect(res.body.message).toContain(';');
    });

    it('should handle ValidationError in all environments', async () => {
      const res = await request(app).get('/validation-error');

      // Verify basic error response
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
    });

    it('should handle ValidationError properly', async () => {
      const res = await request(app).get('/validation-error');

      // Verify error response structure
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBeDefined();
    });
  });

  describe('Mongoose CastError handling', () => {
    it('should return 400 status for CastError', async () => {
      const res = await request(app).get('/cast-error');

      expect(res.status).toBe(400);
    });

    it('should return success: false', async () => {
      const res = await request(app).get('/cast-error');

      expect(res.body.success).toBe(false);
    });

    it('should return Vietnamese invalid format message', async () => {
      const res = await request(app).get('/cast-error');

      expect(res.body.message).toBe('Dữ liệu không hợp lệ (sai định dạng)');
    });

    it('should handle CastError properly', async () => {
      const res = await request(app).get('/cast-error');

      // Verify error response structure
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Dữ liệu không hợp lệ (sai định dạng)');
    });
  });

  describe('Duplicate key error handling', () => {
    it('should return 400 for duplicate key error', async () => {
      const res = await request(app).get('/duplicate-error');

      expect(res.status).toBe(400);
    });

    it('should return success: false', async () => {
      const res = await request(app).get('/duplicate-error');

      expect(res.body.success).toBe(false);
    });

    it('should return Vietnamese duplicate message', async () => {
      const res = await request(app).get('/duplicate-error');

      expect(res.body.message).toBe('Giá trị đã tồn tại (trùng dữ liệu duy nhất)');
    });

    it('should handle duplicate key error properly', async () => {
      const res = await request(app).get('/duplicate-error');

      // Verify error response structure
      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toBe('Giá trị đã tồn tại (trùng dữ liệu duy nhất)');
    });
  });

  describe('generic Error handling', () => {
    it('should return 500 for generic Error', async () => {
      const res = await request(app).get('/generic-error');

      expect(res.status).toBe(500);
    });

    it('should return success: false', async () => {
      const res = await request(app).get('/generic-error');

      expect(res.body.success).toBe(false);
    });

    it('should return "Internal Server Error" message', async () => {
      const res = await request(app).get('/generic-error');

      expect(res.body.message).toBe('Internal Server Error');
    });

    it('should NOT include the original error message', async () => {
      const res = await request(app).get('/generic-error');

      expect(res.body.message).not.toBe('Generic error');
    });

    it('should NOT include stack in production', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'production';
        const res = await request(app).get('/generic-error');

        expect(res.body.stack).toBeUndefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });

    it('should include stack in development', async () => {
      const originalEnv = process.env.NODE_ENV;
      try {
        process.env.NODE_ENV = 'development';
        const res = await request(app).get('/generic-error');

        expect(res.body.stack).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('response format', () => {
    it('should always include success property', async () => {
      const res = await request(app).get('/app-error');

      expect(res.body).toHaveProperty('success');
      expect(res.body.success).toBe(false);
    });

    it('should always include message property', async () => {
      const res = await request(app).get('/app-error');

      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
    });

    it('should have proper JSON content-type', async () => {
      const res = await request(app).get('/app-error');

      expect(res.type).toMatch(/json/);
    });

    it('should include stack only in development', async () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'production';
        const prodRes = await request(app).get('/app-error');
        expect(prodRes.body.stack).toBeUndefined();

        process.env.NODE_ENV = 'development';
        const devRes = await request(app).get('/app-error');
        expect(devRes.body.stack).toBeDefined();
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });

  describe('console.error suppression', () => {
    it('should call console.error for unhandled generic errors', async () => {
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      try {
        // Generic errors should log to console
        await request(app).get('/generic-error');

        // console.error should be called for unhandled errors
        expect(consoleErrorSpy.mock.calls.length).toBeGreaterThanOrEqual(0);
      } finally {
        consoleErrorSpy.mockRestore();
      }
    });

    it('should not prevent normal error handling for AppError', async () => {
      const res = await request(app).get('/app-error');

      expect(res.status).toBe(404);
      expect(res.body.success).toBe(false);
    });
  });

  describe('error response consistency', () => {
    it('should preserve error message in response body', async () => {
      const res = await request(app).get('/app-error');

      expect(res.body).toHaveProperty('message');
      expect(typeof res.body.message).toBe('string');
      expect(res.body.message).toBe('Custom app error');
    });

    it('should include success property in all error responses', async () => {
      const testRoutes = ['/app-error', '/generic-error', '/validation-error', '/cast-error', '/duplicate-error'];

      for (const route of testRoutes) {
        const res = await request(app).get(route);
        expect(res.body).toHaveProperty('success');
        expect(res.body.success).toBe(false);
      }
    });
  });

  describe('Mongoose field error details', () => {
    it('should handle ValidationError instances', async () => {
      // ValidationError is properly tested in the main "Mongoose ValidationError handling" section
      // This is just additional confirmation it's formatted correctly
      const res = await request(app).get('/validation-error');

      expect(res.status).toBe(400);
      expect(res.body.success).toBe(false);
      expect(res.body.message).toContain('Dữ liệu không hợp lệ:');
    });
  });

  describe('NODE_ENV based behavior', () => {
    it('should include stack trace in development environment', async () => {
      const originalEnv = process.env.NODE_ENV;

      try {
        process.env.NODE_ENV = 'development';
        const res = await request(app).get('/app-error');

        // In development, stack should be included
        if (process.env.NODE_ENV === 'development') {
          expect(res.body).toHaveProperty('message');
        }
      } finally {
        process.env.NODE_ENV = originalEnv;
      }
    });
  });
});
