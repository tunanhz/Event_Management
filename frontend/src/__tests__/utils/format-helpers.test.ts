import { cn, truncate, slugify, formatVnd, buildQueryString } from '@/lib/utils';

describe('Utility Helpers', () => {
  describe('cn', () => {
    it('should merge conflicting tailwind classes keeping the last one', () => {
      expect(cn('px-2', 'px-4')).toBe('px-4');
    });

    it('should drop falsy values', () => {
      expect(cn('a', false && 'b', undefined, 'c')).toBe('a c');
    });
  });

  describe('truncate', () => {
    it('should leave short strings untouched', () => {
      expect(truncate('hello', 10)).toBe('hello');
    });

    it('should append an ellipsis when over the limit', () => {
      expect(truncate('hello world', 5)).toBe('hello...');
    });
  });

  describe('slugify', () => {
    it('should lowercase and hyphenate spaces', () => {
      expect(slugify('Live Concert 2026')).toBe('live-concert-2026');
    });

    it('should trim leading and trailing hyphens', () => {
      expect(slugify('  Hello!  ')).toBe('hello');
    });
  });

  describe('formatVnd', () => {
    it('should group thousands and append the currency suffix', () => {
      expect(formatVnd(700000)).toBe('700.000 đ');
    });

    it('should format zero', () => {
      expect(formatVnd(0)).toBe('0 đ');
    });
  });

  describe('buildQueryString', () => {
    it('should return an empty string when nothing is set', () => {
      expect(buildQueryString({ a: undefined, b: null, c: '' })).toBe('');
    });

    it('should prefix with ? and serialise present values', () => {
      expect(buildQueryString({ page: 2, city: 'hcm' })).toBe('?page=2&city=hcm');
    });
  });
});
