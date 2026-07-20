import { formatBookingDate } from '@/components/booking/format-booking-date';
import { formatShowTime } from '@/components/booking/format-show-time';

describe('formatBookingDate', () => {
  it('should format valid DD/MM/YYYY dates to "DD Tháng MM, YYYY"', () => {
    expect(formatBookingDate('12/07/2026')).toBe('12 Tháng 07, 2026');
  });

  it('should handle single-digit days with leading zero', () => {
    expect(formatBookingDate('05/03/2026')).toBe('05 Tháng 03, 2026');
  });

  it('should handle month numbers with leading zero', () => {
    expect(formatBookingDate('15/01/2026')).toBe('15 Tháng 01, 2026');
  });

  it('should handle December dates', () => {
    expect(formatBookingDate('31/12/2026')).toBe('31 Tháng 12, 2026');
  });

  it('should handle January dates', () => {
    expect(formatBookingDate('01/01/2026')).toBe('01 Tháng 01, 2026');
  });

  it('should handle last day of February', () => {
    expect(formatBookingDate('28/02/2026')).toBe('28 Tháng 02, 2026');
  });

  it('should trim whitespace before formatting', () => {
    expect(formatBookingDate('  12/07/2026  ')).toBe('12 Tháng 07, 2026');
  });

  it('should return original input for invalid format', () => {
    expect(formatBookingDate('2026-07-12')).toBe('2026-07-12');
  });

  it('should return original input for empty string', () => {
    expect(formatBookingDate('')).toBe('');
  });

  it('should return original input for whitespace-only string', () => {
    const input = '   ';
    expect(formatBookingDate(input)).toBe(input);
  });

  it('should not match dates with single-digit day or month without leading zero', () => {
    expect(formatBookingDate('5/7/2026')).toBe('5/7/2026');
  });

  it('should not match dates without slashes', () => {
    expect(formatBookingDate('12072026')).toBe('12072026');
  });

  it('should not match dates with letters', () => {
    expect(formatBookingDate('12/July/2026')).toBe('12/July/2026');
  });

  it('should preserve zero-padded format for leading zeros', () => {
    expect(formatBookingDate('01/01/2026')).toBe('01 Tháng 01, 2026');
  });

  it('should handle year 2000', () => {
    expect(formatBookingDate('15/06/2000')).toBe('15 Tháng 06, 2000');
  });

  it('should handle year 2099', () => {
    expect(formatBookingDate('15/06/2099')).toBe('15 Tháng 06, 2099');
  });
});

describe('formatShowTime', () => {
  // Helper to extract time parts from HH:mm - HH:mm format
  const parseTimeRange = (timeStr: string) => {
    const match = timeStr.match(/^(\d{2}):(\d{2})\s*-\s*(\d{2}):(\d{2})$/);
    if (!match) return null;
    return {
      startHour: parseInt(match[1], 10),
      startMin: parseInt(match[2], 10),
      endHour: parseInt(match[3], 10),
      endMin: parseInt(match[4], 10),
    };
  };

  it('should format same-day showing with time range and single date', () => {
    const result = formatShowTime('2026-08-14T07:00:00Z', '2026-08-14T10:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    expect(result.date).toMatch(/\d{2}\s+Tháng\s+08,\s+2026/);
    // Ensure single date (no dash separator)
    expect(result.date).not.toMatch(/\d{2}\s+Tháng\s+08,\s+2026\s*-/);
  });

  it('should format showing with dates in proper format', () => {
    const result = formatShowTime('2026-08-14T22:00:00Z', '2026-08-15T06:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    // Should contain Vietnamese month
    expect(result.date).toContain('Tháng');
    // Should contain year
    expect(result.date).toContain('2026');
    // Should contain formatted day number
    expect(result.date).toMatch(/\d{2}\s+Tháng/);
  });

  it('should pad hours with leading zero', () => {
    const result = formatShowTime('2026-08-14T07:30:00Z', '2026-08-14T09:45:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    const time = parseTimeRange(result.time);
    expect(time?.startMin).toBe(30);
    expect(time?.endMin).toBe(45);
  });

  it('should pad minutes with leading zero', () => {
    const result = formatShowTime('2026-08-14T07:05:00Z', '2026-08-14T10:09:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    const time = parseTimeRange(result.time);
    expect(time?.startMin).toBe(5);
    expect(time?.endMin).toBe(9);
  });

  it('should handle midnight and early morning times', () => {
    const result = formatShowTime('2026-08-14T00:00:00Z', '2026-08-14T02:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    const time = parseTimeRange(result.time);
    expect(time?.startMin).toBe(0);
    expect(time?.endMin).toBe(0);
  });

  it('should have consistent time format with leading zeros', () => {
    const result = formatShowTime('2026-08-14T09:00:00Z', '2026-08-14T17:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
  });

  it('should handle same times (zero-duration)', () => {
    const result = formatShowTime('2026-08-14T10:00:00Z', '2026-08-14T10:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    const time = parseTimeRange(result.time);
    expect(time?.startHour).toBe(time?.endHour);
    expect(time?.startMin).toBe(time?.endMin);
    // Should be single date
    expect(result.date).not.toContain(' - ');
  });

  it('should return object with time and date properties', () => {
    const result = formatShowTime('2026-08-14T10:00:00Z', '2026-08-14T12:00:00Z');
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('date');
    expect(typeof result.time).toBe('string');
    expect(typeof result.date).toBe('string');
  });

  it('should handle multi-day showing with both dates in output', () => {
    const result = formatShowTime('2026-08-14T09:00:00Z', '2026-08-16T18:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    // Multi-day should have dash and include both month references
    expect(result.date).toContain(' - ');
    expect(result.date).toMatch(/Tháng.*Tháng/);
  });

  it('should handle month transitions with proper format', () => {
    const result = formatShowTime('2026-08-31T20:00:00Z', '2026-09-01T06:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    expect(result.date).toContain('Tháng');
    // Should contain day and year information
    expect(result.date).toMatch(/\d{2}\s+Tháng\s+\d{2},\s+\d{4}/);
  });

  it('should handle year transitions with proper format', () => {
    const result = formatShowTime('2026-12-31T22:00:00Z', '2027-01-01T02:00:00Z');
    expect(result.time).toMatch(/^\d{2}:\d{2}\s*-\s*\d{2}:\d{2}$/);
    // Should have year information
    expect(result.date).toMatch(/\d{4}/);
    // Should be properly formatted date string
    expect(result.date).toMatch(/\d{2}\s+Tháng/);
  });

  it('should work with valid ISO format strings', () => {
    // Valid ISO strings should not throw
    const result = formatShowTime('2026-08-14T09:00:00Z', '2026-08-14T17:00:00Z');
    expect(result).toHaveProperty('time');
    expect(result).toHaveProperty('date');
    expect(typeof result.time).toBe('string');
    expect(typeof result.date).toBe('string');
  });
});
