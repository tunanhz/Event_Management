import {
  deriveCity,
  deriveTime,
  deriveSessions,
  derivePriceFields,
} from '../../../modules/organizer/event-discovery-derive';
import { EventCity, ISession } from '../../../modules/event/event.model';

describe('event-discovery-derive.ts', () => {
  // ────────────────────────────────────────────────────────────────
  // deriveCity Tests
  // ────────────────────────────────────────────────────────────────
  describe('deriveCity', () => {
    it('should map "Hồ Chí Minh" (with diacritics) to "hcm"', () => {
      expect(deriveCity('Hồ Chí Minh')).toBe('hcm');
    });

    it('should map "ho chi minh" (lowercase) to "hcm"', () => {
      expect(deriveCity('ho chi minh')).toBe('hcm');
    });

    it('should map "HCM" (uppercase) to "hcm"', () => {
      expect(deriveCity('HCM')).toBe('hcm');
    });

    it('should map "Ho Chi Minh" (mixed case) to "hcm"', () => {
      expect(deriveCity('Ho Chi Minh')).toBe('hcm');
    });

    it('should map "Hà Nội" (with diacritics) to "hanoi"', () => {
      expect(deriveCity('Hà Nội')).toBe('hanoi');
    });

    it('should map "ha noi" (lowercase) to "hanoi"', () => {
      expect(deriveCity('ha noi')).toBe('hanoi');
    });

    it('should map "HA NOI" (uppercase) to "hanoi"', () => {
      expect(deriveCity('HA NOI')).toBe('hanoi');
    });

    it('should map "Ha Noi" (mixed case) to "hanoi"', () => {
      expect(deriveCity('Ha Noi')).toBe('hanoi');
    });

    it('should map "Lâm Đồng" (with diacritics) to "dalat"', () => {
      expect(deriveCity('Lâm Đồng')).toBe('dalat');
    });

    it('should map "lam dong" (lowercase, no diacritics) to "dalat"', () => {
      expect(deriveCity('lam dong')).toBe('dalat');
    });

    it('should map "LAM DONG" (uppercase) to "dalat"', () => {
      expect(deriveCity('LAM DONG')).toBe('dalat');
    });

    it('should map "Đà Lạt" (with diacritics) to "dalat"', () => {
      expect(deriveCity('Đà Lạt')).toBe('dalat');
    });

    it('should map "da lat" (lowercase, no diacritics) to "dalat"', () => {
      expect(deriveCity('da lat')).toBe('dalat');
    });

    it('should map "Da Lat" (mixed case) to "dalat"', () => {
      expect(deriveCity('Da Lat')).toBe('dalat');
    });

    it('should return "other" for unknown province', () => {
      expect(deriveCity('Hải Phòng')).toBe('other');
    });

    it('should return "other" for empty string', () => {
      expect(deriveCity('')).toBe('other');
    });

    it('should return "other" for undefined', () => {
      expect(deriveCity(undefined)).toBe('other');
    });

    it('should handle provinces containing hcm substring', () => {
      expect(deriveCity('TP Hồ Chí Minh')).toBe('hcm');
    });

    it('should handle provinces containing hanoi substring', () => {
      expect(deriveCity('Thành phố Hà Nội')).toBe('hanoi');
    });

    it('should handle provinces containing dalat substring', () => {
      expect(deriveCity('Tỉnh Lâm Đồng')).toBe('dalat');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // deriveTime Tests
  // ────────────────────────────────────────────────────────────────
  describe('deriveTime', () => {
    it('should format hours with zero-padding', () => {
      const date = new Date();
      date.setHours(5);
      date.setMinutes(30);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/); // Verify format is HH:MM
      const [hours] = formatted.split(':');
      expect(hours).toBe('05');
    });

    it('should format minutes with zero-padding', () => {
      const date = new Date();
      date.setHours(10);
      date.setMinutes(5);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toMatch(/^\d{2}:\d{2}$/);
      const [, minutes] = formatted.split(':');
      expect(minutes).toBe('05');
    });

    it('should format 00:00 for midnight', () => {
      const date = new Date();
      date.setHours(0);
      date.setMinutes(0);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toBe('00:00');
    });

    it('should format 23:59 for 11:59 PM', () => {
      const date = new Date();
      date.setHours(23);
      date.setMinutes(59);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toBe('23:59');
    });

    it('should format 12:00 for noon', () => {
      const date = new Date();
      date.setHours(12);
      date.setMinutes(0);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toBe('12:00');
    });

    it('should format 09:00 for 9 AM', () => {
      const date = new Date();
      date.setHours(9);
      date.setMinutes(0);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toBe('09:00');
    });

    it('should handle single-digit minutes correctly', () => {
      const date = new Date();
      date.setHours(14);
      date.setMinutes(3);
      date.setSeconds(0);
      const formatted = deriveTime(date);
      expect(formatted).toBe('14:03');
    });
  });

  // ────────────────────────────────────────────────────────────────
  // deriveSessions Tests
  // ────────────────────────────────────────────────────────────────
  describe('deriveSessions', () => {
    const fallbackStart = new Date('2024-01-15T18:00:00Z');

    it('should create one session from shows array with single show', () => {
      const shows = [{ startTime: fallbackStart, endTime: new Date('2024-01-15T20:00:00Z') }];
      const result = deriveSessions(shows, fallbackStart);
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(fallbackStart);
    });

    it('should not add label for single show', () => {
      const shows = [{ startTime: fallbackStart, endTime: new Date('2024-01-15T20:00:00Z') }];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBeUndefined();
    });

    it('should add auto-numbered labels for multiple shows', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, endTime: new Date('2024-01-15T20:00:00Z') },
        { startTime: show2, endTime: new Date('2024-01-16T20:00:00Z') },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất 1');
      expect(result[1].label).toBe('Suất 2');
    });

    it('should use organizer-given title when set', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, title: 'Suất chiều' },
        { startTime: show2, title: 'Suất tối' },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất chiều');
      expect(result[1].label).toBe('Suất tối');
    });

    it('should fall back to auto-numbered label when title is empty', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, title: '' },
        { startTime: show2, title: 'Suất tối' },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất 1');
      expect(result[1].label).toBe('Suất tối');
    });

    it('should trim whitespace from titles', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, title: '  Suất chiều  ' },
        { startTime: show2, title: '  Suất tối  ' },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất chiều');
      expect(result[1].label).toBe('Suất tối');
    });

    it('should fall back to single row from fallbackStart when shows is empty', () => {
      const shows: any[] = [];
      const result = deriveSessions(shows, fallbackStart);
      expect(result).toHaveLength(1);
      expect(result[0].date).toEqual(fallbackStart);
    });

    it('should derive time for each session', () => {
      const show1 = new Date();
      show1.setHours(18);
      show1.setMinutes(30);
      const show2 = new Date();
      show2.setHours(14);
      show2.setMinutes(15);
      const shows = [
        { startTime: show1 },
        { startTime: show2 },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].time).toBe('18:30');
      expect(result[1].time).toBe('14:15');
    });

    it('should handle shows with undefined title', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, title: undefined },
        { startTime: show2, title: undefined },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất 1');
      expect(result[1].label).toBe('Suất 2');
    });

    it('should handle shows with only whitespace title', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const show2 = new Date('2024-01-16T18:00:00Z');
      const shows = [
        { startTime: show1, title: '   ' },
        { startTime: show2, title: '   ' },
      ];
      const result = deriveSessions(shows, fallbackStart);
      expect(result[0].label).toBe('Suất 1');
      expect(result[1].label).toBe('Suất 2');
    });

    it('should include endTime in sessions output', () => {
      const show1 = new Date('2024-01-15T18:00:00Z');
      const shows = [{ startTime: show1, endTime: new Date('2024-01-15T20:00:00Z') }];
      const result = deriveSessions(shows, fallbackStart);
      // The function returns sessions with date and time fields; endTime is not returned
      expect(result[0].date).toEqual(show1);
    });
  });

  // ────────────────────────────────────────────────────────────────
  // derivePriceFields Tests
  // ────────────────────────────────────────────────────────────────
  describe('derivePriceFields', () => {
    it('should return priceFrom 0 and isFree false for empty ticket array', () => {
      const result = derivePriceFields([]);
      expect(result.priceFrom).toBe(0);
      expect(result.isFree).toBe(false);
    });

    it('should pick minimum price from multiple tickets', () => {
      const tickets = [
        { price: 100 },
        { price: 50 },
        { price: 200 },
      ];
      const result = derivePriceFields(tickets);
      expect(result.priceFrom).toBe(50);
    });

    it('should mark as free when all tickets are priced at zero', () => {
      const tickets = [
        { price: 0 },
        { price: 0 },
        { price: 0 },
      ];
      const result = derivePriceFields(tickets);
      expect(result.isFree).toBe(true);
    });

    it('should mark as not free when at least one ticket has a price', () => {
      const tickets = [
        { price: 0 },
        { price: 100 },
        { price: 0 },
      ];
      const result = derivePriceFields(tickets);
      expect(result.isFree).toBe(false);
    });

    it('should return correct priceFrom when all tickets are paid', () => {
      const tickets = [
        { price: 500 },
        { price: 1000 },
        { price: 750 },
      ];
      const result = derivePriceFields(tickets);
      expect(result.priceFrom).toBe(500);
      expect(result.isFree).toBe(false);
    });

    it('should handle single ticket', () => {
      const tickets = [{ price: 250 }];
      const result = derivePriceFields(tickets);
      expect(result.priceFrom).toBe(250);
      expect(result.isFree).toBe(false);
    });

    it('should handle single free ticket', () => {
      const tickets = [{ price: 0 }];
      const result = derivePriceFields(tickets);
      expect(result.priceFrom).toBe(0);
      expect(result.isFree).toBe(true);
    });

    it('should correctly handle decimals', () => {
      const tickets = [
        { price: 99.5 },
        { price: 149.99 },
        { price: 49.99 },
      ];
      const result = derivePriceFields(tickets);
      expect(result.priceFrom).toBe(49.99);
      expect(result.isFree).toBe(false);
    });
  });
});
