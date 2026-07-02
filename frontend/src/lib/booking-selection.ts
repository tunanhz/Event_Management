import type { TicketType } from "./mockData";

/**
 * Pure helpers for the ticket-booking flow. Selection = a map of ticket id →
 * quantity, serialised to the URL so it survives the hop from the "Chọn vé"
 * screen to the "Thanh toán" screen (and a page refresh).
 */
export type Quantities = Record<string, number>;

export interface BookingLine {
  ticket: TicketType;
  qty: number;
  subtotal: number;
}

/** Read quantities for the given tickets from Next.js searchParams. */
export function parseQuantities(
  tickets: TicketType[],
  searchParams: Record<string, string | string[] | undefined>,
): Quantities {
  const result: Quantities = {};
  for (const t of tickets) {
    const raw = searchParams[t.id];
    const value = Array.isArray(raw) ? raw[0] : raw;
    const parsed = value ? parseInt(value, 10) : 0;
    result[t.id] = Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
  }
  return result;
}

/** Non-empty lines only (qty > 0), preserving ticket order. */
export function buildLines(tickets: TicketType[], quantities: Quantities): BookingLine[] {
  return tickets
    .map((ticket) => {
      const qty = quantities[ticket.id] ?? 0;
      return { ticket, qty, subtotal: qty * ticket.price };
    })
    .filter((line) => line.qty > 0);
}

export function totalAmount(lines: BookingLine[]): number {
  return lines.reduce((sum, line) => sum + line.subtotal, 0);
}

export function totalQuantity(quantities: Quantities): number {
  return Object.values(quantities).reduce((sum, n) => sum + n, 0);
}

/** Encode selection into a query string (skips zero quantities). */
export function encodeSelection(quantities: Quantities): string {
  const params = new URLSearchParams();
  Object.entries(quantities).forEach(([id, qty]) => {
    if (qty > 0) params.set(id, String(qty));
  });
  return params.toString();
}
