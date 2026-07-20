import { Response, NextFunction } from 'express';
import { isAuthenticated, authorize } from '../../../common/middleware/auth.middleware';
import { AuthRequest } from '../../../common/types';
import {
  connectInMemoryDatabase,
  clearDatabase,
  closeInMemoryDatabase,
} from '../../setup/in-memory-database';
import { createAuthedUser, tokenForMissingUser, uniqueEmail, createTestUser } from '../../setup/auth-test-helpers';
import * as dbModule from '../../../config/database';

describe('Auth middleware', () => {
  beforeAll(async () => {
    await connectInMemoryDatabase();
    // Flag that DB is connected so code paths use real MongoDB instead of mock store
    dbModule.isDbConnected = true;
  });

  afterEach(async () => {
    await clearDatabase();
  });

  afterAll(async () => {
    await closeInMemoryDatabase();
  });

  describe('isAuthenticated middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = { cookies: {}, headers: {} };
      mockRes = {};
      mockNext = jest.fn();
    });

    describe('token from cookie', () => {
      it('should authenticate user from cookie token', async () => {
        const { user, id, token, cookie } = await createAuthedUser('PARTICIPANT');
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect((mockReq as AuthRequest).user).toBeDefined();
        expect((mockReq as AuthRequest).user?.id).toBe(id);
        expect((mockReq as AuthRequest).user?.email).toBe(user.email);
        expect((mockReq as AuthRequest).user?.role).toBe('PARTICIPANT');
      });

      it('should read token from named "token" cookie', async () => {
        const { id, token } = await createAuthedUser('ADMIN');
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect((mockReq as AuthRequest).user?.id).toBe(id);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('token from Authorization header', () => {
      it('should authenticate user from Bearer header', async () => {
        const { user, id, token } = await createAuthedUser('ORGANIZER');
        mockReq.headers = { authorization: `Bearer ${token}` };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect((mockReq as AuthRequest).user?.id).toBe(id);
        expect((mockReq as AuthRequest).user?.role).toBe('ORGANIZER');
      });

      it('should ignore malformed Authorization header', async () => {
        const { token } = await createAuthedUser('PARTICIPANT');
        mockReq.headers = { authorization: `InvalidPrefix ${token}` };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Object));
        expect((mockNext.mock.calls[0][0] as any).statusCode).toBe(401);
      });

      it('should require "Bearer " prefix', async () => {
        const { token } = await createAuthedUser('PARTICIPANT');
        mockReq.headers = { authorization: token }; // No "Bearer " prefix

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });

      it('should handle Authorization header without token', async () => {
        mockReq.headers = { authorization: 'Bearer ' };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });
    });

    describe('cookie takes precedence over header', () => {
      it('should prefer cookie token over Authorization header', async () => {
        const { id: id1, token: token1 } = await createAuthedUser('PARTICIPANT');
        const { id: id2, token: token2 } = await createAuthedUser('ADMIN');

        mockReq.cookies = { token: token1 };
        mockReq.headers = { authorization: `Bearer ${token2}` };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        // Should use cookie token (id1), not header token (id2)
        expect((mockReq as AuthRequest).user?.id).toBe(id1);
        expect((mockReq as AuthRequest).user?.role).toBe('PARTICIPANT');
      });
    });

    describe('missing token', () => {
      it('should return 401 when no token provided', async () => {
        mockReq.cookies = {};
        mockReq.headers = {};

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Object));
        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Vui lòng đăng nhập để thực hiện chức năng này');
      });

      it('should return 401 with Vietnamese message', async () => {
        mockReq.cookies = {};

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.message).toContain('đăng nhập');
      });
    });

    describe('invalid/expired token', () => {
      it('should return 401 for invalid token signature', async () => {
        mockReq.cookies = { token: 'invalid.token.here' };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
        expect(error.message).toContain('Token không hợp lệ');
      });

      it('should return 401 for malformed token', async () => {
        mockReq.cookies = { token: 'notokenformat' };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });

      it('should return 401 for tampered token', async () => {
        const { token } = await createAuthedUser('PARTICIPANT');
        const parts = token.split('.');
        // Tamper with payload
        const tamperedToken = `${parts[0]}.tampered.${parts[2]}`;

        mockReq.cookies = { token: tamperedToken };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });
    });

    describe('deleted user', () => {
      it('should return 401 when user does not exist', async () => {
        const token = tokenForMissingUser();
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Tài khoản không tồn tại trên hệ thống');
      });

      it('should validate user still exists in database', async () => {
        const { user, id, token } = await createAuthedUser('PARTICIPANT');
        mockReq.cookies = { token };

        // User exists, should authenticate
        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);
        expect(mockNext).toHaveBeenCalledWith();

        // Delete user from database
        await user.deleteOne();

        // Reset mocks
        mockNext.mockClear();
        mockReq.cookies = { token };

        // Now should fail
        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);
        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });
    });

    describe('banned user', () => {
      it('should return 403 when user is BANNED', async () => {
        const { user, id, token } = await createAuthedUser('PARTICIPANT', { accountStatus: 'BANNED' });
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
        expect(error.message).toContain('khóa');
        expect(error.message).toContain('quản trị viên');
      });

      it('should return Vietnamese message for banned user', async () => {
        const { token } = await createAuthedUser('ADMIN', { accountStatus: 'BANNED' });
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.message).toBe('Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên.');
      });
    });

    describe('active user', () => {
      it('should authenticate ACTIVE user', async () => {
        const { id, user, token } = await createAuthedUser('PARTICIPANT', { accountStatus: 'ACTIVE' });
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect((mockReq as AuthRequest).user).toBeDefined();
        expect((mockReq as AuthRequest).user?.id).toBe(id);
      });

      it('should set req.user with id, email, and role', async () => {
        const { user, id, token } = await createAuthedUser('ORGANIZER');
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const authReq = mockReq as AuthRequest;
        expect(authReq.user).toBeDefined();
        expect(authReq.user?.id).toBe(id);
        expect(authReq.user?.email).toBe(user.email);
        expect(authReq.user?.role).toBe('ORGANIZER');
      });

      it('should convert user._id to string', async () => {
        const { user, token } = await createAuthedUser('STAFF');
        mockReq.cookies = { token };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const id = (mockReq as AuthRequest).user?.id;
        expect(typeof id).toBe('string');
        expect(id).toBe((user._id as any).toString());
      });

      it('should preserve user role in req.user', async () => {
        const roles = ['ADMIN', 'ORGANIZER', 'PARTICIPANT', 'STAFF'] as const;

        for (const role of roles) {
          mockNext.mockClear();
          const { token } = await createAuthedUser(role);
          mockReq.cookies = { token };

          await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

          expect((mockReq as AuthRequest).user?.role).toBe(role);
        }
      });
    });

    describe('error handling and edge cases', () => {
      it('should catch and forward unexpected errors', async () => {
        mockReq.cookies = { token: 'valid-format.token.here' };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalled();
      });

      it('should handle missing cookies object gracefully', async () => {
        mockReq.cookies = undefined;
        mockReq.headers = {};

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
      });

      it('should handle missing headers object gracefully', async () => {
        mockReq.cookies = {};
        mockReq.headers = undefined as any;

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        // Should call next with an error (401 - no token)
        expect(mockNext).toHaveBeenCalled();
        const args = mockNext.mock.calls[0];
        expect(args.length).toBeGreaterThan(0);
      });

      it('should handle token with spaces', async () => {
        const { token } = await createAuthedUser('PARTICIPANT');
        mockReq.headers = { authorization: `Bearer  ${token}  ` };

        await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);

        // Should handle gracefully (likely fail due to extra spaces)
        expect(mockNext).toHaveBeenCalled();
      });
    });
  });

  describe('authorize middleware', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = {};
      mockRes = {};
      mockNext = jest.fn();
    });

    describe('authorization success', () => {
      it('should allow user with matching role', async () => {
        mockReq.user = { id: 'user123', email: 'test@example.com', role: 'ADMIN' };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow user with role in multi-role list', async () => {
        mockReq.user = { id: 'user123', email: 'test@example.com', role: 'ORGANIZER' };

        const authMiddleware = authorize('ADMIN', 'ORGANIZER', 'STAFF');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should allow multiple different roles', async () => {
        const roles = ['ADMIN', 'ORGANIZER', 'PARTICIPANT', 'STAFF'];

        for (const role of roles) {
          mockNext.mockClear();
          mockReq.user = { id: 'user', email: 'test@example.com', role };

          const authMiddleware = authorize(...(roles as any));
          authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

          expect(mockNext).toHaveBeenCalledWith();
        }
      });

      it('should call next with no arguments on success', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'ADMIN' };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledTimes(1);
        expect(mockNext).toHaveBeenCalledWith();
      });
    });

    describe('authorization failure - no user', () => {
      it('should return 401 when no req.user', async () => {
        mockReq.user = undefined;

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(401);
        expect(error.message).toBe('Vui lòng đăng nhập để thực hiện chức năng này');
      });

      it('should return Vietnamese message when no user', async () => {
        mockReq.user = undefined;

        const authMiddleware = authorize('STAFF');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.message).toContain('đăng nhập');
      });
    });

    describe('authorization failure - insufficient role', () => {
      it('should return 403 when role not in allowed list', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'PARTICIPANT' };

        const authMiddleware = authorize('ADMIN', 'ORGANIZER');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('Bạn không có quyền thực hiện hành động này');
      });

      it('should return Vietnamese message for insufficient role', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'PARTICIPANT' };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.message).toContain('quyền');
      });

      it('should handle single role restriction', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'PARTICIPANT' };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith(expect.any(Object));
        expect((mockNext.mock.calls[0][0] as any).statusCode).toBe(403);
      });
    });

    describe('role comparison', () => {
      it('should use exact role matching (case-sensitive)', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'admin' }; // lowercase

        const authMiddleware = authorize('ADMIN'); // uppercase
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        // Should NOT match due to case difference
        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });

      it('should match exact role strings', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'ADMIN' };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should not match partial role strings', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'ADMIN' };

        const authMiddleware = authorize('ADM');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });
    });

    describe('multiple roles', () => {
      it('should accept any matching role from list', async () => {
        const allowedRoles = ['ADMIN', 'ORGANIZER', 'STAFF'];

        for (const userRole of ['ADMIN', 'ORGANIZER', 'STAFF']) {
          mockNext.mockClear();
          mockReq.user = { id: 'user', email: 'test@example.com', role: userRole };

          const authMiddleware = authorize(...(allowedRoles as any));
          authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

          expect(mockNext).toHaveBeenCalledWith();
        }
      });

      it('should reject role not in list with multiple roles', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'PARTICIPANT' };

        const authMiddleware = authorize('ADMIN', 'ORGANIZER', 'STAFF');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });

      it('should handle empty role list', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'ADMIN' };

        const authMiddleware = authorize();
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });
    });

    describe('edge cases', () => {
      it('should handle null role in req.user', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: null as any };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });

      it('should handle undefined role in req.user', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: undefined as any };

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });

      it('should handle very long role list', async () => {
        mockReq.user = { id: 'user', email: 'test@example.com', role: 'ROLE_50' };

        const roles = Array.from({ length: 100 }, (_, i) => `ROLE_${i}`);
        const authMiddleware = authorize(...(roles as any));
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
      });

      it('should handle empty user object', async () => {
        mockReq.user = {} as any;

        const authMiddleware = authorize('ADMIN');
        authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

        const error = mockNext.mock.calls[0][0];
        expect(error.statusCode).toBe(403);
      });
    });
  });

  describe('integration: isAuthenticated + authorize', () => {
    let mockReq: Partial<AuthRequest>;
    let mockRes: Partial<Response>;
    let mockNext: jest.Mock;

    beforeEach(() => {
      mockReq = { cookies: {}, headers: {} };
      mockRes = {};
      mockNext = jest.fn();
    });

    it('should chain isAuthenticated then authorize', async () => {
      const { token } = await createAuthedUser('ADMIN');
      mockReq.cookies = { token };

      // First middleware: isAuthenticated
      await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
      expect((mockReq as AuthRequest).user).toBeDefined();

      // Reset next mock
      mockNext.mockClear();

      // Second middleware: authorize
      const authMiddleware = authorize('ADMIN');
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalledWith();
    });

    it('should fail at authorize if role insufficient', async () => {
      const { token } = await createAuthedUser('PARTICIPANT');
      mockReq.cookies = { token };

      // First middleware: isAuthenticated
      await isAuthenticated(mockReq as AuthRequest, mockRes as Response, mockNext);
      expect((mockReq as AuthRequest).user?.role).toBe('PARTICIPANT');

      // Reset next mock
      mockNext.mockClear();

      // Second middleware: authorize (ADMIN only)
      const authMiddleware = authorize('ADMIN');
      authMiddleware(mockReq as AuthRequest, mockRes as Response, mockNext);

      const error = mockNext.mock.calls[0][0];
      expect(error.statusCode).toBe(403);
    });
  });
});
