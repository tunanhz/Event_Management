/**
 * Format an event date string ("DD/MM/YYYY") for the booking screens as
 * "DD Tháng MM, YYYY" (e.g. "12/07/2026" → "12 Tháng 07, 2026").
 * Falls back to the raw input if it is not in the expected shape.
 */
export function formatBookingDate(date: string): string {
  const match = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(date.trim());
  if (!match) return date;
  const [, dd, mm, yyyy] = match;
  return `${dd} Tháng ${mm}, ${yyyy}`;
}
