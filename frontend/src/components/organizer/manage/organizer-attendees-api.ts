/**
 * Attendee tracker ("Đơn hàng") API layer — replaces the old mock roster with
 * the real buyer list from:
 *   GET /organizer/events/:id/registrations
 * Each row is a Registration joined server-side with buyer, ticket tier and
 * its SUCCESS check-in, then mapped onto the EventAttendee display shape the
 * existing table/CSV utilities already consume.
 */
import { clientApi } from "@/lib/client-api"
import type { EventAttendee, AttendeeStatus } from "./attendee-tracker-data"

/** Raw row from the backend (AttendeeRow in organizer.service.ts). */
export interface ServerAttendeeRow {
  registrationId: string
  orderCode: string
  participantName: string
  participantEmail: string
  participantPhone: string
  ticketName: string
  unitPrice: number
  quantity: number
  totalAmount: number
  registerDate: string
  status: "PAID" | "CANCELLED" | "EXPIRED" | "REFUNDED" | "PENDING"
  checkedIn: boolean
  checkInTime?: string
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

/** Backend registration status → the tracker's 3 display buckets. */
function toDisplayStatus(row: ServerAttendeeRow): AttendeeStatus {
  if (row.status === "PAID") return row.checkedIn ? "checked_in" : "registered"
  // CANCELLED / EXPIRED / REFUNDED all read as "Đã hủy" for the organizer.
  return "cancelled"
}

function toAttendee(row: ServerAttendeeRow): EventAttendee {
  return {
    id: row.registrationId,
    orderCode: row.orderCode,
    name: row.participantName,
    email: row.participantEmail,
    phone: row.participantPhone || "—",
    ticketType: row.ticketName,
    quantity: row.quantity,
    purchasedAt: row.registerDate,
    status: toDisplayStatus(row),
    checkedInAt: row.checkInTime
      ? new Date(row.checkInTime).toLocaleTimeString("vi-VN", {
          hour: "2-digit",
          minute: "2-digit",
        })
      : undefined,
  }
}

/** Load the event's real attendee list (first 500 orders, newest first),
 *  optionally narrowed to one show's (suất diễn) ticket tiers. */
export async function fetchEventAttendees(
  eventId: string,
  showId?: string | null
): Promise<EventAttendee[]> {
  const qs = showId ? `&showId=${encodeURIComponent(showId)}` : ""
  const res = await clientApi.get<Envelope<ServerAttendeeRow[]>>(
    `/organizer/events/${eventId}/registrations?limit=500${qs}`
  )
  return (res.data ?? []).map(toAttendee)
}
