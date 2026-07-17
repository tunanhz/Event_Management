import { formatBookingDate } from "./format-booking-date";

/**
 * Format a showing's ISO start/end into a display time range and date, e.g.
 * startTime=2026-08-14T07:00:00Z, endTime=2026-08-14T10:00:00Z →
 * { time: "07:00 - 10:00", date: "14 Tháng 08, 2026" }.
 */
export function formatShowTime(startIso: string, endIso: string): { time: string; date: string } {
  const start = new Date(startIso);
  const end = new Date(endIso);
  const pad = (n: number) => String(n).padStart(2, "0");
  const hm = (d: Date) => `${pad(d.getHours())}:${pad(d.getMinutes())}`;
  const dmy = (d: Date) => `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}`;
  return {
    time: `${hm(start)} - ${hm(end)}`,
    date: formatBookingDate(dmy(start)),
  };
}
