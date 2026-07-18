/**
 * Analytics ("Phân tích") API layer — real sales statistics from:
 *   GET /organizer/events/:id/analytics
 * All figures derive from PAID registrations (revenue, tickets, orders,
 * per-day series, per-ticket-type breakdown). Web-traffic metrics stay
 * unavailable — there is no page-view tracking collection in the ERD.
 */
import { clientApi } from "@/lib/client-api"

export interface RevenueByDay {
  /** yyyy-mm-dd (GMT+7 grouping). */
  date: string
  revenue: number
  tickets: number
}

export interface SalesByTicket {
  ticketId: string
  ticketName: string
  price: number
  quantity: number
  sold: number
  revenue: number
}

export interface EventAnalytics {
  totalRevenue: number
  soldTickets: number
  paidOrders: number
  pendingOrders: number
  cancelledOrders: number
  revenueByDay: RevenueByDay[]
  salesByTicket: SalesByTicket[]
}

interface Envelope<T> {
  success: boolean
  message: string
  data: T
}

export async function fetchEventAnalytics(
  eventId: string,
  showId?: string | null
): Promise<EventAnalytics> {
  const qs = showId ? `?showId=${encodeURIComponent(showId)}` : ""
  const res = await clientApi.get<Envelope<EventAnalytics>>(
    `/organizer/events/${eventId}/analytics${qs}`
  )
  return res.data
}

/** One point on the summary sales chart — real PAID sales per time bucket. */
export interface SalesSeriesPoint {
  /** "D/M" (30d) or "H:00" (24h), pre-formatted GMT+7 by the backend. */
  label: string
  revenue: number
  tickets: number
}

/**
 * Real per-day (30d) / per-hour (24h) PAID sales for the summary chart, from:
 *   GET /organizer/events/:id/sales-series?range=&showId=
 * Buckets are zero-filled and labelled by the backend, so the chart renders
 * them as-is.
 */
export async function fetchEventSalesSeries(
  eventId: string,
  range: "24h" | "30d",
  showId?: string | null
): Promise<SalesSeriesPoint[]> {
  const params = new URLSearchParams({ range })
  if (showId) params.set("showId", showId)
  const res = await clientApi.get<Envelope<SalesSeriesPoint[]>>(
    `/organizer/events/${eventId}/sales-series?${params.toString()}`
  )
  return res.data
}
