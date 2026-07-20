import { formatLongDate, priceValue } from '@/components/event-detail/format-date';

describe('format-date utilities', () => {
  describe('formatLongDate', () => {
    it('should format DD/MM/YYYY to "DD Tháng MM, YYYY"', () => {
      expect(formatLongDate('15/06/2026')).toBe('15 Tháng 06, 2026');
    });

    it('should handle single-digit day and month', () => {
      expect(formatLongDate('5/3/2026')).toBe('5 Tháng 3, 2026');
    });

    it('should handle December (month 12)', () => {
      expect(formatLongDate('31/12/2026')).toBe('31 Tháng 12, 2026');
    });

    it('should handle January (month 01)', () => {
      expect(formatLongDate('01/01/2026')).toBe('01 Tháng 01, 2026');
    });

    it('should handle leap day', () => {
      expect(formatLongDate('29/02/2028')).toBe('29 Tháng 02, 2028');
    });

    it('should return input unchanged if format is invalid (missing parts)', () => {
      expect(formatLongDate('15/06')).toBe('15/06');
      expect(formatLongDate('15')).toBe('15');
      expect(formatLongDate('invalid')).toBe('invalid');
    });

    it('should handle empty string', () => {
      expect(formatLongDate('')).toBe('');
    });

    it('should preserve the exact format with leading zeros', () => {
      expect(formatLongDate('05/03/2026')).toBe('05 Tháng 03, 2026');
    });

    it('should handle different years', () => {
      expect(formatLongDate('15/06/2025')).toBe('15 Tháng 06, 2025');
      expect(formatLongDate('15/06/2030')).toBe('15 Tháng 06, 2030');
    });
  });

  describe('priceValue', () => {
    it('should remove leading "Từ " from price string', () => {
      expect(priceValue('Từ 300.000đ')).toBe('300.000đ');
    });

    it('should remove leading "Từ " case-insensitively', () => {
      expect(priceValue('từ 300.000đ')).toBe('300.000đ');
    });

    it('should handle multiple spaces after "Từ"', () => {
      expect(priceValue('Từ  300.000đ')).toBe('300.000đ');
    });

    it('should return price unchanged if no "Từ " prefix', () => {
      expect(priceValue('300.000đ')).toBe('300.000đ');
    });

    it('should handle free price string', () => {
      expect(priceValue('Miễn phí')).toBe('Miễn phí');
    });

    it('should handle empty string', () => {
      expect(priceValue('')).toBe('');
    });

    it('should handle "Từ" alone', () => {
      expect(priceValue('Từ')).toBe('');
    });

    it('should handle price with just spaces after "Từ"', () => {
      expect(priceValue('Từ   ')).toBe('');
    });

    it('should work with various price formats', () => {
      expect(priceValue('Từ 500.000đ')).toBe('500.000đ');
      expect(priceValue('Từ 1.500.000đ')).toBe('1.500.000đ');
      expect(priceValue('Từ 100.000đ')).toBe('100.000đ');
    });

    it('should preserve "Từ" if it appears in the middle of the string', () => {
      const price = 'Price from Từ 300.000đ';
      // Only strips leading "Từ " with optional spaces
      expect(priceValue(price)).toBe(price);
    });
  });
});
