/**
 * Ticket inventory data layer (client) for an organizer's PUBLISHED event.
 * Wraps the stock-only endpoints that keep working after publish:
 *   GET   /organizer/events/:id/tickets/inventory              — live stock snapshot
 *   PATCH /organizer/events/:id/tickets/:ticketId/inventory    — restock / hide-show
 * Only quantity + status are editable here; price/name/schedule stay behind the
 * DRAFT/REJECTED-only edit wizard, mirroring the backend guard.
 */
import { clientApi } from "@/lib/client-api"

/** One ticket type's live stock snapshot (mirrors the backend inventory row). */
export interface TicketInventoryRow {
  ticketId: string
  ticketName: string
  price: number
  /** Total configured stock. */
  quantity: number
  /** Held + paid combined — the restock floor (quantity can't drop below this). */
  soldQuantity: number
  /** Confirmed-paid quantity. */
  sold: number
  /** Quantity under an active (not-yet-expired) hold. */
  held: number
  available: number
  status: "ACTIVE" | "SOLD_OUT" | "HIDDEN"
  soldPct: number
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

/** Only the two fields the backend allows post-publish. */
export interface AdjustInventoryInput {
  quantity?: number
  status?: "ACTIVE" | "HIDDEN"
}

/** GET the live per-ticket-type stock snapshot for an event. */
export async function fetchTicketInventory(eventId: string): Promise<TicketInventoryRow[]> {
  const res = await clientApi.get<Envelope<TicketInventoryRow[]>>(
    `/organizer/events/${eventId}/tickets/inventory`
  )
  return res.data ?? []
}

/** PATCH one ticket type's stock: restock (quantity) and/or pause-resume (status). */
export async function adjustTicketInventory(
  eventId: string,
  ticketId: string,
  patch: AdjustInventoryInput
): Promise<void> {
  await clientApi.patch(
    `/organizer/events/${eventId}/tickets/${ticketId}/inventory`,
    patch
  )
}
