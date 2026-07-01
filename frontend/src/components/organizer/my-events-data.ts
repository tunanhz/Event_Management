/**
 * Mock organizer events for the "Sự kiện của tôi" page and the per-event
 * management workspace (/organizer/events/[id]/...).
 *
 * `dateTime` is a pre-formatted Vietnamese string (matches the reference UI and
 * avoids locale computation / SSR mismatch). Sales aggregates are derived from
 * `ticketTypes` so there is a single source of truth.
 */

export type OrgEventStatus = "upcoming" | "past" | "pending" | "draft"

export interface TicketType {
  name: string
  price: number // VND
  sold: number
  total: number
  locked: number
}

export interface OrganizerEvent {
  id: string
  title: string
  image: string
  dateTime: string // e.g. "00:00, Thứ 5, 02 tháng 07 2026"
  venueName: string
  address: string
  status: OrgEventStatus
  ticketTypes?: TicketType[]
}

const img = (id: string) =>
  `https://images.unsplash.com/photo-${id}?w=480&h=270&fit=crop`

export const organizerEvents: OrganizerEvent[] = [
  {
    id: "org-1",
    title: "abc",
    image: img("1518895949257-7621c3c786d7"),
    dateTime: "00:00, Thứ 5, 02 tháng 07 2026",
    venueName: "acc",
    address: "Số 46, Xã Ba Vì, Thành phố Hà Nội",
    status: "pending",
    ticketTypes: [
      { name: "bth", price: 111111, sold: 0, total: 100, locked: 0 },
      { name: "vip", price: 100000000, sold: 0, total: 10, locked: 0 },
    ],
  },
  {
    id: "org-2",
    title: "Đêm nhạc Acoustic Mùa Thu",
    image: img("1470229722913-7c0e2dbbafd3"),
    dateTime: "19:30, Thứ 7, 18 tháng 07 2026",
    venueName: "Nhà hát Hòa Bình",
    address: "240 Đường 3 Tháng 2, Quận 10, TP. Hồ Chí Minh",
    status: "upcoming",
    ticketTypes: [
      { name: "Thường", price: 350000, sold: 880, total: 1400, locked: 20 },
      { name: "VIP", price: 900000, sold: 355, total: 600, locked: 10 },
    ],
  },
  {
    id: "org-3",
    title: "Hội thảo Công nghệ & Đổi mới Sáng tạo",
    image: img("1540575467063-178a50c2df87"),
    dateTime: "09:00, Thứ 4, 05 tháng 08 2026",
    venueName: "GEM Center",
    address: "8 Nguyễn Bỉnh Khiêm, Quận 1, TP. Hồ Chí Minh",
    status: "upcoming",
    ticketTypes: [
      { name: "Standard", price: 300000, sold: 287, total: 300, locked: 0 },
    ],
  },
  {
    id: "org-4",
    title: "Liveshow Kỷ niệm 10 năm",
    image: img("1493225457124-a3eb161ffa5f"),
    dateTime: "20:00, Thứ 6, 12 tháng 09 2026",
    venueName: "Sân vận động Phú Thọ",
    address: "1 Lữ Gia, Quận 11, TP. Hồ Chí Minh",
    status: "upcoming",
    ticketTypes: [
      { name: "Thường", price: 400000, sold: 4000, total: 7000, locked: 100 },
      { name: "VIP", price: 1500000, sold: 820, total: 1000, locked: 25 },
    ],
  },
  {
    id: "org-5",
    title: "Workshop Nhiếp ảnh Đường phố",
    image: img("1516035069371-29a1b244cc32"),
    dateTime: "14:00, Chủ nhật, 20 tháng 07 2026",
    venueName: "Studio A",
    address: "12 Trần Quốc Thảo, Quận 3, TP. Hồ Chí Minh",
    status: "upcoming",
    ticketTypes: [
      { name: "Vé workshop", price: 200000, sold: 42, total: 60, locked: 0 },
    ],
  },
  {
    id: "org-6",
    title: "Gala Tổng kết Cuối năm 2025",
    image: img("1511578314322-379afb476865"),
    dateTime: "18:00, Thứ 2, 15 tháng 12 2025",
    venueName: "InterContinental Saigon",
    address: "Góc Hai Bà Trưng & Lê Duẩn, Quận 1, TP. Hồ Chí Minh",
    status: "past",
    ticketTypes: [
      { name: "Vé Gala", price: 535000, sold: 800, total: 800, locked: 0 },
    ],
  },
  {
    id: "org-7",
    title: "Sự kiện chưa đặt tên",
    image: img("1492684223066-81342ee5ff30"),
    dateTime: "Chưa đặt lịch",
    venueName: "Chưa cập nhật",
    address: "Chưa cập nhật địa điểm",
    status: "draft",
  },
]

