/**
 * Safe coercion helpers for Express query params, which may arrive as
 * string | string[] | undefined (e.g. `?search=a&search=b` yields an array).
 * Prevents NaN/negative skips and unbounded limits from reaching MongoDB.
 */

/** Return the value only when it is a single non-empty string. */
export function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.length > 0 ? value : undefined;
}

/** Clamp ?page / ?limit into safe bounds (guards NaN, 0, negatives, huge pages). */
export function parsePagination(
  query: { page?: unknown; limit?: unknown },
  defaults: { limit?: number; maxLimit?: number } = {}
): { page: number; limit: number } {
  const { limit: defaultLimit = 10, maxLimit = 100 } = defaults;
  const page = Math.max(1, Math.floor(Number(asOptionalString(query.page))) || 1);
  const limit = Math.min(
    Math.max(1, Math.floor(Number(asOptionalString(query.limit))) || defaultLimit),
    maxLimit
  );
  return { page, limit };
}
