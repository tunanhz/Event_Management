import { EventCity, ISession } from '../event/event.model';

/**
 * Derive the public "discovery" fields (homepage / listing / detail) from what
 * the organizer wizard actually captures. The wizard collects venue, show times
 * and ticket tiers but not the denormalized fields the public event API serves
 * (`city`, `time`, `sessions`, `priceFrom`, `isFree`) — we compute them here so a
 * wizard-created event renders correctly on the public pages.
 */

/** Map a Vietnamese province name (post-2025 units) to the public city filter. */
export function deriveCity(province?: string): EventCity {
  const p = (province || '').toLowerCase();
  if (p.includes('hồ chí minh') || p.includes('ho chi minh') || p.includes('hcm')) return 'hcm';
  if (p.includes('hà nội') || p.includes('ha noi')) return 'hanoi';
  // Đà Lạt is administratively under Lâm Đồng; the FE filter still labels it Đà Lạt.
  if (p.includes('lâm đồng') || p.includes('lam dong') || p.includes('đà lạt') || p.includes('da lat'))
    return 'dalat';
  return 'other';
}

/** "HH:mm" (24h) display time from a date. */
export function deriveTime(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** One public session row per showing; falls back to a single row from the
 *  event start date for legacy flat events without shows. Uses the show's
 *  organizer-given title as the label when set, else an auto-numbered
 *  "Suất N" — only shown at all once there are 2+ sessions to disambiguate. */
export function deriveSessions(
  shows: { startTime: Date; endTime?: Date; title?: string }[],
  fallbackStart: Date
): ISession[] {
  const rows = shows.length > 0 ? shows : [{ startTime: fallbackStart }];
  return rows.map((s, i) => ({
    date: s.startTime,
    time: deriveTime(s.startTime),
    label: rows.length > 1 ? s.title?.trim() || `Suất ${i + 1}` : undefined,
  }));
}

/** Lowest tier price + free flag for the card "Từ X / Miễn phí" display. */
export function derivePriceFields(tickets: { price: number }[]): {
  priceFrom: number;
  isFree: boolean;
} {
  if (tickets.length === 0) return { priceFrom: 0, isFree: false };
  const priceFrom = Math.min(...tickets.map((t) => t.price));
  const isFree = tickets.every((t) => t.price === 0);
  return { priceFrom, isFree };
}
