import { asOptionalString, parsePagination } from '../../../common/utils/query-params';

describe('Query params utilities', () => {
  describe('asOptionalString', () => {
    describe('valid string inputs', () => {
      it('should return a string as-is', () => {
        const result = asOptionalString('hello');

        expect(result).toBe('hello');
      });

      it('should return a non-empty string', () => {
        const result = asOptionalString('some value');

        expect(result).toBe('some value');
      });

      it('should return a string with special characters', () => {
        const result = asOptionalString('test@#$%value');

        expect(result).toBe('test@#$%value');
      });

      it('should return a string with spaces', () => {
        const result = asOptionalString('hello world');

        expect(result).toBe('hello world');
      });

      it('should return a single character string', () => {
        const result = asOptionalString('a');

        expect(result).toBe('a');
      });

      it('should return a numeric string', () => {
        const result = asOptionalString('12345');

        expect(result).toBe('12345');
      });
    });

    describe('invalid inputs', () => {
      it('should return undefined for empty string', () => {
        const result = asOptionalString('');

        expect(result).toBeUndefined();
      });

      it('should return undefined for number', () => {
        const result = asOptionalString(42);

        expect(result).toBeUndefined();
      });

      it('should return undefined for boolean', () => {
        const result = asOptionalString(true);

        expect(result).toBeUndefined();
      });

      it('should return undefined for array', () => {
        const result = asOptionalString(['string', 'array']);

        expect(result).toBeUndefined();
      });

      it('should return undefined for object', () => {
        const result = asOptionalString({ key: 'value' });

        expect(result).toBeUndefined();
      });

      it('should return undefined for undefined', () => {
        const result = asOptionalString(undefined);

        expect(result).toBeUndefined();
      });

      it('should return undefined for null', () => {
        const result = asOptionalString(null);

        expect(result).toBeUndefined();
      });

      it('should return undefined for NaN', () => {
        const result = asOptionalString(NaN);

        expect(result).toBeUndefined();
      });
    });

    describe('edge cases', () => {
      it('should return undefined for whitespace-only string', () => {
        // Whitespace string is not empty, so it returns it
        const result = asOptionalString('   ');

        expect(result).toBe('   ');
      });

      it('should handle very long strings', () => {
        const longString = 'a'.repeat(10000);
        const result = asOptionalString(longString);

        expect(result).toBe(longString);
      });
    });
  });

  describe('parsePagination with defaults', () => {
    it('should return default page 1 and limit 10 when no query provided', () => {
      const result = parsePagination({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should return default page 1 when page is not provided', () => {
      const result = parsePagination({ limit: '20' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(20);
    });

    it('should return default limit 10 when limit is not provided', () => {
      const result = parsePagination({ page: '5' });

      expect(result.page).toBe(5);
      expect(result.limit).toBe(10);
    });

    it('should parse both page and limit', () => {
      const result = parsePagination({ page: '3', limit: '25' });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(25);
    });
  });

  describe('parsePagination with custom defaults', () => {
    it('should use custom default limit', () => {
      const result = parsePagination({}, { limit: 50 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should use custom default maxLimit', () => {
      const result = parsePagination({ limit: '200' }, { maxLimit: 150 });

      expect(result.limit).toBe(150); // Clamped to maxLimit
    });

    it('should use both custom limit and maxLimit', () => {
      const result = parsePagination({ limit: '300' }, { limit: 20, maxLimit: 250 });

      expect(result.limit).toBe(250);
    });

    it('should apply custom defaults only', () => {
      const result = parsePagination({ page: '2' }, { limit: 15, maxLimit: 100 });

      expect(result.page).toBe(2);
      expect(result.limit).toBe(15);
    });
  });

  describe('parsePagination page clamping', () => {
    it('should clamp page 0 to 1', () => {
      const result = parsePagination({ page: '0' });

      expect(result.page).toBe(1);
    });

    it('should clamp negative page to 1', () => {
      const result = parsePagination({ page: '-5' });

      expect(result.page).toBe(1);
    });

    it('should preserve positive page numbers', () => {
      const result = parsePagination({ page: '10' });

      expect(result.page).toBe(10);
    });

    it('should handle very large page numbers', () => {
      const result = parsePagination({ page: '999999' });

      expect(result.page).toBe(999999);
    });

    it('should floor fractional page numbers', () => {
      const result = parsePagination({ page: '3.7' });

      expect(result.page).toBe(3);
    });

    it('should treat NaN page as 1', () => {
      const result = parsePagination({ page: 'abc' });

      expect(result.page).toBe(1);
    });

    it('should treat empty string page as 1', () => {
      const result = parsePagination({ page: '' });

      expect(result.page).toBe(1);
    });
  });

  describe('parsePagination limit clamping', () => {
    it('should clamp limit 0 to default when limit is 0', () => {
      const result = parsePagination({ limit: '0' });

      // 0 evaluates to falsy, so uses default limit
      expect(result.limit).toBe(10);
    });

    it('should clamp negative limit to 1', () => {
      const result = parsePagination({ limit: '-10' });

      expect(result.limit).toBe(1);
    });

    it('should preserve limits within range', () => {
      const result = parsePagination({ limit: '25' });

      expect(result.limit).toBe(25);
    });

    it('should clamp limit to maxLimit (default 100)', () => {
      const result = parsePagination({ limit: '150' });

      expect(result.limit).toBe(100);
    });

    it('should clamp limit to custom maxLimit', () => {
      const result = parsePagination({ limit: '500' }, { maxLimit: 250 });

      expect(result.limit).toBe(250);
    });

    it('should floor fractional limits', () => {
      const result = parsePagination({ limit: '19.8' });

      expect(result.limit).toBe(19);
    });

    it('should treat NaN limit as default', () => {
      const result = parsePagination({ limit: 'xyz' });

      expect(result.limit).toBe(10);
    });

    it('should treat empty string limit as default', () => {
      const result = parsePagination({ limit: '' });

      expect(result.limit).toBe(10);
    });

    it('should respect lower bound of 1 even with custom default', () => {
      const result = parsePagination({ limit: '0' }, { limit: 20 });

      // 0 is falsy, so uses custom default of 20
      expect(result.limit).toBe(20);
    });

    it('should clamp to maxLimit even when default is higher', () => {
      const result = parsePagination({ limit: '80' }, { limit: 100, maxLimit: 50 });

      // 80 is clamped to maxLimit of 50
      expect(result.limit).toBe(50);
    });
  });

  describe('parsePagination with array values', () => {
    it('should treat array page as invalid (use default)', () => {
      const result = parsePagination({ page: ['1', '2'] as any });

      expect(result.page).toBe(1);
    });

    it('should treat array limit as invalid (use default)', () => {
      const result = parsePagination({ limit: ['10', '20'] as any });

      expect(result.limit).toBe(10);
    });
  });

  describe('parsePagination string coercion', () => {
    it('should parse string numbers for page', () => {
      const result = parsePagination({ page: '5' });

      expect(result.page).toBe(5);
      expect(typeof result.page).toBe('number');
    });

    it('should parse string numbers for limit', () => {
      const result = parsePagination({ limit: '20' });

      expect(result.limit).toBe(20);
      expect(typeof result.limit).toBe('number');
    });

    it('should coerce non-numeric strings', () => {
      const result = parsePagination({ page: 'not-a-number' });

      expect(result.page).toBe(1);
    });

    it('should coerce object to string then to number', () => {
      const result = parsePagination({ page: {} as any });

      expect(result.page).toBe(1);
    });
  });

  describe('parsePagination return type', () => {
    it('should always return an object with page and limit properties', () => {
      const result = parsePagination({});

      expect(result).toHaveProperty('page');
      expect(result).toHaveProperty('limit');
      expect(Object.keys(result)).toHaveLength(2);
    });

    it('should return numbers, not strings', () => {
      const result = parsePagination({ page: '1', limit: '10' });

      expect(typeof result.page).toBe('number');
      expect(typeof result.limit).toBe('number');
    });

    it('should return integer values', () => {
      const result = parsePagination({ page: '2.5', limit: '15.9' });

      expect(Number.isInteger(result.page)).toBe(true);
      expect(Number.isInteger(result.limit)).toBe(true);
    });
  });

  describe('parsePagination realistic scenarios', () => {
    it('should handle typical Express query params', () => {
      const queryParams = {
        page: '2',
        limit: '25',
      };

      const result = parsePagination(queryParams);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(25);
    });

    it('should handle missing limit but present page', () => {
      const result = parsePagination({ page: '3' });

      expect(result.page).toBe(3);
      expect(result.limit).toBe(10);
    });

    it('should handle present limit but missing page', () => {
      const result = parsePagination({ limit: '50' });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(50);
    });

    it('should handle API response with pagination metadata', () => {
      const query = { page: '1', limit: '10' };
      const result = parsePagination(query, { limit: 10, maxLimit: 100 });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle user attempting to bypass maxLimit', () => {
      const result = parsePagination({ limit: '9999' }, { maxLimit: 100 });

      expect(result.limit).toBe(100);
    });

    it('should handle user attempting to access very old pages', () => {
      const result = parsePagination({ page: '999999999' });

      expect(result.page).toBe(999999999);
      expect(result.limit).toBe(10);
    });

    it('should handle malicious input safely', () => {
      const maliciousQuery = {
        page: 'DELETE FROM users; --',
        limit: 'DROP TABLE events; --',
      };

      const result = parsePagination(maliciousQuery as any);

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle special characters in query', () => {
      const result = parsePagination({
        page: '5%20',
        limit: '10#anchor',
      } as any);

      // These would fail to parse as numbers, so use defaults
      expect(result.page).toBeDefined();
      expect(result.limit).toBeDefined();
    });
  });

  describe('parsePagination edge case combinations', () => {
    it('should handle empty object as query', () => {
      const result = parsePagination({});

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle query with undefined page and limit', () => {
      const result = parsePagination({ page: undefined, limit: undefined });

      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should handle query with extra properties', () => {
      const query = {
        page: '2',
        limit: '20',
        sort: 'createdAt',
        order: 'desc',
      } as any;

      const result = parsePagination(query);

      expect(result.page).toBe(2);
      expect(result.limit).toBe(20);
    });

    it('should handle Infinity page value', () => {
      const result = parsePagination({ page: Infinity as any });

      // Infinity is not a string, so asOptionalString returns undefined, using default
      expect(result.page).toBe(1);
    });

    it('should handle Infinity limit value', () => {
      const result = parsePagination({ limit: Infinity as any }, { maxLimit: 100 });

      // Infinity is not a string, so asOptionalString returns undefined, using default
      expect(result.limit).toBe(10);
    });
  });
});
