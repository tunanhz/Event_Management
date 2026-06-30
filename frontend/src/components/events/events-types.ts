import type { EventCity } from "@/lib/mockData";

/* Date filter: a quick preset, an explicit calendar date, or "all". */
export type DateMode = "all" | "today" | "tomorrow" | "weekend" | "month" | "date";

export interface DateFilter {
  mode: DateMode;
  date: string | null; // ISO yyyy-mm-dd, only when mode === "date"
}

/* Filter panel selections. */
export interface Filters {
  city: EventCity | "all";
  free: boolean;
  categories: string[]; // categorySlug[]
}

export const DEFAULT_FILTERS: Filters = { city: "all", free: false, categories: [] };
export const DEFAULT_DATE: DateFilter = { mode: "all", date: null };

export const DATE_LABELS: Record<DateMode, string> = {
  all: "Tất cả các ngày",
  today: "Hôm nay",
  tomorrow: "Ngày mai",
  weekend: "Cuối tuần này",
  month: "Tháng này",
  date: "Ngày đã chọn",
};
