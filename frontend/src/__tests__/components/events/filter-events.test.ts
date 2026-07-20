import {
  parseEventDate,
  startOfDay,
  toISODate,
  fromISODate,
  presetRange,
  applyFilters,
} from '@/components/events/filter-events';
import type { ExploreEvent } from '@/lib/mockData';
import type { DateFilter, Filters } from '@/components/events/events-types';

describe('filter-events', () => {
  describe('parseEventDate', () => {
    it('should parse DD/MM/YYYY to a Date at local midnight', () => {
      const d = parseEventDate('15/06/2026');
      expect(d.getDate()).toBe(15);
      expect(d.getMonth()).toBe(5); // June is 5 (0-indexed)
      expect(d.getFullYear()).toBe(2026);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    });

    it('should handle single-digit day and month with leading zero', () => {
      const d = parseEventDate('03/07/2026');
      expect(d.getDate()).toBe(3);
      expect(d.getMonth()).toBe(6); // July is 6
      expect(d.getFullYear()).toBe(2026);
    });

    it('should handle single-digit day and month without padding', () => {
      const d = parseEventDate('5/3/2026');
      expect(d.getDate()).toBe(5);
      expect(d.getMonth()).toBe(2); // March is 2
      expect(d.getFullYear()).toBe(2026);
    });

    it('should handle leap day (29 February on a leap year)', () => {
      const d = parseEventDate('29/02/2028');
      expect(d.getDate()).toBe(29);
      expect(d.getMonth()).toBe(1); // February is 1
      expect(d.getFullYear()).toBe(2028);
    });

    it('should parse 31st of months correctly', () => {
      const d = parseEventDate('31/12/2026');
      expect(d.getDate()).toBe(31);
      expect(d.getMonth()).toBe(11); // December is 11
      expect(d.getFullYear()).toBe(2026);
    });
  });

  describe('startOfDay', () => {
    it('should strip time to midnight', () => {
      const d = new Date(2026, 5, 15, 14, 30, 45, 123);
      const result = startOfDay(d);
      expect(result.getFullYear()).toBe(2026);
      expect(result.getMonth()).toBe(5);
      expect(result.getDate()).toBe(15);
      expect(result.getHours()).toBe(0);
      expect(result.getMinutes()).toBe(0);
      expect(result.getSeconds()).toBe(0);
      expect(result.getMilliseconds()).toBe(0);
    });

    it('should return midnight unchanged', () => {
      const d = new Date(2026, 5, 15, 0, 0, 0, 0);
      const result = startOfDay(d);
      expect(result.getTime()).toBe(d.getTime());
    });

    it('should create a new Date object', () => {
      const d = new Date(2026, 5, 15, 14, 30);
      const result = startOfDay(d);
      expect(result).not.toBe(d);
    });
  });

  describe('toISODate', () => {
    it('should format Date to ISO YYYY-MM-DD with zero-padding', () => {
      const d = new Date(2026, 5, 15); // June 15
      expect(toISODate(d)).toBe('2026-06-15');
    });

    it('should zero-pad single-digit month', () => {
      const d = new Date(2026, 0, 15); // January 15
      expect(toISODate(d)).toBe('2026-01-15');
    });

    it('should zero-pad single-digit day', () => {
      const d = new Date(2026, 5, 5); // June 5
      expect(toISODate(d)).toBe('2026-06-05');
    });

    it('should handle leap day', () => {
      const d = new Date(2028, 1, 29); // Feb 29 (leap year)
      expect(toISODate(d)).toBe('2028-02-29');
    });

    it('should handle December (month 11)', () => {
      const d = new Date(2026, 11, 31);
      expect(toISODate(d)).toBe('2026-12-31');
    });
  });

  describe('fromISODate', () => {
    it('should parse ISO YYYY-MM-DD to Date at midnight', () => {
      const d = fromISODate('2026-06-15');
      expect(d.getFullYear()).toBe(2026);
      expect(d.getMonth()).toBe(5); // June
      expect(d.getDate()).toBe(15);
      expect(d.getHours()).toBe(0);
      expect(d.getMinutes()).toBe(0);
      expect(d.getSeconds()).toBe(0);
    });

    it('should handle zero-padded months and days', () => {
      const d = fromISODate('2026-01-05');
      expect(d.getMonth()).toBe(0); // January
      expect(d.getDate()).toBe(5);
    });

    it('should handle leap day', () => {
      const d = fromISODate('2028-02-29');
      expect(d.getDate()).toBe(29);
      expect(d.getMonth()).toBe(1);
    });
  });

  describe('toISODate / fromISODate round-trip', () => {
    it('should round-trip correctly', () => {
      const original = new Date(2026, 5, 15, 14, 30, 45);
      const midnight = startOfDay(original);
      const iso = toISODate(midnight);
      const parsed = fromISODate(iso);
      expect(parsed.getTime()).toBe(midnight.getTime());
    });

    it('should handle leap day round-trip', () => {
      const original = new Date(2028, 1, 29);
      const iso = toISODate(original);
      const parsed = fromISODate(iso);
      expect(parsed.getDate()).toBe(29);
      expect(parsed.getMonth()).toBe(1);
    });
  });

  describe('presetRange', () => {
    describe('mode: today', () => {
      it('should return start === end === startOfDay(today)', () => {
        const today = new Date(2026, 5, 15, 14, 30); // June 15, 2:30 PM
        const range = presetRange('today', today);
        const midnight = startOfDay(today);
        expect(range?.start.getTime()).toBe(midnight.getTime());
        expect(range?.end.getTime()).toBe(midnight.getTime());
      });
    });

    describe('mode: tomorrow', () => {
      it('should return the next day', () => {
        const today = new Date(2026, 5, 15); // June 15
        const range = presetRange('tomorrow', today);
        const expected = new Date(2026, 5, 16); // June 16
        expect(range?.start.getTime()).toBe(expected.getTime());
        expect(range?.end.getTime()).toBe(expected.getTime());
      });

      it('should handle month-end rollover', () => {
        const today = new Date(2026, 5, 30); // June 30
        const range = presetRange('tomorrow', today);
        const expected = new Date(2026, 6, 1); // July 1
        expect(range?.start.getDate()).toBe(1);
        expect(range?.start.getMonth()).toBe(6);
      });

      it('should handle year-end rollover', () => {
        const today = new Date(2026, 11, 31); // December 31
        const range = presetRange('tomorrow', today);
        const expected = new Date(2027, 0, 1); // Jan 1, 2027
        expect(range?.start.getFullYear()).toBe(2027);
        expect(range?.start.getMonth()).toBe(0);
        expect(range?.start.getDate()).toBe(1);
      });
    });

    describe('mode: weekend', () => {
      it('should return this week Saturday + Sunday from a Monday', () => {
        const monday = new Date(2026, 5, 15); // June 15 (Monday)
        const range = presetRange('weekend', monday);
        const sat = new Date(2026, 5, 20); // June 20 (Saturday)
        const sun = new Date(2026, 5, 21); // June 21 (Sunday)
        expect(range?.start.getTime()).toBe(sat.getTime());
        expect(range?.end.getTime()).toBe(sun.getTime());
      });

      it('should return this week Saturday + Sunday from a Wednesday', () => {
        const wed = new Date(2026, 5, 17); // June 17 (Wednesday)
        const range = presetRange('weekend', wed);
        const sat = new Date(2026, 5, 20); // June 20 (Saturday)
        const sun = new Date(2026, 5, 21); // June 21 (Sunday)
        expect(range?.start.getTime()).toBe(sat.getTime());
        expect(range?.end.getTime()).toBe(sun.getTime());
      });

      it('should return the same Saturday if called on Saturday', () => {
        const saturday = new Date(2026, 5, 20); // June 20 (Saturday)
        const range = presetRange('weekend', saturday);
        const sun = new Date(2026, 5, 21); // June 21 (Sunday)
        expect(range?.start.getTime()).toBe(saturday.getTime());
        expect(range?.end.getTime()).toBe(sun.getTime());
      });

      it('should return next Saturday + Sunday if called on Sunday', () => {
        const sunday = new Date(2026, 5, 21); // June 21 (Sunday, day 0)
        const range = presetRange('weekend', sunday);
        // From Sunday (0), (6 - 0 + 7) % 7 = 6 days forward → June 27 (Saturday)
        const sat = new Date(2026, 5, 27); // June 27 (Saturday)
        const sun = new Date(2026, 5, 28); // June 28 (Sunday)
        expect(range?.start.getTime()).toBe(sat.getTime());
        expect(range?.end.getTime()).toBe(sun.getTime());
      });
    });

    describe('mode: month', () => {
      it('should return the 1st through the last day of the month', () => {
        const mid = new Date(2026, 5, 15); // June 15
        const range = presetRange('month', mid);
        const first = new Date(2026, 5, 1);
        const last = new Date(2026, 5, 30);
        expect(range?.start.getTime()).toBe(first.getTime());
        expect(range?.end.getTime()).toBe(last.getTime());
      });

      it('should handle February in a leap year (29 days)', () => {
        const feb = new Date(2028, 1, 15); // February 2028 (leap year)
        const range = presetRange('month', feb);
        const first = new Date(2028, 1, 1);
        const last = new Date(2028, 1, 29);
        expect(range?.end.getDate()).toBe(29);
      });

      it('should handle February in a non-leap year (28 days)', () => {
        const feb = new Date(2027, 1, 15); // February 2027 (non-leap year)
        const range = presetRange('month', feb);
        const last = new Date(2027, 1, 28);
        expect(range?.end.getDate()).toBe(28);
      });

      it('should handle a 31-day month', () => {
        const may = new Date(2026, 4, 15); // May 2026
        const range = presetRange('month', may);
        const last = new Date(2026, 4, 31);
        expect(range?.end.getDate()).toBe(31);
      });
    });

    describe('mode: all', () => {
      it('should return null', () => {
        const today = new Date(2026, 5, 15);
        expect(presetRange('all', today)).toBeNull();
      });
    });

    describe('mode: date', () => {
      it('should return null', () => {
        const today = new Date(2026, 5, 15);
        expect(presetRange('date', today)).toBeNull();
      });
    });
  });

  describe('applyFilters', () => {
    const createEvent = (overrides: Partial<ExploreEvent>): ExploreEvent => ({
      id: 'e1',
      title: 'Test Event',
      date: '15/06/2026',
      time: '19:00',
      location: 'Test Location',
      price: 'Từ 300.000đ',
      image: 'test.jpg',
      category: 'Test Category',
      city: 'hcm',
      categorySlug: 'test-category',
      isFree: false,
      collections: [],
      ...overrides,
    });

    it('should filter by collection', () => {
      const events = [
        createEvent({ id: 'e1', collections: ['featured'] }),
        createEvent({ id: 'e2', collections: ['trending'] }),
        createEvent({ id: 'e3', collections: ['featured', 'upcoming'] }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today, 'featured');
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('e1');
      expect(result[1].id).toBe('e3');
    });

    it('should filter by city', () => {
      const events = [
        createEvent({ id: 'e1', city: 'hcm' }),
        createEvent({ id: 'e2', city: 'hanoi' }),
        createEvent({ id: 'e3', city: 'hcm' }),
      ];
      const filters: Filters = {
        city: 'hcm',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.city === 'hcm')).toBe(true);
    });

    it('should show all cities when city filter is "all"', () => {
      const events = [
        createEvent({ id: 'e1', city: 'hcm' }),
        createEvent({ id: 'e2', city: 'hanoi' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
    });

    it('should filter by free flag', () => {
      const events = [
        createEvent({ id: 'e1', isFree: true }),
        createEvent({ id: 'e2', isFree: false }),
        createEvent({ id: 'e3', isFree: true }),
      ];
      const filters: Filters = {
        city: 'all',
        free: true,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.isFree)).toBe(true);
    });

    it('should show all events when free flag is false', () => {
      const events = [
        createEvent({ id: 'e1', isFree: true }),
        createEvent({ id: 'e2', isFree: false }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
    });

    it('should filter by single category', () => {
      const events = [
        createEvent({ id: 'e1', categorySlug: 'music' }),
        createEvent({ id: 'e2', categorySlug: 'theater' }),
        createEvent({ id: 'e3', categorySlug: 'music' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: ['music'],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
      expect(result.every((e) => e.categorySlug === 'music')).toBe(true);
    });

    it('should filter by multiple categories (OR logic)', () => {
      const events = [
        createEvent({ id: 'e1', categorySlug: 'music' }),
        createEvent({ id: 'e2', categorySlug: 'theater' }),
        createEvent({ id: 'e3', categorySlug: 'sports' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: ['music', 'theater'],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
      expect(result.some((e) => e.categorySlug === 'music')).toBe(true);
      expect(result.some((e) => e.categorySlug === 'theater')).toBe(true);
    });

    it('should show no events when no categories match the filter', () => {
      const events = [
        createEvent({ id: 'e1', categorySlug: 'music' }),
        createEvent({ id: 'e2', categorySlug: 'theater' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: ['sports'],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(0);
    });

    it('should show all events when categories filter is empty', () => {
      const events = [
        createEvent({ id: 'e1', categorySlug: 'music' }),
        createEvent({ id: 'e2', categorySlug: 'theater' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };
      const today = new Date(2026, 5, 15);

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
    });

    it('should filter by date: mode "all" shows all dates', () => {
      const today = new Date(2026, 5, 15); // June 15
      const events = [
        createEvent({ id: 'e1', date: '15/06/2026' }),
        createEvent({ id: 'e2', date: '20/06/2026' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
    });

    it('should filter by date: mode "date" with no date set shows all events', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({ id: 'e1', date: '15/06/2026' }),
        createEvent({ id: 'e2', date: '20/06/2026' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'date', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(2);
    });

    it('should filter by date: mode "date" with specific date', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({ id: 'e1', date: '15/06/2026' }),
        createEvent({ id: 'e2', date: '20/06/2026' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'date', date: '2026-06-15' };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('should filter by date: preset "today"', () => {
      const today = new Date(2026, 5, 15); // June 15
      const events = [
        createEvent({ id: 'e1', date: '15/06/2026' }),
        createEvent({ id: 'e2', date: '20/06/2026' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'today', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('should filter by date: preset "month"', () => {
      const today = new Date(2026, 5, 15); // June 15
      const events = [
        createEvent({ id: 'e1', date: '05/06/2026' }), // June 5
        createEvent({ id: 'e2', date: '15/06/2026' }), // June 15
        createEvent({ id: 'e3', date: '30/06/2026' }), // June 30
        createEvent({ id: 'e4', date: '05/07/2026' }), // July 5
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'month', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(3);
      expect(result.map((e) => e.id)).toEqual(['e1', 'e2', 'e3']);
    });

    it('should sort results chronologically', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({ id: 'e1', date: '20/06/2026' }),
        createEvent({ id: 'e2', date: '05/06/2026' }),
        createEvent({ id: 'e3', date: '15/06/2026' }),
      ];
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result.map((e) => e.id)).toEqual(['e2', 'e3', 'e1']);
    });

    it('should apply combined filters (city + free + category)', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({ id: 'e1', city: 'hcm', isFree: true, categorySlug: 'music' }),
        createEvent({ id: 'e2', city: 'hcm', isFree: false, categorySlug: 'music' }),
        createEvent({ id: 'e3', city: 'hanoi', isFree: true, categorySlug: 'music' }),
        createEvent({ id: 'e4', city: 'hcm', isFree: true, categorySlug: 'theater' }),
      ];
      const filters: Filters = {
        city: 'hcm',
        free: true,
        categories: ['music'],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });

    it('should handle empty event list', () => {
      const today = new Date(2026, 5, 15);
      const filters: Filters = {
        city: 'all',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };

      const result = applyFilters([], filters, dateFilter, today);
      expect(result).toHaveLength(0);
    });

    it('should handle no matching events', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({ id: 'e1', city: 'hcm', categorySlug: 'music' }),
      ];
      const filters: Filters = {
        city: 'hanoi',
        free: false,
        categories: [],
      };
      const dateFilter: DateFilter = { mode: 'all', date: null };

      const result = applyFilters(events, filters, dateFilter, today);
      expect(result).toHaveLength(0);
    });

    it('should combine all filters together', () => {
      const today = new Date(2026, 5, 15);
      const events = [
        createEvent({
          id: 'e1',
          date: '15/06/2026',
          city: 'hcm',
          isFree: true,
          categorySlug: 'music',
          collections: ['featured'],
        }),
        createEvent({
          id: 'e2',
          date: '15/06/2026',
          city: 'hcm',
          isFree: false,
          categorySlug: 'music',
          collections: ['featured'],
        }),
      ];
      const filters: Filters = {
        city: 'hcm',
        free: true,
        categories: ['music'],
      };
      const dateFilter: DateFilter = { mode: 'today', date: null };

      const result = applyFilters(events, filters, dateFilter, today, 'featured');
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe('e1');
    });
  });
});
