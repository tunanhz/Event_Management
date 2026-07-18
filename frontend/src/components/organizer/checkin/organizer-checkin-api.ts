/**
 * Check-in report API layer — real attendance data from:
 *   GET /organizer/events/:id/checkins
 * Entry-only for the whole event: no per-show split (check-in is tracked
 * once across the event, not per suất diễn) and no exit/checkout — a
 * checked-in ticket just stays checked in. stats/byTicket power the overview
 * card and the per-ticket-type table.
 */
import { clientApi } from "@/lib/client-api"

export interface CheckInStats {
  paidTickets: number
  checkedInTickets: number
  /** checkedInTickets / paidTickets, percent 0-100. */
  rate: number
}

export interface CheckInByTicket {
  ticketName: string
  price: number
  sold: number
  checkedIn: number
}

export interface CheckInReport {
  stats: CheckInStats
  byTicket: CheckInByTicket[]
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export async function fetchCheckInReport(
  eventId: string,
  showId?: string | null
): Promise<CheckInReport> {
  const qs = showId ? `?showId=${encodeURIComponent(showId)}` : ""
  const res = await clientApi.get<Envelope<CheckInReport>>(
    `/organizer/events/${eventId}/checkins${qs}`
  )
  return res.data
}
