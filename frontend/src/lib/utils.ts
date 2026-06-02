/**
 * Utility functions and constants
 */

// ─── Date Formatting ───────────────────────────────────────
export function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export function formatDateTime(dateString: string): string {
  return new Date(dateString).toLocaleString("vi-VN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// ─── String Helpers ────────────────────────────────────────
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + "...";
}

export function slugify(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

// ─── Event Status Helpers ──────────────────────────────────
export function getStatusColor(status: string): string {
  const colors: Record<string, string> = {
    draft: "var(--color-warning)",
    published: "var(--color-success)",
    cancelled: "var(--color-error)",
    completed: "var(--color-info)",
  };
  return colors[status] || "var(--color-muted)";
}

export function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    draft: "Bản nháp",
    published: "Đã xuất bản",
    cancelled: "Đã hủy",
    completed: "Hoàn thành",
  };
  return labels[status] || status;
}

// ─── Query String Builder ──────────────────────────────────
export function buildQueryString(params: Record<string, unknown>): string {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, String(value));
    }
  });
  const qs = searchParams.toString();
  return qs ? `?${qs}` : "";
}
