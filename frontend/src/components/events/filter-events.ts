import type { ExploreEvent } from "@/lib/mockData";
import type { DateFilter, DateMode, Filters } from "./events-types";

/* "DD/MM/YYYY" -> local Date at midnight */
export function parseEventDate(s: string): Date {
  const [d, m, y] = s.split("/").map(Number);
  return new Date(y, m - 1, d);
}

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function toISODate(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/* "yyyy-mm-dd" -> local Date at midnight */
export function fromISODate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

/* Inclusive [start, end] for a preset, or null for "all"/"date". */
export function presetRange(mode: DateMode, today: Date): { start: Date; end: Date } | null {
  const t = startOfDay(today);
  switch (mode) {
    case "today":
      return { start: t, end: t };
    case "tomorrow": {
      const x = new Date(t);
      x.setDate(t.getDate() + 1);
      return { start: x, end: x };
    }
    case "weekend": {
      // This week's Saturday + Sunday (or today if already the weekend).
      const daysToSat = (6 - t.getDay() + 7) % 7;
      const sat = new Date(t);
      sat.setDate(t.getDate() + daysToSat);
      const sun = new Date(sat);
      sun.setDate(sat.getDate() + 1);
      return { start: sat, end: sun };
    }
    case "month":
      return {
        start: new Date(t.getFullYear(), t.getMonth(), 1),
        end: new Date(t.getFullYear(), t.getMonth() + 1, 0),
      };
    default:
      return null;
  }
}

function matchesDate(event: ExploreEvent, dateFilter: DateFilter, today: Date): boolean {
  if (dateFilter.mode === "all") return true;

  const eventDay = startOfDay(parseEventDate(event.date));

  if (dateFilter.mode === "date") {
    if (!dateFilter.date) return true;
    return eventDay.getTime() === fromISODate(dateFilter.date).getTime();
  }

  const range = presetRange(dateFilter.mode, today);
  if (!range) return true;
  return eventDay >= range.start && eventDay <= range.end;
}

/* Filter by collection + city + free + categories + date, then sort chronologically. */
export function applyFilters(
  events: ExploreEvent[],
  filters: Filters,
  dateFilter: DateFilter,
  today: Date,
  collection?: string | null,
): ExploreEvent[] {
  return events
    .filter((e) => {
      if (collection && !e.collections.includes(collection)) return false;
      if (filters.city !== "all" && e.city !== filters.city) return false;
      if (filters.free && !e.isFree) return false;
      if (filters.categories.length > 0 && !filters.categories.includes(e.categorySlug)) return false;
      return matchesDate(e, dateFilter, today);
    })
    .sort((a, b) => parseEventDate(a.date).getTime() - parseEventDate(b.date).getTime());
}