/** Look up a single organizer event by id (used by the manage sub-pages). */
export function getOrganizerEventById(id: string): OrganizerEvent | undefined {
  return organizerEvents.find((e) => e.id === id)
}

export interface EventSummary {
  totalTickets: number
  soldTickets: number
  totalRevenue: number
  soldRevenue: number
  revenuePct: number
  ticketsPct: number
}

/** Aggregate sales figures for an event, derived from its ticket types. */
export function summarizeEvent(event: OrganizerEvent): EventSummary {
  const types = event.ticketTypes ?? []
  const totalTickets = types.reduce((a, t) => a + t.total, 0)
  const soldTickets = types.reduce((a, t) => a + t.sold, 0)
  const totalRevenue = types.reduce((a, t) => a + t.price * t.total, 0)
  const soldRevenue = types.reduce((a, t) => a + t.price * t.sold, 0)
  return {
    totalTickets,
    soldTickets,
    totalRevenue,
    soldRevenue,
    revenuePct: totalRevenue ? Math.round((soldRevenue / totalRevenue) * 100) : 0,
    ticketsPct: totalTickets ? Math.round((soldTickets / totalTickets) * 100) : 0,
  }
}

export interface SummaryPoint {
  label: string
  revenue: number
  tickets: number
}

/**
 * Deterministic revenue / ticket time series for the summary chart. Sold totals
 * are spread across the period with a ramp weighting (all zeros when nothing is
 * sold, e.g. a pending event) — no Math.random / Date, so SSR and CSR match.
 */
export function buildSummarySeries(
  event: OrganizerEvent,
  range: "24h" | "30d"
): SummaryPoint[] {
  const { soldTickets, soldRevenue } = summarizeEvent(event)
  const n = range === "24h" ? 24 : 30
  const labels =
    range === "24h"
      ? Array.from({ length: n }, (_, i) => `${i}:00`)
      : Array.from({ length: n }, (_, i) => `${i + 1}/6`)

  const weights = Array.from({ length: n }, (_, i) => i + 1)
  const wsum = weights.reduce((a, b) => a + b, 0)

  let accTickets = 0
  let accRevenue = 0
  return labels.map((label, i) => {
    let tickets: number
    let revenue: number
    if (i === n - 1) {
      // Last point absorbs rounding remainder so totals stay exact.
      tickets = soldTickets - accTickets
      revenue = soldRevenue - accRevenue
    } else {
      tickets = Math.round((soldTickets * weights[i]) / wsum)
      revenue = Math.round((soldRevenue * weights[i]) / wsum)
      accTickets += tickets
      accRevenue += revenue
    }
    return { label, revenue: Math.max(0, revenue), tickets: Math.max(0, tickets) }
  })
}

/** Full VND amount with Vietnamese grouping, e.g. 1011111100 → "1.011.111.100đ". */
export function formatVnd(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`
}

/** Integer with Vietnamese grouping, e.g. 1235 → "1.235". */
export function formatInt(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value)
}
