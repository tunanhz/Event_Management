/* "DD/MM/YYYY" -> "DD Tháng MM, YYYY" (Vietnamese long form). */
export function formatLongDate(ddmmyyyy: string): string {
  const [d, m, y] = ddmmyyyy.split('/');
  if (!d || !m || !y) return ddmmyyyy;
  return `${d} Tháng ${m}, ${y}`;
}

/* Strip a leading "Từ " so a "Giá từ" label isn't duplicated. */
export function priceValue(price: string): string {
  return price.replace(/^Từ\s*/i, '');
}
