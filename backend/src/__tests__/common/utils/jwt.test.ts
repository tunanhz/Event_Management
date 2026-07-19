import jwt from 'jsonwebtoken';
import { generateToken, verifyToken, TokenPayload } from '../../../common/utils/jwt';
import { config } from '../../../config';

describe('JWT utilities', () => {
  describe('generateToken', () => {
    it('should generate a valid JWT token', () => {
      const payload: TokenPayload = {
        id: 'user123',
        email: 'test@example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);

      expect(token).toBeDefined();
      expect(typeof token).toBe('string');
      expect(token.split('.').length).toBe(3);
    });

    it('should generate a token with three dot-separated segments', () => {
      const payload: TokenPayload = {
        id: 'user456',
        email: 'user@example.com',
        role: 'ADMIN',
      };

      const token = generateToken(payload);
      const parts = token.split('.');

      expect(parts).toHaveLength(3);
      expect(parts[0]).toBeTruthy();
      expect(parts[1]).toBeTruthy();
      expect(parts[2]).toBeTruthy();
    });

    it('should create unique tokens for different payloads', () => {
      const payload1: TokenPayload = {
        id: 'user1',
        email: 'test1@example.com',
        role: 'PARTICIPANT',
      };
      const payload2: TokenPayload = {
        id: 'user2',
        email: 'test2@example.com',
        role: 'ADMIN',
      };

      const token1 = generateToken(payload1);
      const token2 = generateToken(payload2);

      expect(token1).not.toBe(token2);
    });

    it('should be decodable without verification', () => {
      const payload: TokenPayload = {
        id: 'testuser',
        email: 'test@example.com',
        role: 'ORGANIZER',
      };

      const token = generateToken(payload);

      // jwt.decode does not verify the signature
      const decoded = jwt.decode(token);

      expect(decoded).toBeTruthy();
      expect((decoded as any).id).toBe('testuser');
      expect((decoded as any).email).toBe('test@example.com');
      expect((decoded as any).role).toBe('ORGANIZER');
    });

    it('should include standard JWT claims (iat, exp)', () => {
      const payload: TokenPayload = {
        id: 'user789',
        email: 'claims@example.com',
        role: 'STAFF',
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token) as any;

      expect(decoded.iat).toBeDefined();
      expect(typeof decoded.iat).toBe('number');
      expect(decoded.exp).toBeDefined();
      expect(typeof decoded.exp).toBe('number');
      expect(decoded.exp).toBeGreaterThan(decoded.iat);
    });

    it('should use expiresIn from config', () => {
      const payload: TokenPayload = {
        id: 'user',
        email: 'test@example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);
      const decoded = jwt.decode(token) as any;

      // Token should expire 1 hour from now (configured in env.setup.ts)
      const now = Math.floor(Date.now() / 1000);
      const expiresIn = decoded.exp - now;

      // Should be approximately 1 hour (3600 seconds), allow some margin
      expect(expiresIn).toBeGreaterThan(3500);
      expect(expiresIn).toBeLessThanOrEqual(3600);
    });
  });

  describe('verifyToken', () => {
    it('should verify and decode a valid token', () => {
      const payload: TokenPayload = {
        id: 'verify123',
        email: 'verify@example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });

    it('should round-trip token generation and verification', () => {
      const originalPayload: TokenPayload = {
        id: 'roundtrip',
        email: 'roundtrip@example.com',
        role: 'ORGANIZER',
      };

      const token = generateToken(originalPayload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(originalPayload.id);
      expect(decoded.email).toBe(originalPayload.email);
      expect(decoded.role).toBe(originalPayload.role);
    });

    it('should throw on tampered payload', () => {
      const payload: TokenPayload = {
        id: 'tamper-test',
        email: 'tamper@example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);
      const parts = token.split('.');

      // Tamper with the payload (middle part)
      const tamperedPayload = Buffer.from('{"id":"hacker","email":"hacker@evil.com","role":"ADMIN"}').toString(
        'base64'
      );
      const tamperedToken = `${parts[0]}.${tamperedPayload}.${parts[2]}`;

      expect(() => {
        verifyToken(tamperedToken);
      }).toThrow();
    });

    it('should throw on malformed token string', () => {
      const malformedTokens = [
        'not.a.token.at.all',
        'only.two',
        '',
        'notokenformathere',
        '....',
      ];

      for (const malformed of malformedTokens) {
        expect(() => {
          verifyToken(malformed);
        }).toThrow();
      }
    });

    it('should throw on token signed with different secret', () => {
      const payload: TokenPayload = {
        id: 'secret-test',
        email: 'secret@example.com',
        role: 'STAFF',
      };

      // Sign with a different secret
      const differentSecret = 'completely_different_secret_key';
      const token = jwt.sign(payload, differentSecret, {
        expiresIn: '1h',
      });

      expect(() => {
        verifyToken(token);
      }).toThrow();
    });

    it('should throw on expired token', () => {
      const payload: TokenPayload = {
        id: 'expired-test',
        email: 'expired@example.com',
        role: 'PARTICIPANT',
      };

      // Sign token that's already expired
      const expiredToken = jwt.sign(payload, config.jwt.secret, {
        expiresIn: '-1s', // Expired 1 second ago
      });

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow();
    });

    it('should include iat and exp in decoded payload', () => {
      const payload: TokenPayload = {
        id: 'claims-check',
        email: 'claims@example.com',
        role: 'ADMIN',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.iat).toBeDefined();
      expect(decoded.exp).toBeDefined();
    });

    it('should maintain payload integrity through round-trip', () => {
      const testCases: TokenPayload[] = [
        { id: 'user1', email: 'user1@test.com', role: 'PARTICIPANT' },
        { id: 'user2', email: 'user2@test.com', role: 'ADMIN' },
        { id: 'user3', email: 'user3@test.com', role: 'ORGANIZER' },
        { id: 'user4', email: 'user4@test.com', role: 'STAFF' },
      ];

      for (const originalPayload of testCases) {
        const token = generateToken(originalPayload);
        const decoded = verifyToken(token);

        expect(decoded.id).toBe(originalPayload.id);
        expect(decoded.email).toBe(originalPayload.email);
        expect(decoded.role).toBe(originalPayload.role);
      }
    });

    it('should work with special characters in email', () => {
      const payload: TokenPayload = {
        id: 'special-chars',
        email: 'user+test.email@sub.example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.email).toBe('user+test.email@sub.example.com');
    });

    it('should work with long user IDs', () => {
      const payload: TokenPayload = {
        id: '507f1f77bcf86cd799439011', // MongoDB ObjectId length
        email: 'longid@example.com',
        role: 'ORGANIZER',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe('507f1f77bcf86cd799439011');
    });
  });

  describe('TokenPayload interface', () => {
    it('should correctly type the payload', () => {
      const payload: TokenPayload = {
        id: 'typed-payload',
        email: 'typed@example.com',
        role: 'PARTICIPANT',
      };

      const token = generateToken(payload);
      const decoded = verifyToken(token);

      expect(decoded.id).toBe(payload.id);
      expect(decoded.email).toBe(payload.email);
      expect(decoded.role).toBe(payload.role);
    });
  });

  describe('error handling', () => {
    it('should throw JsonWebTokenError on invalid token', () => {
      expect(() => {
        verifyToken('invalid.token.here');
      }).toThrow();
    });

    it('should throw TokenExpiredError for expired tokens', () => {
      const expiredToken = jwt.sign(
        { id: 'test', email: 'test@example.com', role: 'PARTICIPANT' },
        config.jwt.secret,
        { expiresIn: '-1s' }
      );

      expect(() => {
        verifyToken(expiredToken);
      }).toThrow();
    });

    it('should throw on null token', () => {
      expect(() => {
        verifyToken(null as any);
      }).toThrow();
    });

    it('should throw on undefined token', () => {
      expect(() => {
        verifyToken(undefined as any);
      }).toThrow();
    });
  });

  describe('multiple concurrent tokens', () => {
    it('should generate tokens for concurrent calls', () => {
      const payload: TokenPayload = {
        id: 'concurrent',
        email: 'concurrent@example.com',
        role: 'PARTICIPANT',
      };

      const tokens = Array(5)
        .fill(null)
        .map(() => generateToken(payload));

      // All tokens should be valid even if some have the same iat
      tokens.forEach((token) => {
        expect(token).toBeDefined();
        expect(token.split('.')).toHaveLength(3);
        const decoded = verifyToken(token);
        expect(decoded.id).toBe(payload.id);
      });
    });

    it('should verify all concurrently generated tokens', () => {
      const payload: TokenPayload = {
        id: 'concurrent-verify',
        email: 'concurrent@example.com',
        role: 'ADMIN',
      };

      const tokens = Array(5)
        .fill(null)
        .map(() => generateToken(payload));

      tokens.forEach((token) => {
        const decoded = verifyToken(token);
        expect(decoded.id).toBe(payload.id);
        expect(decoded.email).toBe(payload.email);
        expect(decoded.role).toBe(payload.role);
      });
    });
  });
});
